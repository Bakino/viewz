import {createRouter} from "./lib/routerz.mjs"
import { loadCssCode } from "./lib/utilz.mjs";
import { ViewZ } from "./lib/viewz.mjs";
import css from "./style/stack-style.mjs" ;

loadCssCode(css);

const STACK_STYLE_PARAMS = {
    w: "--viewz-stack-lateral-width",
    h: "--viewz-stack-vertical-height",
    bg: "--viewz-stack-background-color",
    t: "--viewz-stack-transition-duration",
}

const STACK_RIGHT = "(" ;
const STACK_LEFT = ")" ;
const STACK_BOTTOM = "_" ;
const STACK_TOP = "-" ;
const STACK_DIALOG = "()" ;
const STACK_FULLSCREEN = "" ;
const STACK_SIDE_LEFT = "-I";
const STACK_SIDE_RIGHT = "I-";
const STACK_SIDE_TOP = "T";
const STACK_SIDE_BOTTOM = "L";

export async function startRouter(){
    try{
        let viewzContainer = document.getElementById("viewz-container") ; 
        if(!viewzContainer){
            viewzContainer = document.createElement("DIV") ;
            viewzContainer.id = "viewz-container" ;
            document.body.appendChild(viewzContainer) ;
        }

        const viewzContainerParent = viewzContainer.parentElement ;
    
        let response = await fetch("routes.json");
        let routes = await response.json();
        let options = { mode: "BROWSER" } ;
        let extensions = [] ;
        if(routes.extensions){
            extensions = routes.extensions ;
            delete routes.extensions ;
        }

        for(let ext of extensions){
            try{
                let url = ext.url ;
                if(url.startsWith("/")){
                    url = url.substring(1) ;
                }
                const extension = (await import(`/app/${window.BAMZ_APP}/${url}`)).default ;
                if(extension){
                    ViewZ.loadExtension(extension) ;
                }
            }catch(err){
                console.warn("Error loading extension", ext, err) ;
            }
        }

        if(routes.routes){
            options = routes.options;
            routes = routes.routes;
        }


        
        let router = createRouter({
            mode: options.mode,
            routes,
            container: viewzContainer,
            containerFactory: ({execRoute, router})=>{

                let splittedLayout = null;
                let layoutCode = null;
                let layoutParams = null;

                if(execRoute.stackOptions != null){
                    //layout is given inside /**/ (ex: /*()*/)
                    //it can have params separated by ! (ex: _!h=300px!t=1s)
                    splittedLayout = execRoute.stackOptions.layout.split("!") ;

                    //first set layout classname
                    layoutCode = splittedLayout[0] ;

                    layoutParams = splittedLayout.slice(1) ;
                }

                // call from extensions
                for(let ext of ViewZ.extensions){
                    if(ext.containerFactory){
                        const extensionContainer = ext.containerFactory({
                            viewzContainerParent, viewzContainer, execRoute,
                            layoutCode, layoutParams, router
                        }) ;
                        if(extensionContainer){
                            return extensionContainer ;
                        }
                    }
                }


                if(execRoute.stackOptions != null){
                    let stackContainer = document.getElementById("viewz-stack-container-"+execRoute.stackOptions.level) ;
                    let stackClose = document.querySelector(".viewz-stack-close");
                    if(stackContainer){
                        return stackContainer ;
                    }else{
                        let stackOverlay = document.querySelector(".viewz-stack-overlay");
                        if([STACK_RIGHT, STACK_LEFT, STACK_BOTTOM, STACK_TOP, STACK_DIALOG].includes(layoutCode)){
                            if(!stackOverlay){
                                stackOverlay = document.createElement("DIV") ;
                                stackOverlay.className = "viewz-stack-overlay show" ;
                                viewzContainerParent.appendChild(stackOverlay) ;
                                stackOverlay.addEventListener("click", ()=>{
                                    router.closeAllStack() ;
                                })
                            }
                        }else{
                            if(stackOverlay){
                                stackOverlay.parentElement.removeChild(stackOverlay) ;
                                stackOverlay = null;
                            }
                        }
                        if([STACK_RIGHT, STACK_LEFT, STACK_BOTTOM, STACK_TOP, STACK_DIALOG, 
                                STACK_SIDE_BOTTOM, STACK_SIDE_LEFT, STACK_SIDE_RIGHT, STACK_SIDE_TOP].includes(layoutCode)){
                            if(layoutParams.includes("x")){
                                if(!stackClose){
                                    stackClose = document.createElement("DIV") ;
                                    stackClose.className = "viewz-stack-close" ;
                                    stackClose.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16">
      <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
    </svg>` ;
                                    viewzContainerParent.appendChild(stackClose) ;
                                    stackClose.addEventListener("click", ()=>{
                                        if(execRoute.stackOptions.close){
                                            execRoute.stackOptions.close() ;
                                        }else{
                                            router.closeStack() ;
                                        }
                                    })
                                }
                            }else{
                                if(stackClose){
                                    stackClose.parentElement.removeChild(stackClose)
                                    stackClose = null;
                                }
                            }
                        }else{
                            if(stackClose){
                                stackClose.parentElement.removeChild(stackClose) ;
                                stackClose = null;
                            }
                        }
                        stackContainer = document.createElement("DIV") ;
                        stackContainer.id = "viewz-stack-container-"+execRoute.stackOptions.level ;
                        stackContainer.style.zIndex = 100+(execRoute.stackOptions.level*10) ;
                        if(stackClose){
                            stackClose.style.zIndex = Number(stackContainer.style.zIndex)+1 ;
                        }
                        stackContainer.style.opacity = 0 ;
                        viewzContainerParent.appendChild(stackContainer) ;
                        stackContainer.destroy = ()=>{
                            let destroyDone = false;
                            function doDestroy(){
                                if(destroyDone){ return ; }
                                destroyDone = true;
                                stackContainer.remove() ;
                                if(stackOverlay){
                                    stackOverlay.remove() ;
                                    stackOverlay = null;
                                }
                                if(stackClose){
                                    stackClose.remove() ;
                                    stackClose = null;
                                }
                                viewzContainerParent.classList.remove("viewz-parent-container-side-right") ;
                                viewzContainerParent.classList.remove("viewz-parent-container-side-left") ;
                                viewzContainerParent.classList.remove("viewz-parent-container-side-top") ;
                                viewzContainerParent.classList.remove("viewz-parent-container-side-bottom") ;
                                viewzContainerParent.classList.remove("viewz-parent-container-side-with-gutter") ;
                            }
                            stackContainer.addEventListener("transitionend", () => { 
                                doDestroy(); //allow animation
                            }, {once: true}) ;
                            setTimeout(()=>{
                                // force after 0.3s if no animation or not finished
                                doDestroy()
                            }, 300) ;
                            stackContainer.classList.remove("show") ;
                            if(stackOverlay){
                                stackOverlay.classList.remove("show") ;
                            }
                        }
                    }
                    
                   
                    if(layoutCode === STACK_RIGHT){
                        // ( is stack on the right
                        stackContainer.className = "viewz-stack-right" ;
                        stackClose?.classList.add("viewz-stack-close-right") ;
                    }else if(layoutCode === STACK_LEFT){
                        // ) is stack on the left
                        stackContainer.className = "viewz-stack-left" ;
                        stackClose?.classList.add("viewz-stack-close-left") ;
                    }else if(layoutCode === STACK_BOTTOM){
                        // _ is stack on the bottom
                        stackContainer.className = "viewz-stack-bottom" ;
                        stackClose?.classList.add("viewz-stack-close-bottom") ;
                    }else if(layoutCode === STACK_TOP){
                        // - is stack on the top
                        stackContainer.className = "viewz-stack-top" ;
                        stackClose?.classList.add("viewz-stack-close-top") ;
                    }else if(layoutCode === STACK_DIALOG){
                        // () is stack as a dialog
                        stackContainer.className = "viewz-stack-dialog" ;
                        stackClose?.classList.add("viewz-stack-close-dialog") ;
                    }else if(layoutCode === STACK_FULLSCREEN){
                        // empty is stack as fullscreen
                        stackContainer.className = "viewz-stack-fullscreen" ;
                    }else if(layoutCode === STACK_SIDE_RIGHT){
                        // I- side on the right
                        stackContainer.className = "viewz-stack-side-right" ;
                        stackClose?.classList.add("viewz-stack-close-right") ;
                    }else if(layoutCode === STACK_SIDE_LEFT){
                        // -I side on the left
                        stackContainer.className = "viewz-stack-side-left" ;
                        stackClose?.classList.add("viewz-stack-close-left") ;
                    }else if(layoutCode === STACK_SIDE_TOP){
                        // T side on the top
                        stackContainer.className = "viewz-stack-side-top" ;
                        stackClose?.classList.add("viewz-stack-close-top") ;
                    }else if(layoutCode === STACK_SIDE_BOTTOM){
                        // L side on the bottom
                        stackContainer.className = "viewz-stack-side-bottom" ;
                    }

                    if(layoutCode === STACK_SIDE_RIGHT){
                        viewzContainerParent.classList.add("viewz-parent-container-side-right") ;
                    }else if(layoutCode === STACK_SIDE_LEFT){
                        viewzContainerParent.classList.add("viewz-parent-container-side-left") ;
                    }else if(layoutCode === STACK_SIDE_TOP){
                        viewzContainerParent.classList.add("viewz-parent-container-side-top") ;
                    }else if(layoutCode === STACK_SIDE_BOTTOM){
                        viewzContainerParent.classList.add("viewz-parent-container-side-bottom") ;
                    }else{
                        viewzContainerParent.classList.remove("viewz-parent-container-side-right") ;
                        viewzContainerParent.classList.remove("viewz-parent-container-side-left") ;
                        viewzContainerParent.classList.remove("viewz-parent-container-side-top") ;
                        viewzContainerParent.classList.remove("viewz-parent-container-side-bottom") ;
                        viewzContainerParent.classList.remove("viewz-parent-container-side-with-gutter") ;
                    }

                    
                    for(let layoutParam of layoutParams){
                        if(layoutParam === "r"){
                            // option r on side layout activate manual resize
                            let stackGutter = document.getElementById("viewz-stack-gutter-"+execRoute.stackOptions.level) ;
                            if(!stackGutter){
                                stackGutter = document.createElement("DIV") ;
                                stackGutter.id = "viewz-stack-gutter-"+execRoute.stackOptions.level ;
                                stackGutter.className = "viewz-stack-gutter" ;
                                viewzContainerParent.classList.add("viewz-parent-container-side-with-gutter") ;
                                viewzContainerParent.appendChild(stackGutter)
                                import("https://cdn.jsdelivr.net/npm/split-grid@1.0.11/+esm").then(splitGrid=>{
                                    const options = {
                                        columnGutters: [{
                                            track: 1,
                                            element: stackGutter,
                                        }],
                                    }

                                    //must rewrite the CSS because split grid can't read CSS variables
                                    if(layoutCode === STACK_SIDE_RIGHT){
                                        viewzContainerParent.style.setProperty("grid-template-columns", "1fr 10px "+stackContainer.offsetWidth+"px");
                                    }else if(layoutCode === STACK_SIDE_LEFT){
                                        viewzContainerParent.style.setProperty("grid-template-columns", stackContainer.offsetWidth+"px 10px 1fr");
                                    }else if(layoutCode === STACK_SIDE_TOP){
                                        viewzContainerParent.style.setProperty("grid-template-rows", stackContainer.offsetHeight+"px 10px 1fr");
                                    }else if(layoutCode === STACK_SIDE_BOTTOM){
                                        viewzContainerParent.style.setProperty("grid-template-rows", "1fr 10px "+stackContainer.offsetWidth+"px");
                                    }
                                    
                                    splitGrid.default(options) ;
                                });
                            }
                            
                        }else if(layoutParam === "x"){
                            // add close cross
                            stackContainer.classList.add("has-close")
                        }else{
                            let [param,value] = layoutParam.split("=") ;
                            param = param.trim() ;
                            value = value.trim() ;
                            if(STACK_STYLE_PARAMS[param]){
                                stackContainer.style.setProperty(STACK_STYLE_PARAMS[param], value);
                            }else{
                                console.warn("Unknown stack param "+layoutParam) ;
                            }
                        }
                    }
                    
                    setTimeout(()=>{
                        stackContainer.classList.add("show") ;
                    }, 1)

                    return stackContainer ;
                }else{
                    return viewzContainer ;
                }
            }
        })
        router.STACK_RIGHT = STACK_RIGHT ;
        router.STACK_LEFT = STACK_LEFT ;
        router.STACK_BOTTOM = STACK_BOTTOM ;
        router.STACK_TOP = STACK_TOP ;
        router.STACK_DIALOG = STACK_DIALOG ;
        router.STACK_FULLSCREEN = STACK_FULLSCREEN ;
        router.STACK_SIDE_LEFT = STACK_SIDE_LEFT ;
        router.STACK_SIDE_RIGHT = STACK_SIDE_RIGHT ;
        router.STACK_SIDE_TOP = STACK_SIDE_TOP ;
        router.STACK_SIDE_BOTTOM = STACK_SIDE_BOTTOM ;
        router.start() ;
    }catch(err){
        console.log("Can't load viewz router", err) ; 
    }
}
