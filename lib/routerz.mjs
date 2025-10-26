//https://github.com/cam-inc/esr

import {pathToRegexp} from './vendor/path-to-regexp.mjs';
import { createBrowserHistory, createMemoryHistory, createHashHistory } from 'https://cdn.jsdelivr.net/npm/history@5.3.0/history.development.min.js';
import { ViewZ } from './viewz.mjs';
import * as binding from "./bindz.mjs" ;


const constants = {
  BROWSER: 'BROWSER',
  MEMORY: 'MEMORY',
  HASH: 'HASH'
};

// Regex to match stack pattern separators: /*X*/ where X is any character(s)
const STACK_PATTERN_REGEX = "/\\*([^*]*)\\*/";

// Copu from mout/array/forEach
const forEach = (arr, callback, thisObj) => {
  if (arr == null) {
    return;
  }
  let i = -1,
      len = arr.length;
  while (++i < len) {
    // we iterate over sparse items since there is no way to make it
    // work properly on IE 7-8. see #64
    if ( callback.call(thisObj, arr[i], i, arr) === false ) {
      break;
    }
  }
};

export class Router {
  /**
   * @param {String} type type of history object. this should be one of 'browser', 'memory' or 'hash'.
   */
  constructor(type = constants.BROWSER) {

    this.type = type;
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
      break;
    }

    /**
     * routing definitions.
     * @private
     * @type {Array}
     */
    this._routes = [];

    /**
     * function to stop listening for the changes.
     * to stop, just execute this function.
     * @private
     * @type {Function|null}
     */
    this._unlistener = null;

    /**
     * function that will be called on ahead of every routing.
     * @type {Function|null}
     */
    this._onBefore = null;

    /**
     * function that will be called on when no route
     * @type {Function|null}
     */
    this._onNoRoute = null;

    /**
     * function that will be called only once on ahead of routing.
     * @type {Function|null}
     */
    this._onBeforeOnce = null;

    /**
     * function that will be called on behind of every routing.
     * @type {Function|null}
     */
    this._onAfter = null;

    /**
     * function that will be called only once on behind of routing.
     * @type {Function|null}
     */
    this._onAfterOnce = null;

    /**
     * function that will be called when error happen.
     * @type {Function|null}
     */
    this._onError = null;
  }

  /**
   * start listening for changes to the current location.
   * @param {Boolean} autoExec to decide whether routing is executed with the current url.
   */
  start(autoExec = true) {
    this._unlistener = this._history.listen(({location, action}) => {
      this._change(location, action);
    });


    if (autoExec) {
      this._change(this.getCurrentLocation(), "");
    }
  }

  block(message){
    this._unblock = this._history.block((tx) => {
        //ask for confirmation
        if(window.confirm(message??"You have not saved modification, are you sure to leave ?")){
          this._unblock() ;
          tx.retry();
        }
    });
  }

  unblock(){
    if(this._unblock){
      this._unblock() ;
    }
  }

  /**
   * stop listening.
   */
  stop() {
    if (!this._unlistener) {
      return;
    }
    this._unlistener();
    this._unlistener = null;
  }

  /**
   * register a route.
   * @param {String} pattern express-like url pattern.
   * @param {Function} onEnter a function that will be executed when the route changes.
   * @param {Function} onBefore a function that will be executed before the route changes.
   * @param {Function} onAfter a function that will be executed after the route changes.
   * @return {Router}
   */
  on(pattern, onEnter, onBefore, onAfter) {
    const regexp = pathToRegexp(pattern);
    this._routes.push({
      pattern,
      regexp: regexp.regexp,
      keys: regexp.keys,
      onEnter,
      onBefore,
      onAfter
    });
    return this;
  }

  /**
   * register a function to hook just before routing.
   * this function is called on every routing.
   * @param {Function} func
   * @return {Router}
   */
  onBefore(func) {
    this._onBefore = func;
    return this;
  }

  /**
   * register a function to hook when no route
   * @param {Function} func
   * @return {Router}
   */
  onNoRoute(func) {
    this._onNoRoute = func;
    return this;
  }

  /**
   * register a function to hook just before routing.
   * this function is called before routing only once.
   * @param {Function} func
   * @return {Router}
   */
  onBeforeOnce(func) {
    this._onBeforeOnce = func;
    return this;
  }

  /**
   * register a function to hook just after routing.
   * this function is called on every routing.
   * @param {Function} func
   * @return {Router}
   */
  onAfter(func) {
    this._onAfter = func;
    return this;
  }

  /**
   * register a function to hook just after routing.
   * this function is called after routing only once.
   * @param {Function} func
   * @return {Router}
   */
  onAfterOnce(func) {
    this._onAfterOnce = func;
    return this;
  }
  
  /**
   * register a function to hook on error.
   * this function is called when error happen.
   * @param {Function} func
   * @return {Router}
   */
  onError(func) {
    this._onError = func;
    return this;
  }

  async back(result){
    if(!(await this.closeStack(result))){
      //not in stack, go back
      this._lastResult = result;
      this._history.back()
    }
  }
  async forward(){
    this._history.forward()
  }

  closeStack(result) {
    const location = this.getCurrentLocation() ;
    const stackRegex = new RegExp(STACK_PATTERN_REGEX, "g");
    const matches = [...location.pathname.matchAll(stackRegex)] ;
    if(matches && matches.length>0){
      let indexExistingStack = matches[matches.length-1].index ;
      if(indexExistingStack !== -1){
        const newPath = location.pathname.substring(0, indexExistingStack).replace(this.base??"", "") ;
        this._lastResult = result;
        return Promise
        .resolve()
        .then(() => {
          this.historyPush((this.base??"")+newPath);
          return true;
        });
      }
    }
    return false;
  }
  closeAllStack(result) {
    const location = this.getCurrentLocation() ;
    const stackRegex = new RegExp(STACK_PATTERN_REGEX, "g");
    const matches = [...location.pathname.matchAll(stackRegex)] ;
    if(matches && matches.length>0){
      let indexExistingStack = matches[0].index ;
      if(indexExistingStack !== -1){
        const newPath = location.pathname.substring(0, indexExistingStack).replace(this.base??"", "") ;
        this._lastResult = result;
        return Promise
        .resolve()
        .then(() => {
          this.historyPush((this.base??"")+newPath);
        });
      }
    }
  }

  /**
   * navigate to target location.
   * @param {String|Object} path e.g.) '/foo' or { pathname, search, hash }
   * @param {Boolean} force force to navigate even if path is the same as previous one.
   */
  navigateTo(path, force = false) {
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
    return Promise
      .resolve()
      .then(() => {
        if (!force && location.pathname.replace(this.base??"", "") === newPath) {
          console.warn('same path is passed.');
          return;
        }

        this.historyPush((this.base??"")+newPath);
      });
  }

  async openRoute({ route, openParams, openMode, openModeOptions }) {

    if(openMode){
      route = `/*${openMode}${openModeOptions?`!${openModeOptions}`:""}*${route}` ;
    }else if(this.base && !route.startsWith(this.base)){
      //if the route does not start with base, add base to the route
      route = (this.base??"")+route ;
    }

    const pathAndStack = this._parseRouteWithStackPattern(route);
    if (pathAndStack.length === 0) {
      throw `View not found for route ${route}`;
    }
    const { path, stackOptions } = pathAndStack[0];
    let routeDef = this.getRoute(path);
    if (!routeDef) {
      throw `View not found for route ${route}`;
    }

    let data;
    if (openParams) {
      data = { params: openParams };
    } else {
      data = this._parseLocation({ pathname: path, search: "", hash: "" }, this.getRoute(path));
    }

    
    return await new Promise(resolve => {
      (async ()=>{
        if(stackOptions){
          data.stackOptions = stackOptions;
          stackOptions.close = ()=>{
              resolve();
              view.destroy();
              if(view?.container?.destroy){
                  view?.container?.destroy() ;
              }
          }
        }
    
        const view = await routeDef.onEnter(data, null, true);
        view.closePopup = view.close = (data) => {
          resolve(data);
          view.destroy();
          if(view?.container?.destroy){
              view?.container?.destroy() ;
          }
        }
      })()
    });
  } 
  

  historyPush(url){
    this._history.push(url);
  }

  /**
   * if the path is a route, navigate to the route, else process as normal link
   * @param {String} path 
   */
  autoNavigate(path, target){
    const stackRegex = new RegExp(STACK_PATTERN_REGEX);
    let route = this.getRoute(((this.base??"")+path).replace(stackRegex, "/")) ;
    if(!route){ 
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
   * replace current location.
   * @param {String|Object} path e.g.) '/foo' or { pathname, search, hash }
   */
  replace(path) {
    return Promise
      .resolve()
      .then(() => {
        if (this.getCurrentLocation().pathname === path) {
          console.warn('same path is passed.');
          return;
        }

        this._history.replace((this.base??"")+path);
      });
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

  /**
   * hash version of `location.href`.
   * @param {String} pathname
   */
  createHref(pathname) {
    return this._history.createHref({
      pathname
    });
  }

  getRoute(path){
    let route;
    forEach(this._routes, r => {
      // eslint-disable-next-line no-extra-boolean-cast
      if (!!route) {
        return;
      }
      // eslint-disable-next-line no-extra-boolean-cast
      if (!!r.regexp.exec(path)) {
        route = r;
      }
    });
    return route;
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
    if (parts[0]) {
      routes.push({ path: parts[0].trim() });
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

  /**
   * fire route enter event.
   * @private
   * @param {Object} location i.e.) history.location
   * @param {String} action i.e.) history.action
   */
  async _change(location/*, action*/) {
    // split on stack pattern
    // an url can have stack sub route like : 
    // /my/route/param/*()*/my/other/route
    // /my/route/param/*(*/my/other/route
    // /my/route/param/*)*/my/other/route
    // /my/route/param/*-*/my/other/route
    // /my/route/param/*_*/my/other/route
    const pathAndStack = this._parseRouteWithStackPattern(location.pathname);

    for(let i=0; i<pathAndStack.length; i++){

      const {path, stackOptions} = pathAndStack[i] ;

      const isLast = (i === pathAndStack.length - 1 ) ;

      let route = this.getRoute(path);
      
  
      if (!route) {
        await Promise
        .resolve()
        .then(() => {// onBefore
          if (!this._onNoRoute) {
            return Promise.resolve();
          }
          return this._onNoRoute({ pathname: path, search: "", hash: "" });
        }) ;
        return;
      }
  
      const data = this._parseLocation({ pathname: path, search: "", hash: "" }, route);
      data.stackOptions = stackOptions ;
      data.stackResult = this._lastResult ;
      this._lastResult = null;
      data.isLast = isLast ;
  
      // whether the routing was canceled and replaced.
      let isReplaced = false;
      const replace = (path) => {
        isReplaced = true;
        this.replace(path);
      };
  
      await Promise
        .resolve()
        .then(() => {// onBeforeOnce
          if (!this._onBeforeOnce) {
            return Promise.resolve();
          }
          const onBeforeOnce = this._onBeforeOnce;
          this._onBeforeOnce = null;
          return onBeforeOnce(data);
        })
        .then(() => {// onBefore
          if (!this._onBefore) {
            return Promise.resolve();
          }
          return this._onBefore(data);
        })
        .then(() => {// route.onBefore
          if (!route.onBefore) {
            return Promise.resolve();
          }
          return route.onBefore(data, replace);
        })
        .then(() => {// route.onEnter
          if (isReplaced || !route.onEnter) {
            return Promise.resolve();
          }
          return route.onEnter(data);
        })
        .then(() => {// route.onAfter
          if (isReplaced || !route.onAfter) {
            return Promise.resolve();
          }
          return route.onAfter(data);
        })
        .then(() => {// onAfter
          if (isReplaced || !this._onAfter) {
            return Promise.resolve();
          }
          return this._onAfter(data);
        })
        .then(() => {// onAfterOnce
          if (isReplaced || !this._onAfterOnce) {
            return Promise.resolve();
          }
          const onAfterOnce = this._onAfterOnce;
          this._onAfterOnce = null;
          return onAfterOnce(data);
        })
        .catch(err => {
            if(this._onError){
              this._onError(err, route) ;
            }
          console.error("Error happen on routing", err);
        });
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
    const list = route.regexp.exec(location.pathname).slice(1);
    forEach(route.keys, (v, i) => {
      if(list[i] != null){
        params[v.name] = decodeURIComponent(list[i]);
      }
    });

    const queries = {};
    forEach(location.search.slice(1).split('&'), v => {
      if (!v) {
        return;
      }
      const pair = v.split('=');
      queries[pair[0]] = pair[1];
    });

    const hash = location.hash.slice(1);

    return {
      params,
      queries,
      hash,
      pathname: location.pathname
    };
  }

  getOpenRoute({route, view, searchInEmbedded}){
    return this.getOpenRoutes({route, view, searchInEmbedded})[0] ;
  }
  getOpenRoutes({route, view, searchInEmbedded}){
    let results = [] ;
    for(let stack of this.openRoutePath){
      for(let r of stack){
        if(
          (route && r.route?.route === route) ||
          (view && r.view?.viewId === view) 
        ){
          results.push(r) ;
        }
      }
    }
    if(searchInEmbedded){
      for(let embed of this.openedEmbedded){
        if(
          (route && embed.route?.route === route) ||
          (view && embed.viewController?.viewId === view) 
        ){
          results.push({
            route: embed.route,
            view: embed.viewController,
            embed,
          }) ;
        }
      }
    }
    return results ;
  }
}

Router.BROWSER = constants.BROWSER;
Router.MEMORY = constants.MEMORY;
Router.HASH = constants.HASH;

class ZSubViewComponent extends HTMLElement {
  constructor() {
    super();
  }
}
customElements.define("z-sub-view", ZSubViewComponent);


class ZViewComponent extends HTMLElement {
  constructor() {
    super();
    this.renderId = 0;
    this.router = window.routerz;
    document.addEventListener("routerz-created", ev=>{
      this.router = ev.detail ;
      if(this.isConnected){
        this.renderView() ;
      }
    })
  }

  connectedCallback() {
      if(this.hasAttribute("z-path")){
        this.renderView() ;
      }
  }

  disconnectedCallback() {
      if(this.viewController){
        this.viewController.destroy() ;
        this.viewController = null;
        const indexInRouter = this.router.openedEmbedded.indexOf(this) ;
        if(indexInRouter !== -1){
          this.router.openedEmbedded.splice(indexInRouter, 1) ;
        }
      }
  }

  set openParams(params) {
    //console.log("set openParams", JSON.stringify(params)) ;
    this._openParams = params;
    this.renderView() ;
  }

  get openParams() {
    if(!this._openParams && this.hasAttribute("open-params")){
      try{
        const strOpenParams = this.getAttribute("open-params") ;
        if(strOpenParams && !/^\${.*}$/.test(strOpenParams)){
          //if the open-params is not a template, parse it
          this._openParams = JSON.parse(strOpenParams) ;
        }
      }
      catch(err){
        console.warn("Error parsing open-params attribute", err) ;  
      }
    }
    return this._openParams ;
  }

  async prepareController(path) {
    //if the path contains not replaced ${variables}, stop here
    if(path.match(/\$\{(\w+)\}/)){
      console.log("prepareController contains $")
      this.viewController = null;
      return;
    }

    if(!this.router){
      console.log("prepareController no router")
      this.viewController = null;
      return;
    }
    if(this.router.base){
      path = this.router.base +path;
    }

    const route = this.router.allRoutes.find(r=>r.regexp.regexp.exec(path)) ;
    this.route = route;
    if (!route) {
      console.log("prepareController no route")
      this.viewController = null;
      return;
    }
    this.preparing = true;
    try{
      let data;
      if (this.openParams) {
        data = { params: this.openParams };
      } else {
        data = this.router._parseLocation({ pathname: path, search: "", hash: "" }, this.router.getRoute(path));
      }
      if(this.renderedPath === path && this.viewController){
        //view already loaded, just refresh it
        if(this.viewController.route.params !== data.params){
          this.viewController.route.params = data.params ;
          await this.viewController.refresh() ;
        }
      }else{
        this.renderedPath = path;
        this.container = document.createElement("DIV") ;
        //this.container.style.height = "100%" ;
        //this.container.style.width = "100%" ;
        this.innerHTML = "";
        this.appendChild(this.container) ;
        //console.log("prepareController append container ", JSON.stringify(data), this.container) ;
        this.viewController = await route.openEmbedded(data, this.container) ;
        if(!this.isConnected){
          //has been disconnected in the meantime
          this.viewController.destroy() ;
          this.viewController = null;
        }else{
          this.router.openedEmbedded.push(this) ;
        }
      }
    }finally{
      this.preparing = false;
    }
  }

  async getView(){
    if(this.preparing){
      return new Promise(resolve=>{
        this.addEventListener("viewOpen", ()=>{
          resolve(this.viewController) ;
        }, {once: true}) ;
      });
    }
    return this.viewController ;
  }

  async renderView(path = null) {
    if(!this.isConnected){ return ; }
    if(this.rendering){
      await new Promise((resolve, reject)=>{
        setTimeout(async ()=>{
          try{
            this.renderView(path);
            resolve();
          }catch(err){
            reject(err) ;
          }
        },5) ;
      });
      return;
    }
    this.rendering = true;
    try{
      if (!path) {
        path = this.getAttribute("z-path");
      }
      
      await this.prepareController(path);
      if (!this.viewController) {
        console.log("renderView clear innerHTML")
        this.innerHTML = "";
        return;
      }
  
      this.viewController.embedded = true;
    }finally{
      this.rendering = false;
    }
  }

  static get observedAttributes() {
    return ["z-path", "open-params"];
  }

  attributeChangedCallback(name) {
    switch (name) {
      case 'z-path':
      case 'open-params':
        this.renderView();
        break;

    }
  }
}
customElements.define("z-view", ZViewComponent);

async function updateTitle({route, view, router, viewContainer}){
    let title = "" ;
    let viewTitle = route.title;
    if(view.title && typeof(view.title) === "string"){
      viewTitle = view.title ;
    }else if(view.title && typeof(view.title) === "function"){
      viewTitle = await view.title() ;
    }
    if(viewTitle){
      if(router.mainTitle){
        title = router.mainTitle +" - ";
      }
      title += viewTitle;
    }else{
      title = router.mainTitle
    }
    if(title){
      document.title = title ;
    }
    if(viewTitle){
      if(viewContainer && viewContainer.setTitle){
        try{
          viewContainer.setTitle(viewTitle) ;
        }catch(err){
          console.warn("Error sending title to view container", err) ;
        }
      }else if(viewContainer && viewContainer.tagName === "Z-SUB-VIEW"){
        let titleContainer = document.querySelector(".z-view-title-container") ;
        if(titleContainer){
          titleContainer.innerHTML = viewTitle ;
        }
      }
    }
}


async function openRoute({route, execRoute, router, getRouteContainer, parentPath=[], level=0, openingParent=false, openingEmbedded=false}){
    if(!openingParent && route.subRoutes){
      const defaultRoute = route.subRoutes.find(r=>r.default) ;
      if(defaultRoute){
        //there is a default route, use it instead of its parent route
        return await defaultRoute.open(execRoute) ;
      }
    }

    const stackLevel = execRoute?.stackOptions?.level ?? 0 ;

    if(!router.openRoutePath[stackLevel]){
      router.openRoutePath[stackLevel] = [] ;
    }

    let openRoutePath = router.openRoutePath[stackLevel] ;
    for(let i=0; i<parentPath.length; i++){
        let parentRoute = parentPath[i];
        if(openRoutePath[i]?.route !== parentRoute){
            openRoutePath[i]?.view?.destroy() ;

            // the parent route is not open, open it
            await openRoute({route: parentRoute, router, getRouteContainer, execRoute: execRoute, parentPath: parentPath.slice(0, i), level: i, openingParent: true});
        }
    }

    let view;

    if(openRoutePath[parentPath.length] && openRoutePath[parentPath.length].route === route){
      // this route is already opened

      //do a refresh if it is the last route or if params changed
      if(execRoute.isLast || 
          JSON.stringify(execRoute.params) !== JSON.stringify(openRoutePath[parentPath.length].execRoute.params)
        ){
        //params changed or view is on top, refresh the view

        //update the route params values
        const viewRoute = openRoutePath[parentPath.length]?.view?.route ;
        if(viewRoute){
          const keys = Object.keys(execRoute.params) ;
          for(let k of keys){
            viewRoute.params[k] = execRoute.params[k] ;
          }
          viewRoute.stackResult = execRoute.stackResult ;
          for(let k of Object.keys(viewRoute.params)){
            if(!keys.includes(k)){
              delete this.data[k] ;
            }
          }
        }
        openRoutePath[parentPath.length]?.view?.refresh() ;
      }

      view = openRoutePath[parentPath.length]?.view;
      updateTitle({route, view, router})
    }else{
      //this route is not yet opened
      console.log("exec route", execRoute) ;
      let viewName = route.name;
      if(!viewName){
          viewName = route.path.replace(/\/$/, "").substring(route.path.lastIndexOf("/")+1);
      }
      // view = new ViewZ({
      //     html: `${route.path}/${viewName}.html`,
      //     css: `${route.path}/${viewName}.css`,
      //     js: `${route.path}/${viewName}.js`,
      //     id: route.id??`${route.path}/${viewName}`,
      //     router: router
      // });
      // view.docTransformer((doc)=>{
      //     let allLinks = Array.prototype.slice.apply(doc.querySelectorAll("a"));
      //     for(let a of allLinks){
      //       if(a.hasAttribute("href") && a.getAttribute("href").startsWith("/")){
      //           a.setAttribute("onclick", "window.routerz.autoNavigate('"+a.getAttribute("href")+"', this.getAttribute('target')); return false;") ;
      //           a.setAttribute("href", (router.base??"")+a.getAttribute("href")) ;
      //         }
      //     }
      // })
      view = route.createView() ;
  
      const container = getRouteContainer(execRoute);
      
  
      let ssr = false;
      if(container.hasAttribute("zz-ssr")){
        if(container.getAttribute("zz-ssr") === viewName){
          ssr= true;
        }
        container.removeAttribute("zz-ssr");
      }
      if(!openingEmbedded && execRoute.stackOptions == null && openRoutePath[level] && openRoutePath[level].route !== route){
          openRoutePath[level].view?.destroy() ;
      }
  
      if(!openingEmbedded){
        openRoutePath[level] = {route, execRoute, view, container} ;
      }


      let viewContainer = container ;
      if(level > 0 && !openingEmbedded){
          // must be rendered in the parent view
          viewContainer = openRoutePath[level-1].view.querySelector("z-sub-view") ;
          if(!viewContainer){
              throw "The view container is not found. Did you forget to add <z-sub-view></z-sub-view> in the parent view "+openRoutePath[level-1].route+" ?" ;
          }
      }

      await view.render({container: viewContainer, route: execRoute, ssr});

      updateTitle({route, view, router, viewContainer}) ;

      viewContainer.dispatchEvent(new CustomEvent("viewOpen", {bubbles: true, detail : {view}})) ;
      
    }


    if(!openingParent && !openingEmbedded){
        let closedRoutes = openRoutePath.splice(level+1) ;
        for(let closedRoute of closedRoutes){
            closedRoute?.view?.destroy() ;
        }
    }

    if(execRoute.isLast){
      //last route of the URL, close all stack above
      while(router.openRoutePath.length>stackLevel+1){
        //pop all routes of the stack
        let closedRoutes = router.openRoutePath.pop() ;
        for(let closedRoute of closedRoutes){
          //for each route, destroy it
          closedRoute?.view?.destroy() ;
          if(closedRoute?.container?.destroy){
            closedRoute?.container?.destroy() ;
          }
        }
      }
    }


    return view;
}

window.bindz = binding ;

export function createRouter({routes, mode, container, containerFactory, base}){
    const router = new Router(mode??Router.BROWSER) ;
    router.mainTitle = document.title ;
    window.routerz = router;
    if(!base && ((mode??Router.BROWSER) === Router.BROWSER)){
        //rebase the pathname if the document have <base> and base not given in options
        let baseEl = document.head.querySelector("base");
        if(baseEl){
            base = baseEl.getAttribute("href").replace(/\/$/, "") ;
        }
    }
    router.routes = routes;
    router.allRoutes = [];
    router.openedEmbedded = [];

    router.base = base;
    router.openRoutePath = [] ;   

    function registerRoute(route, parentPath=[], level=0){
        router.allRoutes.push(route) ;
        let fullRoute = route.route ;
        if(parentPath){
          fullRoute = parentPath.filter(p=>p.route !== "/").map(p=>p.route).concat([route.route]).join("/") ;
        }
        
        let pattern = ((base??"")+fullRoute).replace(/\/:(\w+)\?/g, "{/:$1}")
        route.regexp = pathToRegexp(pattern) ;
        route.open = async (execRoute, openContainer, openingEmbedded)=>{
          execRoute.setParams = (params)=>{
            let newPath = route.route ;
            for(let key of Object.keys(params)){
              newPath = newPath.replace(new RegExp("/:"+key+"\\?{0,1}"), "/"+params[key]) ;
            }
            newPath = newPath.replace(new RegExp("/:.*\\?"), "") ;
            router.navigateTo(router.getCurrentLocation().pathname.replace(router.base??"","").replace(execRoute.pathname.replace(router.base??"",""), newPath)) ;
          }
          function getRouteContainer(){
            if(execRoute.stackOptions == null){
              //not in stack, open in main container 
              return openContainer??container;
            }
            if(!containerFactory){
              console.warn("You must provide a container factory to handle stack options")
              return openContainer??container;
            }
            return containerFactory({route, execRoute, router, container: openContainer??container,  level, parentPath, openingEmbedded}) ;
          }
          return await openRoute({route, execRoute, router, container: openContainer??container, getRouteContainer, level, parentPath, openingEmbedded})
        }
        route.openEmbedded = async (execRoute, viewContainer)=>{
          let viewName = route.name;
          if(!viewName){
              viewName = route.path.replace(/\/$/, "").substring(route.path.lastIndexOf("/")+1);
          }
          const view = route.createView() ;
          await view.render({container: viewContainer, route: execRoute, ssr: false});

          viewContainer.dispatchEvent(new CustomEvent("viewOpen", {bubbles: true, detail : {view}})) ;
          return view;
        }
        route.createView = ()=>{
            //this route is not yet opened
            let viewName = route.name;
            if(!viewName){
                viewName = route.path.replace(/\/$/, "").substring(route.path.lastIndexOf("/")+1);
            }
            const view = new ViewZ({
                html: `${route.path}/${viewName}.html`,
                css: `${route.path}/${viewName}.css`,
                js: `${route.path}/${viewName}.js`,
                id: route.id??`${route.path}/${viewName}`,
                router: router
            });
            view.docTransformer((doc)=>{
                let allLinks = Array.prototype.slice.apply(doc.querySelectorAll("a"));
                for(let a of allLinks){
                  if(a.hasAttribute("href") && a.getAttribute("href").startsWith("/")){
                      a.setAttribute("onclick", "window.routerz.autoNavigate('"+a.getAttribute("href")+"', this.getAttribute('target')); return false;") ;
                      a.setAttribute("href", (router.base??"")+a.getAttribute("href")) ;
                    }
                }
            })
            return view
        }
        router.on(pattern, async (execRoute, openContainer, openingEmbedded)=>{
            console.log("exec route", execRoute) ;
            return await route.open(execRoute, openContainer, openingEmbedded) ;
        }) ; 
        

        if(route.subRoutes){
            for(let subRoute of route.subRoutes){
                registerRoute(subRoute, parentPath.concat([route]), level+1) ;
            }
        }
    }

    for(let route of routes){
        registerRoute(route) ;
    }
    document.dispatchEvent(new CustomEvent("routerz-created", {detail: router}))
    return router;
}

// export const router = new Router(Router.HASH);

