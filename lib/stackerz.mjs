function getContainer(parentContainer, params, router){
    
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
        stackContainer.className = `viewz-stack-container ${this.className}` ;
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
    applyParams(){
        if(this.params["x"]){
            this.stackClose.style.display = "block" ;
        }else{
            this.stackClose.style.display = "none" ;
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

export const stackerLeft = {
    prefix: ")",
    createInstance: (params, router)=>{
        return new Stacker(params, router, "viewz-stack-left") ;
    }
}
export const stackerRight = {
    prefix: "(",
    createInstance: (params, router)=>{
        return new Stacker(params, router, "viewz-stack-right") ;
    }
}