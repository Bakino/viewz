//https://github.com/cam-inc/esr

import {pathToRegexp} from './vendor/path-to-regexp.mjs';
import { ViewZ } from './viewz.mjs';
import { createBrowserHistory, createMemoryHistory, createHashHistory } from 'https://cdn.jsdelivr.net/npm/history@5.3.0/history.development.min.js';


export const constants = {
  BROWSER: 'BROWSER',
  MEMORY: 'MEMORY',
  HASH: 'HASH'
};

// Regex to match stack pattern separators: /*X*/ where X is any character(s)
const STACK_PATTERN_REGEX = "/\\*([^*]*)\\*/";

class RouteInstanceZ {
    constructor({view, stacker}) {
        this.view = view ;
        this.stacker = stacker ;
        this.renderId = null ;
        this.result = null ;
        this.childrenViews = [] ;
    }

    async destroy(){
        await this.view.destroy() ;
        delete this.renderId ;
        if(this.stacker){
            this.stacker.destroy() ;
        }
    }

    async render({url, params, queries, hash, container}){
        let view = this.view ;
        view.route = {url, params, queries, hash} ;
        this.result = null;
        let ssr = false;
        if(container.hasAttribute("zz-ssr")){
            if(container.getAttribute("zz-ssr") === view.id){
                ssr= true;
            }
            container.removeAttribute("zz-ssr");
        }
        await view.render({container}) ;
    }
}
class RouteZ {
    constructor({url, view, routes, parent = null, title = null, defaultChild = false}) {
        if(!url){
            throw new Error("Route url is required") ;
        }
        if(!view){
            throw new Error("Route view is required") ;
        }

        url = url.trim() ;
        if(url !== "/"){
            url = url.replace(/\/$/, "") ; //remove trailing slash
        }

        const regexp = pathToRegexp(url);
        this.url = url ;
        this.regexp = regexp ;
        this.view = view ;
        this.title = title ;
        this.parent = parent ;
        this.defaultChild = defaultChild ;
        this.routes = [] ;
        this.instances = [
            new RouteInstanceZ({view})
        ] ;
        if(routes){
            for(let r of routes){
                this.addRoute({url: r.url, view: r.view, routes: r.routes, title: r.title, defaultChild: r.defaultChild}) ;
            }
        }
    } ;

    addRoute({url, view, routes = [], title = null, defaultChild = false}) {
        let r = new RouteZ({url, view, routes, title, parent: this, defaultChild}) ;
        this.routes.push(r) ;
        return r ;
    }

    getInstance(level) {
        let instance = this.instances[level] ;
        if(!instance){
            //clone view for new instance
            instance = new RouteInstanceZ({
                view: this.view.clone(),
            }) ;
            instance.level = level ;
            this.instances[level] = instance ;
        }
        return instance ;
    }

    updateRenderId(renderId, level) {
        const instance = this.getInstance(level) ;

        if(this.routes){
            //check for default child route
            let defaultChildRoute = this.routes.find(r => r.defaultChild) ;
            if(defaultChildRoute && defaultChildRoute.getInstance(level).renderId === instance.renderId){
                // there is a default child route openned, update it too
                defaultChildRoute.updateRenderId(renderId, level) ;
            }
        }
        instance.renderId = renderId ;

        //update parent routes id too
        let parentRoute = this.parent ;
        while(parentRoute){
            if(level === 0 || parentRoute.url !== "/"){
                parentRoute.updateRenderId(renderId, level) ;
                parentRoute = parentRoute.parent ;
            }else{
                break;
            }
        }
    };

    async destroy(level) {
        const instance = this.getInstance(level) ;
        if(this.routes){
            //check for default child route
            let defaultChildRoute = this.routes.find(r => r.defaultChild) ;
            if(defaultChildRoute && defaultChildRoute.getInstance(level).renderId === instance.renderId){
                // there is a default child route openned, destroy it too
                await defaultChildRoute.destroy(level) ;
            }
        }
        await instance.destroy() ;
    };
}


export class RouterZ {
    static stackers = [] ;
    static loadStacker(stacker){
        RouterZ.stackers.push(stacker) ;
    }
    static getStacker(stackerPrefix, stackParams, router){
        let stacker = RouterZ.stackers.find(e=>e.prefix === stackerPrefix) ;
        if(stacker){
            return stacker.createInstance(stackParams, router) ;
        }
        return null ;
    }

    /**
     * @param {String} type type of history object. this should be one of 'browser', 'memory' or 'hash'.
    */
    constructor({type = constants.BROWSER, container = document.body, base = null, mainTitle = null} = {}) {
        this.type = type;
        this.container = container;
        this.base = base;
        this.mainTitle = mainTitle;
        this.changeRenderQueue = [] ;
        /**
         * hash history object.
         * @private
         * @type {Object}
         */
        switch (type) {
            case constants.BROWSER:
                this._history = createBrowserHistory();
                break;
            case constants.MEMORY:
                this._history = createMemoryHistory();
                break;
            case constants.HASH:
                this._history = createHashHistory();
                break;
            default:
                throw new Error(`Invalid history type: ${type}`);
        }

        this.routes = [] ;
        this.listeners = {} ;
        this.renderId = 0;
        this.currentLevel = 0;

        // load router extension to views
        ViewZ.routerz = this ;
        ViewZ.loadExtension({
            name: "routerz",
            extends: {
                // add router as property of view
                router: this,
            },
            docTransformers: [
                (doc)=>{
                    // on view parsing, update all internal links to use router navigation
                    let allLinks = Array.prototype.slice.apply(doc.querySelectorAll("a"));
                    for(let a of allLinks){
                        if(a.hasAttribute("href") && a.getAttribute("href").startsWith("/")){
                            a.setAttribute("onclick", "return false;") ;
                            a.setAttribute("z-on-click", `view.router.autoNavigate(this.getAttribute("href"), this.getAttribute("target"));`) ;
                            a.setAttribute("href", (this.base??"")+a.getAttribute("href")) ;
                        }
                    }
                }
            ]
        });

        document.dispatchEvent(new CustomEvent("routerz-created", {detail: this}))
    }

    /**
     * start listening for changes to the current location.
     * @param {Boolean} autoExec to decide whether routing is executed with the current url.
     */
    async start(autoExec = true) {
        this._unlistener = this._history.listen(({location, action}) => {
            this._change(location, action);
        });


        if (autoExec) {
            await this._change(this.getCurrentLocation(), "");
        }
    }

    /**
     * Block navigation with a confirmation message.
     * @param {string} message Message to ask for confirmation before blocking navigation.  If null or undefined, a default message is used.
     */
    block(message = "You have not saved modification, are you sure to leave ?"){
        this._unblock = this._history.block((tx) => {
            //ask for confirmation
            if(window.confirm(message)){
                this._unblock() ;
                tx.retry();
            }
        });
    }

    /**
     * Unblock navigation previously blocked with block().
     */
    unblock(){
        if(this._unblock){
            this._unblock() ;
        }
    }

    /**
     * stop routing.
     */
    stop() {
        if (!this._unlistener) {
            return;
        }
        this._unlistener();
        this._unlistener = null;
    }

    /**
     * Register a route handler.
     * @param {Object} options
     * @param {string} options.pattern - URL pattern (compatible with path-to-regexp) to match.
     * @param {Object} options.view - ViewZ instance.
     */
    addRoute({url, view, routes = [], parent = null, title = null, defaultChild = false}) {
        if(!url){
            throw new Error("Route url is required") ;
        }
        if(!view){
            throw new Error("Route view is required") ;
        }

        const route = new RouteZ({url, view, routes, title, parent, defaultChild}) ;

        this._addRouteAndChildren(route);
        return route;
    }

    async cacheAllViews(){
        for(let route of this.routes){
            await route.view.prepareSources() ;
        }
    }

    _addRouteAndChildren(route){
        this.routes.push(route) ;
        for(let r of route.routes){
            this._addRouteAndChildren(r) ;
        }
    }

    /**
     * Add a listener function for a specific event.
     * @param {string} event Possible events : before, noroute, after, error
     * @param {Function} func 
     */
    addListener(event, func){
        if(!this.listeners[event]){
            this.listeners[event] = [] ;
        }
        this.listeners[event].push(func) ;
    }

    /**
     * Remove a listener function for a specific event.
     * @param {string} event Possible events : before, noroute, after, error
     * @param {Function} func 
     */
    removeListener(event, func){
        if(this.listeners[event]){
            const index = this.listeners[event].indexOf(func) ;
            if(index >= 0){
                this.listeners[event].splice(index, 1) ;
            }
        }
    }

    /**
     * returns current location.
     * @return {String}
     */
    getCurrentLocation() {   
        return this._history.location;
    }

    /**
     * returns current action.
     * @return {String}
     */
    getCurrentAction() {
        return this._history.action;
    }

    getRoute(path){
        for(let r of this.routes){
            if(r.url === path){
                return r ;
            }else if(r.regexp.regexp.exec(path)){
                return r ;
            }
        }
        console.warn(`No route found for path: ${path}`) ;
        return null ;
    }

    async _callListeners(event, ...args){
        if(this.listeners[event]){
            for(let func of this.listeners[event]){
                try{
                    await func(...args) ;
                }catch(err){
                    console.error(`Error in listener for event: ${event}`, err) ;
                }
            }
        }
    }

    /**
     * parse location object.
     * @private
     * @param {Object} location
     * @param {Object} route
     * @return {Object}
     */
    _parseLocation(location, route) {
        const params = {};
        const list = route.regexp.regexp.exec(location.pathname).slice(1);
        for(let i=0; i<route.regexp.keys.length; i++){
            if(list[i] != null){
                params[route.regexp.keys[i].name] = decodeURIComponent(list[i]);
            }
        }

        const queries = {};
        let searchParts = location.search.slice(1).split('&');
        for(let v of searchParts){
            if (!v) {
                continue;
            }
            const pair = v.split('=');
            queries[pair[0]] = pair[1];
        };

        const hash = location.hash.slice(1);

        return {
            params,
            queries,
            hash,
            pathname: location.pathname
        };
    }

    /**
     * Parse a route string with stack pattern separators and extract each route and its stack options
     * @param {string} routeString - The route string to parse
     * @returns {Array<{path: string, stackOptions?: object}>} Array of parsed routes with their stack options
     */
    _parseRouteWithStackPattern(routeString) {
        // Split the route string by the stack pattern separators
        const stackRegex = new RegExp(STACK_PATTERN_REGEX, "g");
        const parts = routeString.split(stackRegex);
        const routes = [];

        // The first part is always a route
        if (parts.length > 0) {
            let path = parts[0].trim() ;
            if(!path){
                // if path is empty, set to root
                path = "/" ;
            }
            routes.push({ path });
        }

        // Process the remaining parts (alternating between stack options and routes)
        let stackLevel = 0;
        for (let i = 1; i < parts.length; i += 2) {
            const stackLayout = parts[i];
            stackLevel++ ;
            let routePath = parts[i + 1] || '';
            const rawPath = routePath;
            if(routePath[0] !== "/"){
                routePath = "/"+routePath ;
            }
            if(!routePath.startsWith(this.base)){
                routePath = (this.base??"")+routePath ;
            }
            
            if (routePath) {
                routes.push({ 
                    path: routePath.trim(),
                    rawPath: rawPath,
                    stackOptions: {
                        layout: stackLayout,
                        level: stackLevel
                    } 
                });
            }
        }

        return routes;
    }

    async processLocationChanges(){
        if(this.processLocationRunning){ 
            //already running
            return ; 
        }
        if(this.changeRenderQueue.length === 0){ 
            //nothing to do
            return ; 
        }
        this.processLocationRunning = true ;
        try{
            //process queue
            const task = this.changeRenderQueue.shift() ;
            await task() ;
        }finally{
            this.processLocationRunning = false ;
            //go to next task in queue
            this.processLocationChanges() ;
        }
    }


    /**
     * fire route enter event.
     * @private
     * @param {Object} location i.e.) history.location
     */
    async _change(location) {
        this.changeRenderQueue.push(async ()=>{
            // split on stack pattern
            // an url can have stack sub route like : 
            // /my/route/param/*()*/my/other/route
            // /my/route/param/*(*/my/other/route
            // /my/route/param/*)*/my/other/route
            // /my/route/param/*-*/my/other/route
            // /my/route/param/*_*/my/other/route
            const pathAndStack = this._parseRouteWithStackPattern(location.pathname);
            
            let renderId = ++this.renderId;
    
            for(let i=0; i<pathAndStack.length; i++){
                // path is the route path, stackOptions is the stack pattern options
                const stackItem = pathAndStack[i] ;
    
                const {path, stackOptions} = stackItem ;
                let level = 0 ;
                if(stackOptions){
                    level = stackOptions.level ;
                }
                this.currentLevel = level ;
    
                let stackPrefix;
                let stackParams;
                let stacker;
                if(stackOptions){
                    const indexSeparator = stackOptions.layout.indexOf("!") ;
                    stackParams = {level: stackOptions.level} ;
                    if(indexSeparator !== -1){
                        stackPrefix = stackOptions.layout.substring(0, indexSeparator) ;
                        const rawParams = stackOptions.layout.substring(indexSeparator+1) ;
                        for(let paramPair of rawParams.split(",")){
                            let [key, value] = paramPair.split("=") ;
                            value = decodeURIComponent(value) ;
                            if(value == null){
                                value = true ;
                            }
                            if(value === "false"){
                                value = false ;
                            }
                            if(!isNaN(value)){
                                value = Number(value) ;
                            }
                            if(value & value.trim){
                                value = value.trim() ;
                            }
                            stackParams[key.trim()] = value ;
                        }
                    }else{
                        stackPrefix = stackOptions.layout ;
                    }
                    stacker = RouterZ.getStacker(stackPrefix, stackParams, this) ;
                    if(!stacker){
                        console.warn(`No stacker found for prefix: ${stackPrefix}`) ;
                    }
                }
    
                //const isLast = (i === pathAndStack.length - 1 ) ;
    
                const route = this.getRoute(path);
    
                if (!route) {
                    await this._callListeners("noroute", { pathname: path, search: "", hash: "" }) ;
                    return;
                }
    
                const routeInstance = route.getInstance(level) ;
    
                stackItem.route = route ;
                stackItem.routeInstance = routeInstance ;
                stackItem.stackPrefix = stackPrefix ;
                stackItem.stacker = stacker ;
    
                if(this.currentStack){
                    const previousStackItem = this.currentStack[i] ;
                    if(previousStackItem){
                        const previousPath = previousStackItem.path ;
                        if(previousPath === path){
                            //same path as before
                            
                            if(JSON.stringify(previousStackItem.stackOptions) === JSON.stringify(stackOptions)){
                                //same stack options as before
                                // no need to re-route
                                route.updateRenderId(renderId, level) ;
                                continue;
                            }else{
                                //different stack options
                                if(previousStackItem.stackPrefix === stackPrefix){
                                    //same stacker, just update params
                                    stackItem.stacker = previousStackItem.stacker ;
                                    stacker = previousStackItem.stacker ;
                                    stacker.changeParams(stackParams) ;
                                    route.updateRenderId(renderId, level) ;
                                    continue;
                                }else{
                                    //different stacker, destroy to force full re-render
                                    await route.destroy(level) ;
                                }
                            }
                        }else if(previousStackItem.route === route){
                            //same route as before but different path (different params)
                            const data = this._parseLocation({ pathname: path, search: "", hash: "" }, route);
                            
                            routeInstance.view.route.params = data.params;
                            routeInstance.view.route.queries = data.queries;
                            routeInstance.view.route.hash = data.hash;
                            
                            route.updateRenderId(renderId, level) ;
                            
                            await routeInstance.view.refresh() ;
                            continue ;
                        }
                    }
                }
                
    
                
    
                const data = this._parseLocation({ pathname: path, search: "", hash: "" }, route);
    
                routeInstance.stacker = stacker ;
    
                await this._callListeners("before", data) ;
    
                await this._openRoute({route, renderId, params: data.params, queries: data.queries, hash: data.hash, stacker, level: stackOptions?.level??0}) ;
    
                await this._callListeners("after", data) ;
            }
    
            for(let r of this.routes){
                for(let level=0; level<r.instances.length; level++){
                    let instance = r.instances[level] ;
                    if(instance && instance.renderId && instance.renderId < renderId){
                        //this route was rendered before but not in the current routing, destroy it
                        await r.destroy(level) ;
                        this._callListeners("stackClosed", instance) ;
                    }
                }
            }
    
            this.currentStack = pathAndStack ;
        }) ;
        await this.processLocationChanges() ;
    }

    async _openRoute({route, renderId, params= {}, queries= {}, hash= "", stacker, openningParent = false, level=0}){
        let container = this.container ; // by default, we open in the default container
        
        let routeInstance = route.getInstance(level) ;
        if(route.parent){
            if(!stacker || !stacker?.inPlace){ // if there is a s//route.parent.url !== "/"){
                await this._openRoute({route: route.parent, renderId, stacker, openningParent: true, level}) ;
                container = route.parent.getInstance(level).view.querySelector("z-sub-view:not([hidden])") ;
                if(route.parent.view?.renderAborted){
                    // navigation aborted, stop rendering
                    return;
                }
                if(!container){
                   throw "The view container is not found. Did you forget to add <z-sub-view></z-sub-view> in the parent view "+route.parent.url+" ?" ;
                }
            }
        }

        if(stacker){
            container = await stacker.getContainer({parentContainer: container, route, level}) ;
        }

        container?.classList?.add("viewz-loading") ;
        
        if((routeInstance.renderId||-1) < renderId){
            // not yet rendered in this routing cycle
            if(!routeInstance.renderId){
                // not rendered at all
                routeInstance.view.close = (result)=>{
                    routeInstance.result = result;
                    this.closeStack({level, result}) ;
                }
                await routeInstance.render({ url: route.url, params, queries, hash, container}) ;
                await this.updateTitle({route, view: routeInstance.view, stacker, level}) ;
                this._callListeners("viewOpen", {route: route, routeInstance, view: routeInstance.view}) ;

            }else if(JSON.stringify(routeInstance.view.route.params) !== JSON.stringify(params)){
                //params changed, refresh the view
                routeInstance.view.route.params = params;
                routeInstance.view.route.queries = queries;
                routeInstance.view.route.hash = hash;
                await routeInstance.view.refresh() ;
            }
            // already rendered before, but in previous routing cycle, update render id
            routeInstance.renderId = renderId ;
        }
        if(!openningParent && route.routes){
            //check for default child route
            let defaultChildRoute = route.routes.find(r => r.defaultChild) ;
            if(defaultChildRoute){
                // there is a default child route, open it
                return await this._openRoute({route: defaultChildRoute, renderId, stacker, level}) ;
            }
        }
        container?.classList?.remove("viewz-loading") ;
    }

    async updateTitle({route, view, stacker, level}){
        let title = "" ;
        let viewTitle = route.title;
        if(view.title && typeof(view.title) === "string"){
            viewTitle = view.title ;
        }else if(view.title && typeof(view.title) === "function"){
            viewTitle = await view.title() ;
        }
        if(viewTitle){
            if(this.mainTitle){
                title = this.mainTitle +" - ";
            }
            title += viewTitle;
        }else{
            title = this.mainTitle
        }
        if(title){
            document.title = title ;
        }
        if(viewTitle){
            if(stacker && stacker.setTitle){
                try{
                    stacker.setTitle(viewTitle) ;
                }catch(err){
                    console.warn("Error sending title to view container", err) ;
                }
            }else if(route.parent){
                const parentInstance = route.parent.getInstance(level) ;
                if(parentInstance.view.setTitle){
                    parentInstance.view.setTitle(viewTitle) ;
                }
            }
        }
    }

    /**
     * if the path is a route, navigate to the route, else process as normal link
     * @param {String} path 
     */
    autoNavigate(path, target){
        const pathAndStack = this._parseRouteWithStackPattern(path);
        
        const isRoute = pathAndStack.every(p => { return this.getRoute(p.path) !== null ; }) ;
        if(!isRoute){ 
            if(target === "_blank"){
                window.open(path) ;
            }else{
                location.href = path ;
            }
        }else{
            if(target === "_blank"){
                window.open((this.base??"")+path) ;
            }else{
                this.navigateTo(path); 
            }
        }
    }

    /**
     * navigate to target location.
     * @param {String|Object} path e.g.) '/foo' or { pathname, search, hash }
     * @param {Boolean} force force to navigate even if path is the same as previous one.
     */
    async navigateTo(path, force = false) {
        let newPath = path ; 
        const location = this.getCurrentLocation() ;
        const stackRegex = new RegExp("^"+STACK_PATTERN_REGEX);
        if(stackRegex.test(path)){ //ex : "/**/newstack/route"
            //don't navigate to a new route, stack to current root
            let indexExistingStack = location.pathname.search(new RegExp(STACK_PATTERN_REGEX)) ;
            if(indexExistingStack === -1){
                //no existing stack, add stack
                newPath = location.pathname.replace(this.base??"", "") ;
                if(newPath.endsWith("/")){
                    newPath += path.substring(1) ;
                }else{
                    newPath += path ;
                }
            }else{
                //replace existing stack
                newPath = location.pathname.substring(0, indexExistingStack).replace(this.base??"", "") ;
                newPath += path ;
            }
        }else if(stackRegex.test("/"+path)){ //ex : "**/newstack/route"
            //don't navigate to a new route, add to the stack
            newPath = location.pathname.replace(this.base??"", "") ;
            if(newPath.endsWith("/")){
                newPath += path ;
            }else{
                newPath += "/"+path ;
            }
        }
        
        if (!force && location.pathname.replace(this.base??"", "") === newPath) {
            console.warn('same path is passed.');
            return;
        }

        
        this.historyPush((this.base??"")+newPath);
    }

    async openStack({type, options=null, path, returnView = false}){
        const currentLevel = this.currentLevel+1 ; 

        if(typeof(options) === "object"){
            options = Object.keys(options).map(k=>`${k}=${encodeURIComponent(options[k])}`).join(",") ;
        }

        this.navigateTo(`/*${type}${options?'!'+options:""}*${path}`); 
        if(returnView){
            return await new Promise(resolve=>{
                let viewListener = ({routeInstance})=>{
                    if(routeInstance.level === currentLevel){
                        resolve(routeInstance.view) ;
                        this.removeListener("viewOpen", viewListener) ;
                    }
                };
                this.addListener("viewOpen", viewListener);
            });
        }else{
            return await new Promise(resolve=>{
                let stackListener = (routeInstance)=>{
                    if(routeInstance.level === currentLevel){
                        resolve(routeInstance.result) ;
                        this.removeListener("stackClosed", stackListener) ;
                    }
                };
                this.addListener("stackClosed", stackListener);
            });
        }
    }


//     async back(result){
//         if(!(await this.closeStack(result))){
//         //not in stack, go back
//         this._lastResult = result;
//         this._history.back()
//         }
//     }
//     async forward(){
//         this._history.forward()
//     }

    getStackedRoutes() {
        const stack = [] ;
        const location = this.getCurrentLocation() ;
        const pathAndStack = this._parseRouteWithStackPattern(location.pathname);
        for(let i=0; i<pathAndStack.length; i++){
            // path is the route path, stackOptions is the stack pattern options
            const stackItem = pathAndStack[i] ;
            const {path, stackOptions} = stackItem ;
            let level = 0 ;
            if(stackOptions){
                level = stackOptions.level ;
            }
            const route = this.getRoute(path);
            const routeInstance = route.getInstance(level) ;
    
            stackItem.route = route ;
            stackItem.routeInstance = routeInstance ;
            stack.push(stackItem) ;
        }
        return stack ; 
    }

    async closeStack({level, result}= {}) {
        const location = this.getCurrentLocation() ;
        const stackRegex = new RegExp(STACK_PATTERN_REGEX, "g");
        const matches = [...location.pathname.matchAll(stackRegex)] ;
        if(!level && matches.length>0){
            //we are closing last stack
            level = matches.length ;
        }
        if(matches && matches.length>level-1){
            let indexExistingStack = matches[level-1].index ;
            if(indexExistingStack !== -1){
                let indexEnd = location.pathname.length;
                if(matches.length>level){
                    indexEnd = matches[level].index ;
                }
                let newPath = location.pathname.substring(0, indexExistingStack) + 
                    location.pathname.substring(indexEnd).replace(this.base??"", "") ;
                let stackPath = location.pathname.substring(location.pathname.indexOf("*/",indexExistingStack)+1, indexEnd) ;
                const route = this.getRoute(stackPath);
                const routeInstance = route.getInstance(level) ;
                routeInstance.result = result;
                this.historyPush((this.base??"")+newPath);
            }
        }
        return false;
    }

    async closeAllStack(result) {
        const location = this.getCurrentLocation() ;
        const stackRegex = new RegExp(STACK_PATTERN_REGEX, "g");
        const matches = [...location.pathname.matchAll(stackRegex)] ;
        if(matches && matches.length>0){
            let indexExistingStack = matches[0].index ;
            if(indexExistingStack !== -1){
                const newPath = location.pathname.substring(0, indexExistingStack).replace(this.base??"", "") ;
                this._lastResult = result;
                
                this.historyPush((this.base??"")+newPath);
            }
        }
    }

    historyPush(url){
        url = url.trim() ;
        if(!url){
            url = "/" ;
        }
        this._history.push(url);
    }
}

if(!customElements.get("z-view")){
    class ZViewComponent extends HTMLElement {
        constructor() {
            super();
            this.renderId = 0;
            this.router = ViewZ.routerz;
            document.addEventListener("routerz-created", ev=>{
                this.router = ev.detail ;
                if(this.isConnected){
                    this.render() ;
                }
            });
        }

        connectedCallback() {
            if(this.hasAttribute("z-path")){
                this.render() ;
            }
        }

        disconnectedCallback() {
            if(this.view){
                this.view.destroy() ;
                this.view = null;
            }
        }

        set openParams(params) {
            //console.log("set openParams", JSON.stringify(params)) ;
            this._openParams = params;
            this.render() ;
        }

        get openParams() {
            if(!this._openParams && this.hasAttribute("open-params")){
                try{
                    const strOpenParams = this.getAttribute("open-params") ;
                    if(strOpenParams && !/^\${.*}$/.test(strOpenParams)){
                        //if the open-params is not a template, parse it
                        this._openParams = JSON.parse(strOpenParams) ;
                    }
                }catch(err){
                    console.warn("Error parsing open-params attribute", err) ;  
                }
            }
            return this._openParams ;
        }

        async render(){
            this.rendering = true;
            try{
                const path = this.getAttribute("z-path");

                if(!path){
                    console.debug("[z-view] missing path")
                    this.view = null;
                    return;
                }

                //if the path contains not replaced ${variables}, stop here
                if(path.match(/\$\{(\w+)\}/)){
                    console.debug("[z-view] path contains $")
                    this.view = null;
                    return;
                }
                //if not router yet, stop here
                if(!this.router){
                    console.debug("[z-view] no router yet, wait for router")
                    this.view = null;
                    return;
                }

                const route = this.router.getRoute(path) ;
                if(!route){
                    console.warn("[z-view] no route found for "+path) ;
                }

                let data;
                if (this.openParams) {
                    //param given through property or attribute
                    data = { params: this.openParams };
                } else {
                    //get params in the path
                    data = this.router._parseLocation({ pathname: path, search: "", hash: "" }, route);
                }

                if(this.view && this.renderedPath === path && this.viewController){
                    //view already loaded, just refresh it
                    if(this.view.route.params !== data.params){
                        this.view.route.params = data.params ;
                        await this.viewController.refresh() ;
                    }
                }else{
                    this.container = document.createElement("DIV") ;
                    this.innerHTML = "";
                    this.appendChild(this.container) ;
                    
                    this.view = route.view.clone() ;
                    this.view.route = {url: path, params: data.params} ;
                    await this.view.render({container: this.container}) ;
                    this.dispatchEvent(new CustomEvent("viewOpen", {bubbles: true, detail : {view: this.view, route}})) ;

                    if(!this.isConnected){
                        //has been disconnected in the meantime
                        this.view.destroy() ;
                        this.view = null;
                    }
                }
            }finally{
                this.rendering = false;
            }
        }

        async getView(){
            if(this.rendering){
                return await new Promise(resolve=>{
                    this.addEventListener("viewOpen", ()=>{
                        resolve(this.viewController) ;
                    }, {once: true}) ;
                });
            }
            return this.view ;
        }

        static get observedAttributes() {
            return ["z-path", "open-params"];
        }

        attributeChangedCallback(name) {
            switch (name) {
                case 'z-path':
                case 'open-params':
                    this.render();
                break;

            }
        }
    }
    customElements.define("z-view", ZViewComponent);
}
