const STACK_STYLE_PARAMS = {
    w: "--viewz-stack-lateral-width",
    h: "--viewz-stack-vertical-height",
    bg: "--viewz-stack-background-color",
    t: "--viewz-stack-transition-duration",
}

class Stacker {
    constructor(params, router, className){
        this.params = params ;
        this.className = className ;
        this.router = router ;
    }
    getContainer({parentContainer}){       
        const stackOverlay = document.createElement("DIV") ;
        stackOverlay.className = "viewz-stack-overlay show" ;
        stackOverlay.style.zIndex = this.params.level*100 ;
        parentContainer.appendChild(stackOverlay) ;
        stackOverlay.addEventListener("click", ()=>{
            this.router.closeStack({level: this.params.level}) ;
        })
        const stackContainer = document.createElement("DIV") ;
        stackContainer.id = "viewz-stack-container-"+this.params.level ;
        stackContainer.className = `viewz-stack-container viewz-stack-${this.className}` ;
        stackContainer.style.zIndex = (this.params.level*100)+1;
        parentContainer.appendChild(stackContainer) ;

        const stackClose = document.createElement("DIV") ;
        stackClose.className = "viewz-stack-close" ;
        stackClose.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16">
<path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
</svg>` ;

        const stackTitle = document.createElement("DIV") ;
        stackTitle.className = "viewz-stack-title" ;

        const viewContainer = document.createElement("DIV") ;

        stackContainer.appendChild(stackTitle) ;
        stackContainer.appendChild(stackClose) ;
        stackContainer.appendChild(viewContainer) ;
        stackClose.addEventListener("click", ()=>{
            this.router.closeStack({level: this.params.level}) ;
        }) ;

        this.stackClose = stackClose ;
        this.stackTitle = stackTitle ;
        this.stackContainer = stackContainer ;
        this.stackOverlay = stackOverlay ;
        this.viewContainer = viewContainer ;
        
        this.applyParams() ;

        setTimeout(()=>{
            stackContainer.classList.add("show") ;
        }, 1) ;

        
        return viewContainer ;
    }
    setTitle(title){
        this.stackTitle.innerHTML = title ;
    }
    changeParams(newParams){
        this.params = newParams ;
        this.applyParams() ;
    }
    async applyParams(){
        if(this.params["x"]){
            this.stackClose.style.display = "block" ;
        }else{
            this.stackClose.style.display = "none" ;
        }
        for(let [param, value] of Object.entries(this.params)){
            if(STACK_STYLE_PARAMS[param]){
                this.stackContainer.style.setProperty(STACK_STYLE_PARAMS[param], value);
            }
        }
    }
    doDestroy(){
        if(this.stackContainer){
            this.stackContainer.remove() ;
            this.stackContainer = null ;
            this.stackOverlay.remove() ;
            this.stackOverlay = null ;
        }
    }
    destroy(){
        if(this.stackContainer){
            this.stackContainer.classList.remove("show") ;
            if(this.stackOverlay){
                this.stackOverlay.classList.remove("show") ;
            }
            this.stackContainer.addEventListener("transitionend", () => { 
                this.doDestroy(); //allow animation
            }, {once: true}) ;
            setTimeout(()=>{
                // force after 0.3s if no animation or not finished
                this.doDestroy()
            }, 300) ;
            
        }
    }
}

class StackerInPlace {
    constructor(params, router){
        this.params = params ;
        this.router = router ;
    }
    getContainer({parentContainer, route}){       
        if(!route.parent){
            throw "You can use inplace stacker only on route with a parent"
        }
        // we keep the existing container and hide it
        this.existingViewContainer = route.parent.view.querySelector("z-sub-view:not([hidden])") ;
        this.existingViewContainer.setAttribute("hidden", "hidden") ;

        // we create a new container
        this.container = document.createElement("z-sub-view") ;
        this.existingViewContainer.after(this.container) ;
        return this.container ;
    }
    destroy(){
        if(this.existingViewContainer){
            this.existingViewContainer.removeAttribute("hidden") ;
        }
        if(this.container){
            this.container.remove() ;
        }
    }
}

let splitGrid = null;
async function getSplitGrid(){
    if(splitGrid){ return splitGrid.default ; }
    splitGrid = await import("https://cdn.jsdelivr.net/npm/split-grid@1.0.11/+esm") ;
    return splitGrid.default ;
}

class StackerSide extends Stacker {
    constructor(params, router, className){
        super(params, router, className) ;
    }

    getContainer({parentContainer, level}){
        this.parentContainer = parentContainer.parentElement;
        if(!this.parentContainer){
            this.parentContainer = parentContainer ;
        }
        this.level = level ;
        this.parentContainer.classList.add("viewz-parent-container-"+this.className) ;
        super.getContainer({parentContainer: this.parentContainer, level}) ;
        this.stackOverlay.remove() ; // no overlay

        
        return this.viewContainer;
    }
    
    destroy(){
        super.doDestroy();
        this.parentContainer.classList.remove("viewz-parent-container-"+this.className) ;
        if(this.params.r){
            if(this.stackGutter){
                this.stackGutter.remove() ;
            }
            this.parentContainer.classList.remove("viewz-parent-container-side-with-gutter") ;
            if(this.className === "side-right"){
                this.parentContainer.style.removeProperty("grid-template-columns");
            }else if(this.className === "side-left"){
                this.parentContainer.style.removeProperty("grid-template-columns");
            }else if(this.className === "side-top"){
                this.parentContainer.style.removeProperty("grid-template-rows");
            }else if(this.className === "side-bottom"){
                this.parentContainer.style.removeProperty("grid-template-rows");
            }
        }
    }

    async applyParams(){
        await super.applyParams() ;
        if(this.params.r){
            let stackGutter = this.parentContainer.querySelector("#viewz-stack-gutter-"+this.level) ;
            if(!stackGutter){
                stackGutter = document.createElement("DIV") ;
                stackGutter.id = "viewz-stack-gutter-"+this.level ;
                stackGutter.className = "viewz-stack-gutter" ;
                this.parentContainer.classList.add("viewz-parent-container-side-with-gutter") ;
                this.parentContainer.appendChild(stackGutter) ;
            }
            this.stackGutter = stackGutter ;

            let splitGrid = await getSplitGrid() ;
            const options = {};
            if(this.className === "side-right" || this.className === "side-left"){
                options.columnGutters = [{
                    track: 1,
                    element: stackGutter,
                }] ;
            }else{
                options.rowGutters = [{
                    track: 1,
                    element: stackGutter,
                }] ;
            }

            //must rewrite the CSS because split grid can't read CSS variables
            if(this.className === "side-right"){
                this.parentContainer.style.setProperty("grid-template-columns", "1fr 10px "+this.stackContainer.offsetWidth+"px");
            }else if(this.className === "side-left"){
                this.parentContainer.style.setProperty("grid-template-columns", this.stackContainer.offsetWidth+"px 10px 1fr");
            }else if(this.className === "side-top"){
                this.parentContainer.style.setProperty("grid-template-rows", this.stackContainer.offsetHeight+"px 10px 1fr");
            }else if(this.className === "side-bottom"){
                this.parentContainer.style.setProperty("grid-template-rows", "1fr 10px "+this.stackContainer.offsetWidth+"px");
            }
            
            splitGrid(options) ;
        }
    }
}

export const stackerLeft = {
    prefix: ")",
    createInstance: (params, router)=>{
        return new Stacker(params, router, "left") ;
    }
}
export const stackerRight = {
    prefix: "(",
    createInstance: (params, router)=>{
        return new Stacker(params, router, "right") ;
    }
}
export const stackerBottom = {
    prefix: "_",
    createInstance: (params, router)=>{
        return new Stacker(params, router, "bottom") ;
    }
}
export const stackerTop = {
    prefix: "-",
    createInstance: (params, router)=>{
        return new Stacker(params, router, "top") ;
    }
}
export const stackerDialog = {
    prefix: "()",
    createInstance: (params, router)=>{
        return new Stacker(params, router, "dialog") ;
    }
}
export const stackerFullscreen = {
    prefix: "F",
    createInstance: (params, router)=>{
        return new Stacker(params, router, "fullscreen") ;
    }
}
export const stackerInplace = {
    prefix: "i",
    createInstance: (params, router)=>{
        return new StackerInPlace(params, router) ;
    }
}

export const stackerSideLeft = {
    prefix: "-I",
    createInstance: (params, router)=>{
        return new StackerSide(params, router, "side-left") ;
    }
}
export const stackerSideRight = {
    prefix: "I-",
    createInstance: (params, router)=>{
        return new StackerSide(params, router, "side-right") ;
    }
}
export const stackerSideTop = {
    prefix: "T",
    createInstance: (params, router)=>{
        return new StackerSide(params, router, "side-top") ;
    }
}
export const stackerSideBottom = {
    prefix: "L",
    createInstance: (params, router)=>{
        return new StackerSide(params, router, "side-bottom") ;
    }
}