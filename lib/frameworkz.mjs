import { ViewZ } from './viewz.mjs';
import { RouterZ, constants } from './routerz.mjs';
import { stackerLeft, stackerRight, stackerInplace, 
    stackerBottom,stackerTop, stackerDialog, 
    stackerFullscreen,
    stackerSideBottom, stackerSideTop, stackerSideRight, stackerSideLeft
    } from './stackerz.mjs';
import { createComponent } from './componentz.mjs';

// load all stackers
RouterZ.loadStacker(stackerLeft) ;
RouterZ.loadStacker(stackerRight) ;
RouterZ.loadStacker(stackerInplace) ;
RouterZ.loadStacker(stackerBottom) ;
RouterZ.loadStacker(stackerTop) ;
RouterZ.loadStacker(stackerDialog) ;
RouterZ.loadStacker(stackerFullscreen) ;
RouterZ.loadStacker(stackerSideTop) ;
RouterZ.loadStacker(stackerSideBottom) ;
RouterZ.loadStacker(stackerSideRight) ;
RouterZ.loadStacker(stackerSideLeft) ;

export async function startViewZ(options = "/viewz.config.json"){


    if(typeof(options) === "string"){
        try{
            let response = await fetch(options);
            let optionsStr = await response.text();
            options = JSON.parse(optionsStr) ;
        }catch(err){
            console.error(`Can't fetch config file ${options}`) ;
            throw err;
        }
    }

    let container;
    if(options.container){
        if(options.container.constructor === HTMLElement){
            container = options.container
        }else{
            container = document.querySelector(options.container) ;
            if(!container){
                throw `Can't find container ${options.container} by querySelector` ;
            }
        }
    }else{
        // no container given, search for default one
        container = document.getElementById("viewz-container") ;
        if(!container){
            //automatically add one to BODY
            container = document.createElement("DIV") ;
            container.id = "viewz-container" ;
            document.body.appendChild(container) ;
        }
    }
    container.classList.add("viewz-loading") ;

    if(options.extensions){
        for(let ext of options.extensions){
            if(ext.url){
                try{
                    let url = ext.url ;
                    if(!url.startsWith("http")){
                        // user give a relative URL
                        url = new URL(url, document.baseURI) ;
                    }
                    const extension = (await import(url)).default ;
                    if(extension){
                        ViewZ.loadExtension(extension) ;
                    }
                }catch(err){
                    console.warn("Error loading extension", ext, err) ;
                }
            }else{
                ViewZ.loadExtension(ext) ;
            }
        }
    }

    if(options.components){
        for(let component of options.components){
            createComponent(options.componentsPath||"", component) ;
        }
    }

    

    // create the router
    const router = new RouterZ({
        type: options.routing||constants.BROWSER, 
        container
    }) ;
    
    // prepare route hierarchy
    let routes = [] ;
    for(let route of options.routes){
        addRoute(routes, route, options) ;
    }

    // add to router
    for(let route of routes){
        router.addRoute(route) ;
    }

    let shouldCacheAllViews ;
    let syncLimit = 5 ;
    if(options.cacheAllViews === false){
        //user explicitely forbid it
        shouldCacheAllViews = false;
    }else if(options.cacheAllViews === true){
        //user explicitely ask for it
        shouldCacheAllViews = true;
        if(options.cacheAllViewsSyncLimit && Number.isInteger(options.cacheAllViewsSyncLimit)){
            syncLimit = options.cacheAllViewsSyncLimit ;
        }
    }else{
        //cache if not many views
        shouldCacheAllViews = true ;
    }

    if(shouldCacheAllViews){
        await router.cacheAllViews(syncLimit) ;
    }

    // start the routing
    await router.start() ;
    container.classList.remove("viewz-loading") ;
}

function addRoute(routes, routeToAdd, options, parentUrl = "/"){
    let viewId = routeToAdd.path ;
    let indexSlash = routeToAdd.path.lastIndexOf("/") ;
    if(indexSlash !== -1){
        viewId = routeToAdd.path.substring(indexSlash+1) ;
    }
    const view = new ViewZ({
        html: `${options.viewsPath}/${routeToAdd.path}/${viewId}.html`,
        css: `${options.viewsPath}/${routeToAdd.path}/${viewId}.css`,
        js: `${options.viewsPath}/${routeToAdd.path}/${viewId}.js`,
        id: viewId,
    })

    let url = parentUrl.replace(/\/$/, "") + "/" + routeToAdd.url.replace(/^\//, "") ;

    let routeOptions = {
        url: url,
        view: view,
        defaultChild: routeToAdd.defaultChild
    } ;

    routes.push(routeOptions) ;

    if(routeToAdd.subRoutes){
        routeOptions.routes = [] ;
        for(let subRoute of routeToAdd.subRoutes){
            addRoute(routeOptions.routes, subRoute, options, url)
        }
    }
}

