import { ViewZ } from './viewz.mjs';

function attributeNameToCamelCase(attributeName){
    return attributeName.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
}

export class ViewZElement extends HTMLElement {
    constructor(componentsDir, component) {
        super();
        
        const htmlProcessors = [];
        if(this.innerHTML.trim()){
            const div = document.createElement("DIV") ;
            while(this.childNodes.length>0){
                div.appendChild(this.childNodes[0]) ;
            }
            //apply default HTML processors to the content of the slot
            for(let ext of ViewZ.extensions){
                if(ext.htmlProcessors){
                    ViewZ.applyProcessors(div, ext.htmlProcessors) ;
                }
            }
            // replace reference to view to the parent view if any
            div.innerHTML = div.innerHTML.replace(/view\./g, `parentView.`) ;
            htmlProcessors.push(template=>{
                const divClone = div.cloneNode(true) ;
                const slotElm = template.querySelector("z-slot") ;
                if(!slotElm){
                    console.warn("You gave a HTML content to a component but it doesn't have a <z-slot>")
                }
                while(divClone.childNodes.length>0){
                    slotElm.parentElement.insertBefore(divClone.childNodes[0], slotElm) ;
                }
                slotElm.remove();
            })
        }
        this.view = new ViewZ({
            html: `${componentsDir}/${component.name}/${component.name}.html`,
            css: `${componentsDir}/${component.name}/${component.name}.css`,
            js: `${componentsDir}/${component.name}/${component.name}.js`,
            id: `${component.name}`,
            htmlProcessors,
        }) ;
        this.rendered = false;
        this.params = {} ;
        
        this.view.route = { params: this.params } ;
        this.observer = new MutationObserver((mutationsList) => {
            let hasModification = false;
            for (const mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName !== "style") {
                    hasModification = true;
                    const attributeName = attributeNameToCamelCase(mutation.attributeName) ;
                    let value = this[attributeName] ; //take property first
                    if(value === undefined){
                        //not exist as property, take attribute value
                        const attributeValue = this.getAttribute(mutation.attributeName) ;
                        if(attributeValue !== "undefined"){
                            value = this.getAttribute(mutation.attributeName) ;
                        }
                    }
                    if(value === "undefined"){
                        value = undefined ;
                    }else if(value === "null"){
                        value = null ;
                    }else if(value === "true"){
                        value = true ;
                    }else if(value === "false"){
                        value = false ;
                    }
                    this.params[attributeName] = value;
                }
            }
            if(hasModification){
                this.view.route.params = this.params;
                this.view.refresh() ;
            }
        });
    }

   
    connectedCallback() {
        if(this.rendering) return ;
        let parentView = null ;
        const parentContainer = this.parentElement?.closest("[z-view-container]") ;
        if(parentContainer){
            parentView = parentContainer.contextz.view ;
        }
        this.view.context.parentView = parentView ;

        this.rendering = true;
        for (let i = 0; i < this.attributes.length; i++) {
            const attributeName = attributeNameToCamelCase(this.attributes[i].name) ;
            let value = this[attributeName] ; //take property first
            if(value === undefined){
                //not exist as property, take attribute value
                const attributeValue = this.attributes[i].value ;
                if(attributeValue !== "undefined"){
                    value = this.attributes[i].value ;
                }
            }
            if(value === "undefined"){
                value = undefined ;
            }else if(value === "null"){
                value = null ;
            }else if(value === "true"){
                value = true ;
            }else if(value === "false"){
                value = false ;
            }
            this.params[attributeName] = value;
        }
        this.view.render({container: this}).then(()=>{
            this.observer.observe(this, {
                attributes: true
            });
            // If a z-bind "_value" push landed (bindz.mjs bindValue) before this
            // component's own render() had attached view.setValue, `set value()`
            // below had nowhere to deliver it and buffered it instead of silently
            // dropping it - flush it now that view.setValue exists. Needed for any
            // page with 2+ instances of the same custom element: their shared
            // sources cache (viewz.mjs prepareSources's VIEWS[viewId] "preparing"
            // gate) makes every instance after the first wait on the first one's
            // fetch, so a bound value that only ever changes once (arrives, then
            // never again) can otherwise be lost for good with no later push to
            // retry it.
            if(this.hasOwnProperty('_pendingValue')){
                const pending = this._pendingValue;
                delete this._pendingValue;
                if(this.view.setValue){
                    this.view.setValue(pending);
                }
            }
        }).finally(()=>{
            this.rendering = false ;
        }) ;
    }

    disconnectedCallback(){
        if(this.rendering) return ;
        this.observer.disconnect() ;
        this.view.destroy() ;
    }

    set value(val){
        if(this.view.setValue){
            this.view.setValue(val) ;
        }else{
            // view.setValue isn't attached yet (render() still pending, see
            // connectedCallback) - this.view.value = val below is otherwise a
            // dead write (nothing reads plain view.value for rendering).
            // Buffer it so connectedCallback's render().then() can deliver it
            // once view.setValue exists, instead of losing it silently.
            this._pendingValue = val;
            this.view.value = val ;
        }
    }
    get value(){
        if(this.view.getValue){
            return this.view.getValue() ;
        }
        return this.view.value ;
    }
}

export function createComponent(componentsDir, component){
    eval(`
        class ${attributeNameToCamelCase(component.name)}ViewZComponent extends ViewZElement {
            constructor(){
                super('${componentsDir}', ${JSON.stringify(component)})
            }
        }
        customElements.define('z-${component.name}', ${attributeNameToCamelCase(component.name)}ViewZComponent);
    `) ;
}