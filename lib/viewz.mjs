import * as binding from "./bindz.mjs" ;
import { loadScript, waiter, setWaiterMessage, uuidv4 } from "./utilz.mjs";

async function polyfillCssScope(){
    if(typeof CSSScopeRule != 'undefined') {
        return "@scope"
    }
    //@scope is not supported by this browser (should not happens anymore in late 2024 / early 2025)
    //load polyfill https://github.com/samthor/scoped
    await loadScript("https://cdn.jsdelivr.net/npm/style-scoped@0.2.2/scoped.min.js");
    return "scoped" ;
}

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

//create a non async function from a potential async function to disable automatic waiter
function noWaiter(f){
    const self = this;
    return function(){
        return f.apply(self, arguments) ;
    }
}

let VIEWS = {};
let viewInc = 0;
export class ViewZ {
    static extensions = [] ;
    static loadExtension(extension){
        extension.ViewZ = ViewZ ;
        ViewZ.extensions.push(extension) ;
    }
    static getExtension(pluginName){
        return ViewZ.extensions.find(e=>e.plugin === pluginName) ;
    }

    static async loadScript(url){
        await loadScript(url) ;
    }

    constructor({html, js, css, id, spinner, htmlProcessors}){
        this.viewId = id??new Date().getTime()+"-"+viewInc++ ;
        this.instanceId = new Date().getTime()+"-"+viewInc++ ;

        this.options = {html, js, css, id} ;
        this.htmlProcessors = htmlProcessors||[] ;
        this.id = id;

        if(html.includes("<") && html.includes(">")){
            //HTML content is given directly
            this.options.plainSources = true ;
        }

        this.docTransformers = [];

        this.spinner = spinner||`<style>
        /* Styling the loader */
        .viewz-loader {
            border: 8px solid #dcdcdc; /* Light gray border */
            border-top: 8px solid #333; /* Dark gray top border */
            border-radius: 50%; /* Makes it a circle */
            width: 50px; /* Width of the spinner */
            height: 50px; /* Height of the spinner */
            animation: spin 1s linear infinite; /* Spin animation */
            margin-left: auto;
            margin-right: auto;
            margin-top: 20px;
        }

        /* Keyframes for the spin animation */
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style><div class="viewz-loader"></div>`
    }

    clone(){
        let clone = new ViewZ({...this.options, spinner: this.spinner}) ;
        return clone ; 
    }

    /**
     * Add a transformer callback to modify the HTML DOM
     * @param {*} transformer 
     */
    docTransformer(transformer){
        this.docTransformers.push(transformer);
    }

    sourcesPrepared(){
        if(!VIEWS[this.viewId]){ return false; }
        if(VIEWS[this.viewId] === "preparing"){ return false; }
        return true;
    }


    set waiterMessage(msg){
        setWaiterMessage(msg) ;
    }

    async _runJsFunction(){
        const params = [this, waiter, ViewZ, noWaiter, loadScript, uuidv4] ;
        for(let ext of ViewZ.extensions){
            if(ext.globals){
                for(let k of Object.values(ext.globals)){
                    params.push(k) ;
                }
            }
            if(ext.extends){
                for(let k of Object.keys(ext.extends)){
                    if(this[k]){
                        //already defined, don't override
                        continue;
                    }
                    if(typeof(ext.extends[k]) === "function"){
                        this[k] = ext.extends[k].bind(this) ;
                    }else{
                        this[k] = ext.extends[k] ;
                    }
                }
            }
        }
        return await VIEWS[this.viewId].sources.jsFunction.apply(null, params);
    }

    async prepareSources({ ssr } = {}){
        if(VIEWS[this.viewId]){ 
            if(VIEWS[this.viewId] === "preparing"){
                //currently preparing, wait a little
                return new Promise((resolve, reject)=>{
                    setTimeout(()=>{
                        this.prepareSources({ ssr }).then(resolve).catch(reject);
                    }, 10);
                })
            }
            return; 
        }

        VIEWS[this.viewId] = "preparing" ;

        let sources = {
            html: "",
            js: "",
            css: "",
        }

        if(this.options.js){
            let fileName ;
            if(this.options.plainSources){
                fileName = "plain_"+this.options.js.substring(0,50).replace(/[^a-zA-Z0-9]/g, "_")+".js" ;
                sources.js = this.options.js ;
            }else{
                fileName = this.options.js ;
                let response = await fetch(this.options.js);
                let js = await response.text();
                sources.js = js;
            }
            let scriptBody = `${sources.js}
//# sourceURL=${fileName}` ;

            const params = ["view", "waiter", "ViewZ", "noWaiter", "loadScript", "uuidv4"] ;
            for(let ext of ViewZ.extensions){
                if(ext.globals){
                    for(let k of Object.keys(ext.globals)){
                        params.push(k) ;
                    }
                }
            }

            try{
                sources.jsFunction = new AsyncFunction(params, scriptBody);
            }catch(err){
                console.error("Error while parse JS function of view "+this.viewId, err) ;
                window.alert("Error in JS function of view "+this.viewId+": "+err.message) ;
            }
        }

        

        let loadHtmlCss = async ()=>{
            
            if(this.options.plainSources){
                sources.html = this.options.html ;
            }else{
                let response = await fetch(this.options.html);
                
                sources.html = await response.text();
            }

            
            if(this.options.css){
                if(this.options.plainSources){
                    sources.css = this.options.css ;
                }else{
                    let response = await fetch(this.options.css);
                    let css = await response.text();
                    sources.css = css;
                }
            }
    
            let template = document.createElement("template") ;
            let css = "";
            if(sources.css){
               css = `<style>${sources.css}</style>`
            }
            template.innerHTML = `${css}${sources.html}` ;
            
            document.body.appendChild(template) ;
            VIEWS[this.viewId]= {sources, template};
        }

        if(ssr){
            //HTML already loaded, don't wait for its refetch
            VIEWS[this.viewId]= {sources};
            loadHtmlCss();
        }else{
            //not in SSR mode, wait for all loaded
            await loadHtmlCss();
        }
    }

    async refresh(){
        if(this.loader){
            let newData = await this.loader();
            if(!newData){
                newData = {} ;
            }
            const viewedProperties = [] ;
            for(let k of Object.keys(newData)){
                this.data[k] = newData[k] ;
                viewedProperties.push(k);
            }
            for(let k of Object.keys(this.data)){
                if(!viewedProperties.includes(k)){
                    //this property is not in the new data, remove it
                    delete this.data[k] ;
                }
            }
        }
        if(this.refreshed){
            await this.refreshed() ;
        }
    }

    async bind(){
        this.container.contextz = {view: this} ;
        let data = this.data ;
        
        this.bindz = binding.bind(this.container, data, {view: this}) ;
        this.data = this.bindz.data.data;
    }

    /**
     * Force a manual render of the view.
     * 
     * This should not be necessary in most cases, as the view is automatically rendered when the data changes.
     * 
     * If you did some modifications to the data with _dontAutoBind set, you can call this method to manually trigger the rendering.
     */
    manualRender(){
        if(this.bindz){
            this.bindz.bindAll() ;
        }
    }

    addDataListener(path, listener){
        this.bindz.data.addListener(path, listener) ;
    }

    getCleanData(){
       return this.bindz.data.originalData ;
    }

    abortRender(){
        this.renderAborted = true ;
    }

    async render({container, ssr}){
        console.log("render view", this) ;

        this.renderAborted = false ;
        //polyfill immediatly
        let scopeMode = await polyfillCssScope();
        
        
        this.container = container ;
        this.container.style.opacity = 0;

        //TODO: improve this cleaning
        delete this.container.zzBindData ;
        delete this.container.__zzBindPrepared ;
        delete this.container.render ;



        if(this.container.zzView){
            //remove all listener of previous view rendered in this container
            this.container.zzView.eventController.abort()
        }
        //set this view as current view of this controller
        this.container.zzView = this;

        this.eventController = new AbortController();
        const { signal } = this.eventController;
        
        // add event listener
        this.addEventListener = function(type, listener, options = {}){
            options.signal = signal ;
            this.container.addEventListener(type, listener, options) ;
        };
        this.dispatchEvent = function(){
            if(typeof(arguments[0]) === "string"){
                // called in simplified form dispatchEvent("name", data)
                this.container.dispatchEvent(new CustomEvent(arguments[0], {
                    detail: arguments[1], 
                    bubbles: true,
                    composed: true
                })) ;    
            }else{
                this.container.dispatchEvent.apply(this.container, arguments) ;
            }
        };

        this.getElementById = function(id){
            return this.container.querySelector(`#${id}`) ;
        }
        this.querySelector = function(selector){
            return this.container.querySelector(selector) ;
        }
        this.querySelectorAll = function(selector){
            return Array.from(this.container.querySelectorAll(selector)) ;
        }
        
        const existingViewFunctions = Object.keys(this) ;

        let jsRunDone = false;
        if(this.sourcesPrepared() && VIEWS[this.viewId].sources.jsFunction){
            //the sources is already prepared, run the JS immediatly
            jsRunDone = true;
            await this._runJsFunction() ;
        }


        if(!ssr && (!this.sourcesPrepared() || this.loader)){
            // If the HTML is not yet available or there is data to fetch, add loaded inside the container
            container.innerHTML = this.spinner;
        }else{
            waiter(new Promise((resolve)=>{
                this.addEventListener("displayed", resolve, {once: true});
            }));
        }

        await this.prepareSources({ssr});

        if(!jsRunDone && VIEWS[this.viewId].sources.jsFunction){
            //the JS has not been run yet, run now
            await this._runJsFunction() ;
        }

        for(let k of Object.keys(this)){
            if(!existingViewFunctions.includes(k)){
                let value = this[k] ;
                if(value && value.constructor === AsyncFunction && !value.toString().includes("view.router.openStack")){
                    //it is an async function, inject waiter in it
                    //console.log("INJECT WAITER", k) ;
                    this[k] = function(){
                        return waiter(value.apply(this, arguments)) ;
                    }
                }
            }
        }
        
        if(this.loader){
            try{
                this.data = await this.loader();
                if(!this.data){
                    this.data = {} ;
                }
            }catch(err){
                console.error("Error while fetch data", err) ;
                window.alert("Error "+JSON.stringify(err)) ;
                this.data = {
                    error: err
                }
            }
        }else{
            this.data = {};
        }

        if(this.renderAborted){ return ; }

       /*if(this.container === container && this.container.getAttribute("z-view") === this.options.page){
            //already active, refresh
            // waiter(this.bind()).then(()=>{
            //     this.body.dispatchEvent(new CustomEvent("refresh"));
            // }) ;
            // return;
            return waiter(this.bind()).then(()=>{
                this.body.dispatchEvent(new CustomEvent("refresh"));
            }) ;
        }*/
        


        //this.container.setAttribute("z-view", this.options.page) ;
        let containerPlaceholder;
        if(!ssr){
            containerPlaceholder = document.createComment("placeholder-viewz-container") ;
            this.container.replaceWith(containerPlaceholder);
            this.container.innerHTML = "";
            let templateCopy = document.importNode(VIEWS[this.viewId].template.content, true);
            for(let ext of ViewZ.extensions){
                if(ext.htmlProcessors){
                    ViewZ.applyProcessors(templateCopy, ext.htmlProcessors) ;
                }
            }
            if(this.htmlProcessors){
                ViewZ.applyProcessors(templateCopy, this.htmlProcessors) ;
            }
            while(templateCopy.children.length>0){
                if(templateCopy.children[0].tagName === "STYLE"){
                    if(scopeMode === "@scope"){
                        templateCopy.children[0].innerHTML = `@scope {${templateCopy.children[0].innerHTML}}`;
                    }else{
                        //using polyfill
                        templateCopy.children[0].setAttribute("scoped", "scoped");
                    }
                }
                this.container.appendChild(templateCopy.children[0]);
            }
            
        }else{
            // SSR does not know if the @scope CSS is supported or not, we must add it
            let style = this.container.querySelector("style");
            if(style){
                if(scopeMode === "@scope"){
                    style.innerHTML = `@scope {${style.innerHTML}}`;
                }else{
                    //using polyfill
                    style.setAttribute("scoped", "scoped");
                }
            }
        }

        for(let transformer of this.docTransformers){
            transformer(this.container) ;
        }

        for(let ext of ViewZ.extensions){
            if(ext.docTransformers){
                for(let transformer of ext.docTransformers){
                    transformer.bind(this)(this.container) ;
                }
            }
        }

        if(this.renderAborted){ return ; }
        
        await this.bind();

        if(this.renderAborted){ return ; }

        if(containerPlaceholder){
            containerPlaceholder.replaceWith(this.container);
        }

        if(this.displayed){
            try{
                await this.displayed() ;
            }catch(err){
                console.error("Error in displayed function", err) ;
            }
        }

        if(this.renderAborted){ return ; }

        this.container.style.opacity = 1;

        this.container.dispatchEvent(new CustomEvent("displayed"));


        //this.container.innerHTML = "<view-"+this.viewId+" id=\""+this.instanceId+"\" class=\"view-controller-container\"></view-"+this.viewId+">" ;
       /* this.body = this.container.querySelector("view-"+this.viewId) ;
        this.shadowRoot = this.body.shadowRoot;
        this.shadowRoot._viewController = this ;*/

        //waiter();

        

        // .then(()=>{
        //     bodyEl.style.display = "" ;

            
            
        // }), self.container).finally(()=>{
            
        // }) ;
    }

    static applyProcessors(element, htmlProcessors){
        if(htmlProcessors){
            for(let processor of htmlProcessors){
                try{
                    processor(element) ;
                }catch(err){
                    console.error("Can't apply processor", processor, err) ;
                }
            } 
        }
    }

    destroy(){
        if(this.eventController){
            this.eventController.abort();
        }
        if(this.container?.contextz?.view === this){
            //destroy only if this container is still linked to this view
            delete this.container.contextz ;
            this.container.innerHTML = "";
        }
        this.bindz?.destroy() ;
        for(let ext of ViewZ.extensions){
            if(ext.extends?.destroy){
                try{
                    ext.extends.destroy.bind(this)() ;
                }catch(err){
                    console.warn("Error while destroy viewz extension", err) ;
                }
            }
        }
        if(this.destroyed){
            try{
                this.destroyed() ;
            }catch(err){
                console.error("Error in destroyed function", err) ;
            }
        }
    }
}