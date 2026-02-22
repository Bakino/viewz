

export function uuidv4() {
    if(typeof(window.crypto) !== "undefined" && crypto.getRandomValues){
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, function(c){
            return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16) ;
        }) ;
    }else{
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}



function loadWaiterCss(parentElement){   
    let head = document.getElementsByTagName('head')[0];

    if(parentElement && parentElement.getRootNode){
        let shadowRoot = parentElement.getRootNode();
        head = shadowRoot;
        if(shadowRoot.head){
            head = shadowRoot.head ;
        }
    }

    if(head.waiterCssLoaded){ return;}
    head.waiterCssLoaded = true ;

    const css = "@keyframes bamz_spinner { to {transform: rotate(360deg);} }" +
        ".bamz_overlay { "+
        "    position: "+(parentElement?"absolute":"fixed")+"; "+
        "    top: 0; "+
        "    left: 0; "+
        "    right: 0; "+
        "    bottom: 0; "+
        "    background-color: rgba(0, 0, 0, 0.2); "+
        //"    background-image: url('/$bamz/public/resources/modules/apps/views/logo_back_light_opa.svg');" +
        "    background-repeat: no-repeat;" +
        "    background-position: center;" +
        "    background-size: 300px;" +
        "    z-index: 1500; "+
        "  }"+
        ".bamz_waitmsg { "+
        "    color: white; "+
        "    position: absolute;"+
        "    top: calc(50% + 30px);"+
        "    left: 0;"+
        "    width: 100%;"+
        "    text-align: center;"+
        "  }"+
        ".bamz_spinner:before { "+
        "    content: '';"+
        "    box-sizing: border-box;"+
        "    position: absolute;"+
        "    top: 50%;"+
        "    left: 50%;"+
        "    width: 20px;"+
        "    height: 20px;"+
        "    margin-top: -10px;"+
        "    margin-left: -10px;"+
        "    border-radius: 50%;"+
        "    border: 2px solid #ccc;"+
        "    border-top-color: #333;"+
        "    animation: bamz_spinner .6s linear infinite;"+
        "  }" ;

    let s = document.createElement('style');
    s.setAttribute('type', 'text/css');
    if (s.styleSheet) {   // IE
        s.styleSheet.cssText = css;
    } else {        // the world
        s.appendChild(document.createTextNode(css));
    }
    head.appendChild(s);
}

const AsyncFunction = (async () => {}).constructor;

class Waiter {
    constructor({parentElement}={}){
        this.waitingCount = 0;
        this.waiterDiv = null;
        this.message = "" ;
        this.parentElement = parentElement??document.body ;
        loadWaiterCss(this.parentElement) ;
    }

    showWaiter(){
        if(this.waiterDiv){ return ; }
        //from : https://stephanwagner.me/only-css-loading-spinner
        this.waiterDiv = document.createElement("div") ;
        this.waiterDiv.className = "bamz_overlay" ;
        let spinnerDiv = document.createElement("div") ;
        spinnerDiv.className = "bamz_spinner" ;
        let msgDiv = document.createElement("div") ;
        msgDiv.className = "bamz_waitmsg" ;
        this.waiterDiv.appendChild(msgDiv) ;
        msgDiv.innerHTML = this.message??"" ;
        this.message = ""; //once shown forgot message to not display it again
        this.waiterDiv.appendChild(spinnerDiv) ;
        this.waiterDiv.idTimeout = setTimeout(()=>{
            if(this.waiterDiv){
                delete this.waiterDiv.idTimeout ;
                this.parentElement.appendChild(this.waiterDiv) ;
            }
        }, 10) ;
        return this.waiterDiv ;
    }

    hideWaiter(){
        if(this.waiterDiv && this.waiterDiv.parentElement){
            this.waiterDiv.parentElement.removeChild(this.waiterDiv) ;
        }
        this.waiterDiv = null;
    }

    async wait(promise, {message}={}){
        this.waitingCount++ ;
        let warningTooLongId = null;
        try{
            if(message != null){
                this.message = message ;
            }
            if(this.waitingCount===1){
                this.spinnerTimeoutId = setTimeout(()=>{
                    this.spinnerTimeoutId = null;
                    this.showWaiter() ;
                }, 100) ;
            }
            if(promise && promise.constructor === AsyncFunction){
                promise = promise.apply(null) ;
            }

            
            warningTooLongId = setTimeout(()=>{
                warningTooLongId = null;
                console.warning("Waiter is still waiting after 10 seconds, maybe the promise is not resolved ?", promise) ;
            }, 10000) ;
            return await promise;
        }catch(err){
            if(this.waitingCount === 1){
                //first waiter, show the error
                window.alert(err) ;
            }
            throw err;
        }finally{
            if(warningTooLongId){
                clearTimeout(warningTooLongId) ;
            }
            this.waitingCount-- ;
            if(this.spinnerTimeoutId){
                //not yet displayed, clear the timeout
                clearTimeout(this.spinnerTimeoutId) ;
            }else if(this.waitingCount === 0){
                //last waiter, hide it
                this.hideWaiter()
            }
        }
    }
    setMessage(message){
        let msgDiv = this.parentElement.querySelector(".bamz_waitmsg") ;
        if(msgDiv){
            //waiter displayed, set the message
            msgDiv.innerHTML = message ;
        }else if(this.spinnerTimeoutId){
            //waiter will be displayed, keep the message to show it
            this.message = message;
        }
    }
}

const WAITERS = new WeakMap();

export function setWaiterMessage(params){
    let parentElement = null;
    let message;
    if(typeof(params) === "string"){
        message = params;
        parentElement = document.body ;
    }else{
        parentElement = params.parentElement;
        message = params.message;
    }
    let waiterInstance = WAITERS.get(parentElement);

    if (!waiterInstance) {
        waiterInstance = new Waiter({ parentElement });
        WAITERS.set(parentElement, waiterInstance);
    }

    return waiterInstance.setMessage(message) ;
}

export async function waiter(promise, {parentElement, message}={}){
    if(!parentElement){
        parentElement = document.body ;
    }
    let waiterInstance = WAITERS.get(parentElement);

    if (!waiterInstance) {
        waiterInstance = new Waiter({ parentElement });
        WAITERS.set(parentElement, waiterInstance);
    }

    return await waiterInstance.wait(promise, {message}) ;
} 


export function loadScript(url){
    return new Promise((resolve, reject)=>{
        let document = window.document ;
        if(document.querySelector(`script[src="${url}"]`)){
            //already imported
            return resolve() ;
        }
        let script = document.createElement("script");
        script.async = true;
        script.type = "application/javascript";
        script.src = url;
        script.onload = function(_, isAbort) {
            if (!script.readyState || "complete" === script.readyState) {
                if (isAbort){
                    document.head.removeChild(script);
                    reject("can't load "+url) ;
                }else{
                    resolve() ;
                }
            }
        };
        
        script.onreadystatechange = script.onload ;
        
        script.onerror = function () {
            reject("can't load "+url) ;
        };
        
        document.head.appendChild(script);
    }) ;
}

export function loadCss(url){
    let head = document.head;
    return new Promise((resolve)=>{
        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = url;
        
        
        head.appendChild(link);
        resolve() ;
    }) ;
} 

export function loadCssCode(cssCode){
    let head = document.head;
    return new Promise((resolve)=>{
        var style = document.createElement("style");
        style.type = "text/css";
        style.appendChild(document.createTextNode(cssCode));
        head.appendChild(style);
        resolve() ;
    }) ;
}