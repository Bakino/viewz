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