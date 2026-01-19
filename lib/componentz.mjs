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
            htmlProcessors.push(template=>{
                const slotElm = template.querySelector("z-slot") ;
                if(!slotElm){
                    console.warn("You gave a HTML content to a component but it doesn't have a <z-slot>")
                }
                while(div.childNodes.length>0){
                    slotElm.parentElement.insertBefore(div.childNodes[0], slotElm) ;
                }
                slotElm.remove();
            })
        }
        this.view = new ViewZ({
            html: `${componentsDir}/${component.name}/${component.name}.html`,
            css: `${componentsDir}/${component.name}/${component.name}.css`,
            js: `${componentsDir}/${component.name}/${component.name}.js`,
            id: `${component.name}`,
            htmlProcessors
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
                        value = this.getAttribute(mutation.attributeName) ;
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
        this.rendering = true;
        for (let i = 0; i < this.attributes.length; i++) {
            const attributeName = attributeNameToCamelCase(this.attributes[i].name) ;
            let value = this[attributeName] ; //take property first
            if(value === undefined){
                //not exist as property, take attribute value
                value = this.attributes[i].value ;
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