import { ViewZ } from './viewz.mjs';

function attributeNameToCamelCase(attributeName){
    return attributeName.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
}

export class ViewZElement extends HTMLElement {
    constructor(componentsDir, component) {
        super();
        this.view = new ViewZ({
            html: `${componentsDir}/${component.name}/${component.name}.html`,
            css: `${componentsDir}/${component.name}/${component.name}.css`,
            js: `${componentsDir}/${component.name}/${component.name}.js`,
            id: `${component.name}`,
        }) ;
        this.rendered = false;
        this.params = {} ;
        if(this.innerHTML.trim()){
            for(let ext of ViewZ.extensions){
                if(ext.htmlProcessors){
                    for(let processor of ext.htmlProcessors){
                        try{
                            processor(this) ;
                        }catch(err){
                            console.error("Can't apply processor", processor, err) ;
                        }
                    } 
                }
            }
            this.params[attributeNameToCamelCase(component.name)] = this.innerHTML.trim() ;
        }
        this.view.route = { params: this.params } ;
        this.observer = new MutationObserver((mutationsList) => {
            let hasModification = false;
            for (const mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName !== "style") {
                    hasModification = true;
                    this.params[attributeNameToCamelCase(mutation.attributeName)] = this.getAttribute(mutation.attributeName) ;
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
            this.params[attributeNameToCamelCase(this.attributes[i].name)] = this.attributes[i].value;
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