import path from "path";
import { JSDOM } from "jsdom";
import fs from "fs-extra"
import { readFile } from "fs/promises";
import { pathToRegexp } from "path-to-regexp";


export async function createMiddleware({sourcePath, base, containerId}){
    if(!containerId){
        containerId = "container";
    }
    let html = await readFile(path.join(sourcePath, "index.html"), {encoding: "utf8"});
    let dom = new JSDOM(html);
    try{
        const viewzConfig = await fs.readJson(path.join(sourcePath, "viewz.config.json"));
        const routing = viewzConfig.routing??"BROWSER" ;
        
        if(routing !== "BROWSER"){
            return (req, res, next)=>next() ;
        }
        
        const routes = viewzConfig.routes ;

        let baseEl = dom.window.document.head.querySelector("base");
        if(!base && baseEl){
            base = baseEl.getAttribute("href").replace(/\/$/, "") ;
        }
        for(let route of routes){
            let fullRoute = ((base??"")+route.url).replace(/\/:(\w+)\?/g, "{/:$1}");
            route.regexp = pathToRegexp(fullRoute)
        }
        return async (req, res, next)=>{
            try{
                //search for corresponding route
                let route = routes.find(r=>r.regexp.exec(req.originalUrl)) ;
                if(route){
                    //found a route
    
                    let viewName = route.name;
                    if(!viewName){
                        viewName = route.path.replace(/\/$/, "").substring(route.path.lastIndexOf("/")+1);
                    }

                    let viewPath = sourcePath ;
                    if(viewzConfig.viewsPath){
                        viewPath = path.join(sourcePath, viewzConfig.viewsPath) ;
                    }
                    
                    //get HTML/CSS sources
                    let html = await readFile(path.join(viewPath, `${route.path}/${viewName}.html`), {encoding: "utf8"});
                    let css = await readFile(path.join(viewPath, `${route.path}/${viewName}.css`), {encoding: "utf8"});
    
                    if(css){
                        //TODO : when @scope is supported on FF and Safari, add it directly from here
                        css = `<style scoped>${css}</style>`;
                        //target code when FF and Safari will be compliant (and JSDOM too, currently it throw a parsing exception)
                        //css = `<style>@scope {${css}}</style>`;
                    }
                    
                    // push code in the container
                    let container = dom.window.document.getElementById(containerId);
                    container.setAttribute("zz-ssr", viewName);
                    container.innerHTML = `${css}${html}` ;
                    
                    //send the HTML
                    res.end(dom.serialize()) ;
                }else{
                    next();
                }
            }catch(err){
                console.error("Error while get SSR page %o", err);
                res.status(err.statusCode||500).json(err);
            }
            
        };
    }catch(err){
        console.log("Can't init ViewZ SSR middleware", err) ;
        return async (req, res, next)=>{ next(); }
    }
}

export async function generateSsrContent({sourcePath, base, containerId, htmlProcessors}){
    if(!containerId){
        containerId = "viewz-container";
    }
    let html = await readFile(path.join(sourcePath, "index.html"), {encoding: "utf8"});
    let dom = new JSDOM(html);
    let routes = [];
    let routing =  "BROWSER" ;
    let viewzConfig;
    try{
        viewzConfig = await fs.readJson(path.join(sourcePath, "viewz.config.json"));
        routing = viewzConfig.routing??"BROWSER" ;
        routes = viewzConfig.routes ;
    }catch(err){
        console.log("No routes defined in "+sourcePath, err) ;
    }

    if(routing !== "BROWSER"){
        //not browser navigation, no SSR
        return ()=>null ;
    }


    let baseEl = dom.window.document.head.querySelector("base");
    if(!base && baseEl){
        base = baseEl.getAttribute("href").replace(/\/$/, "") ;
    }

    let allRoutes = [] ;

    function registerRoute({route, parentPath=[], level=0}){
        let fullRoute = route.url ;
        if(parentPath){
          fullRoute = parentPath.filter(p=>p.url !== "/").map(p=>p.url).concat([route.url]).join("/") ;
        }
        let pattern = ((base??"")+fullRoute).replace(/\/:(\w+)\?/g, "{/:$1}")
        route.regexp = pathToRegexp(pattern) ;

        route.openRoute = async ({req})=>{
            for(let parent of parentPath){
                await parent.openRoute({req}) ;
            }

            let viewName = route.name;
            if(!viewName){
                viewName = route.path.replace(/\/$/, "").substring(route.path.lastIndexOf("/")+1);
            }

            let viewPath = sourcePath ;
            if(viewzConfig?.viewsPath){
                viewPath = path.join(sourcePath, viewzConfig.viewsPath) ;
            }
            
            //get HTML/CSS sources
            let html = await readFile(path.join(viewPath, `${route.path}/${viewName}.html`), {encoding: "utf8"});
            let css = await readFile(path.join(viewPath, `${route.path}/${viewName}.css`), {encoding: "utf8"});
    
            if(css){
                //TODO : when @scope is supported on FF and Safari, add it directly from here
                css = `<style scoped>${css}</style>`;
                //target code when FF and Safari will be compliant (and JSDOM too, currently it throw a parsing exception)
                //css = `<style>@scope {${css}}</style>`;
            }
            
            // push code in the container
            let container;
            if(parentPath.length>0){
                const parentRoute = parentPath[parentPath.length-1] ;
                container = parentRoute.container.querySelector("z-sub-view") ;
                if(!container){
                    console.error("The view container is not found. Did you forget to add <z-sub-view></z-sub-view> in the parent view "+parentRoute.route+" ?") ;
                    return;
                }
            }else{
                container = dom.window.document.getElementById(containerId);
                if(!container){
                    container = dom.window.document.createElement("DIV");
                    container.id = containerId ;
                    dom.window.document.body.appendChild(container) ;
                }
            }

            
            container.setAttribute("zz-ssr", viewName);
            container.setAttribute("style", "opacity: 0;") ;
            container.innerHTML = `${css}${html}` ;
            if(htmlProcessors){
                for(let processor of htmlProcessors){
                    try{
                        await processor({el: container, req}) ;
                    }catch(err){
                        console.error("Error while apply processor ", processor, err) ;
                    }
                }
            }

            route.container = container ;
    
            if(base){
                //prevent click on link before JS applied navigation
                let allLinks = Array.prototype.slice.apply(container.querySelectorAll("a"));
                for(let a of allLinks){
                    if(a.hasAttribute("href") && a.getAttribute("href").startsWith("/")){
                        a.setAttribute("onclick", "return false");
                    }
                }
            }
        }

        allRoutes.push(route) ;

        if(route.subRoutes){
            for(let subRoute of route.subRoutes){
                registerRoute({route: subRoute, parentPath: parentPath.concat([route]), level: level+1}) ;
            }
        }
    }

    for(let route of routes){
        registerRoute({route}) ;
    }

    return async (req)=>{
        try{
            //search for corresponding route
            let urlRoute = req.originalUrl;
            if(urlRoute.includes("?")){
                urlRoute = urlRoute.substring(0, urlRoute.indexOf("?")) ;
            }
            if(/\/\*([^*]*)\*\//.test(urlRoute)){
                //ignore stacked route
                //TODO: should handle them
                urlRoute = urlRoute.substring(0, urlRoute.search(/\/\*([^*]*)\*\//)) ;
            }
            let route = allRoutes.find(r=>r.regexp.regexp.exec(urlRoute)) ;
            if(route){
                //found a route

                await route.openRoute({req})
                
                //send the HTML
                return dom.serialize() ;
            }else{
                return "";
            }
        }catch(err){
            console.error("Error while get SSR page %o", err);
            throw err
        }
        
    };
}