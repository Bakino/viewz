let idInc = 0;

/**
 * Substitutes a variable name in a JavaScript expression with a new value, but only in valid contexts.
 * The function handles various cases like property access, comparisons, and assignments while avoiding
 * replacements in invalid contexts (e.g., as part of another variable name or property access).
 * 
 * @param {string} expression - The JavaScript expression containing the variable to replace
 * @param {string} oldVar - The variable name to search for
 * @param {string} newVar - The replacement value
 * @returns {string} The expression with the variable replaced in appropriate contexts
 * 
 * @example
 * substituteVariable('item.property', 'item', 'list.items[0]')
 * // Returns: 'list.items[0].property'
 * 
 * @example
 * substituteVariable('someObject.item', 'item', 'list.items[0]')
 * // Returns: 'someObject.item' (no replacement as item is a property)
 * 
 * @example
 * substituteVariable('if(item > 0)', 'item', 'list.items[0]')
 * // Returns: 'if(list.items[0] > 0)'
 */
// function substituteVariableOld(expression, oldVar, newVar) {
//     // Escape special characters in oldVar for regex
//     const escapedVar = oldVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
//     // Regex that matches oldVar when it is:
//     // 1. At the start of expression or preceded by operator/space/parenthesis
//     // 2. Followed by operator, dot, space, parenthesis or end of expression
//     // But not when preceded by a dot (to avoid matching truc.item)
//     const regex = new RegExp(
//         `(?<!\\.)(?<![a-zA-Z0-9_])(${escapedVar})(?=[\\s.=><!()+\\-*/%,}\\]]|$)`,
//         'g'
//     );
    
//     return expression.replace(regex, newVar);
// }

function substituteVariable(expression, oldVar, newVar) {
    let result = '';
    let i = 0;
    const len = expression.length;
    const isVarChar = c => /[a-zA-Z0-9_]/.test(c);

    while (i < len) {
        // Check if potential match starts here
        if (
            expression.slice(i, i + oldVar.length) === oldVar &&
            (i === 0 || (!isVarChar(expression[i - 1]) && expression[i - 1] !== '.')) &&
            (i + oldVar.length === len || !isVarChar(expression[i + oldVar.length]))
        ) {
            result += newVar;
            i += oldVar.length;
        } else {
            result += expression[i];
            i++;
        }
    }

    return result;
}


function extractExpressions(str) {
    const results = [];
    let i = 0;
    while (i < str.length) {
        const start = str.indexOf('${', i);
        if (start === -1) break;

        let braceCount = 1;
        let end = start + 2;

        while (end < str.length && braceCount > 0) {
            if (str[end] === '{') {
                braceCount++;
            } else if (str[end] === '}') {
                braceCount--;
            }
            end++;
        }

        if (braceCount === 0) {
            const expression = str.slice(start + 2, end - 1).trim();
            results.push(expression);
            i = end;
        } else {
            // wrong syntax, no closing braces
            break;
        }
    }
    return results;
}

//TODO : similar with extractExpressions ? merge ?
function exprExtractor(expr){
    if(expr.indexOf("${") !== -1){
        //this is a complex expression, get each expressions to process them independently
        const parts = [] ;
        let isInExpr = false ;
        let isEscapedExpr = false ;
        let startedBraceCount = 0;
        let currentText = "" ;
        for(let i = 0; i<expr.length; i++){
            const c = expr[i] ;
            if(isInExpr){
                //I am in an expression
                if(c === "{"){
                    //start a brace inside the expression, next brace should not be taken as the end of the expression
                    startedBraceCount++;
                    currentText += c ;
                }else if(c === "}"){
                    //this is a end brace
                    if(startedBraceCount === 0){
                        //all inside brace are closed, this the end of the expression
                        if(isEscapedExpr){
                            //it is escaped expression, keep it as text without the escape
                            parts.push({
                                type: "text",
                                text: "&dollar;{"+currentText+"}"
                            }) ;
                        }else{
                            parts.push({
                                type: "expr",
                                text: currentText 
                            }) ;
                        }
                        currentText = "" ;
                        isInExpr = false;
                        isEscapedExpr = false;
                    }else{
                        //still have opened brace, close it
                        startedBraceCount-- ;
                        currentText += c ;
                    }
                }else{
                    //append to the current text
                    currentText += c ;
                }
            }else if(c === "$" && expr[i+1] === "{"){
                isEscapedExpr = expr[i-1] === "\\" ;
                i++ ;
                isInExpr = true ;
                startedBraceCount = 0;
                if(currentText){
                    if(isEscapedExpr){
                        //is escaped, remove the escape that is the last char
                        currentText = currentText.substring(0, currentText.length-1) ;
                    }
                    parts.push({
                        type: "text",
                        text: currentText 
                    }) ;
                    currentText = "" ;
                }
            }else{
                currentText += c ;
            }
        }
        if(currentText){
            parts.push({
                type: "text",
                text: currentText 
            }) ;
            currentText = "" ;
        }
        return parts ;
    }else{
        return [
            { type: "text", text: expr }
        ] ;
    }
}

function extractPaths(expression) {
    // Regular expression to capture access paths
    const regex = /(\b[a-zA-Z_]\w*(?:[\.\*]{1,}[a-zA-Z_]\w*)*)/g;
    const closureSplit = expression.split("=>") ;

    let allPaths = [] ;
    let closureVariable = null;
    for(let subSplit of closureSplit){

        // handle the form myvar.filter(v=>...)
        let indexParenthesis = subSplit.lastIndexOf("(") ;
        let subVar = null;
        if(indexParenthesis !== -1){
            //subVar is v
            subVar = subSplit.substring(indexParenthesis+1).trim() ;
            subSplit = subSplit.substring(0, indexParenthesis+1) ;
            //remove function
            subSplit = subSplit.replace(".filter(", "");
            subSplit = subSplit.replace(".find(", "");
            subSplit = subSplit.replace(".some(", "");
            subSplit = subSplit.replace(".every(", "");
    
            subSplit = subSplit.trim() ;
        }


        if(closureVariable){
            // I am inside the function, replace the variable by array name
            for(let [v, arrayName] of Object.entries(closureVariable)){
                subSplit = subSplit.replaceAll(v+".", arrayName+".*.")
            }
        }

        const paths = subSplit.replaceAll("?.", ".").match(regex) || [];
    
        // Filter results to ensure they are valid access paths
        allPaths = allPaths.concat(paths.filter(path => {
            // Exclude JavaScript keywords and other unwanted artifacts
            const jsKeywords = ['map', 'function', 'return', 'var', 'let', 'const', 'if', 'else', 'for', 'while'];
            return !jsKeywords.includes(path.split('.')[0]);
        }));

        if(subVar){
            // keep { v: myvar }
            closureVariable = {[subVar]: subSplit}
        }else{
            closureVariable = null;
        }
    }
    return allPaths ;
}

function hasWritableValue(obj) {
  while (obj) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, 'value');
    if (descriptor) {
      return descriptor.writable || descriptor.set !== undefined;
    }
    obj = Object.getPrototypeOf(obj);
  }
  return false;
}

function transformToVariableName(inputString) {
    // Replace any non-alphanumeric characters with an underscore
    let transformedString = inputString.replace(/\W+/g, '_');
    
    // Ensure the variable name doesn't start with a digit
    if (/^\d/.test(transformedString)) {
        transformedString = '_' + transformedString;
    }
    
    return transformedString;
}

//window.ALL_DATAZ = [] ;

/**
 * DataZ - A reactive data management class that observes changes to data objects
 * and notifies listeners when properties are modified.
 */
export class DataZ {
    /**
     * Creates a new DataZ instance
     * @param {Object} [data={}] - Initial data object to observe
     */
    constructor(data = {}) {
        this.originalData = data;
        this.flattenedData = new Map();
        this.listeners = new Map();
        this.observers = new Map() ;
        //window.ALL_DATAZ.push(this) ;
        this.data = this.observe(data);
    }

    /**
     * Adds a listener function to be called when a specific data path changes
     * @param {string} path - The data path to listen to (supports wildcards with *)
     * @param {Function} listener - Callback function to execute on change
     */
    addListener(path, listener) {
        let regexp = null;
        if(path.indexOf("*") >= 0){
            regexp = new RegExp(`^${path.replaceAll("*", "[^.]*")}$`);
        }
        let pathListener = this.listeners.get(path);
        if(!pathListener){
            pathListener = new Map();
            this.listeners.set(path, pathListener);
        }
        pathListener.set(listener, { path, regexp, listener });
    }

    /**
     * Removes a listener for a specific path
     * @param {string} path - The data path
     * @param {Function} listener - The listener function to remove
     */
    removeListener(path, listener) {
        const pathListeners = this.listeners.get(path);
        if(pathListeners){
            pathListeners.delete(listener);
        }
    }

    getListenersForPath(pathArray){
        const n = pathArray.length;
        const listeners = [] ;

        // There are 2^n possible combinations
        const total = 1 << n; // equivalent to Math.pow(2, n)
        if(total > this.listeners.size){
            //more possible combinations than all registered listener
            //it is more efficient to browse registered listeners
            const listenersPaths = this.listeners.keys() ;
            for(let listenerPath of listenersPaths){
                const listenerPathArray = listenerPath.split(".") ;
                if(listenerPathArray.length === n){
                    let listenerMatch = true;
                    for(let i=0; i<n; i++){
                        const listenerPathPart = listenerPathArray[i] ;
                        // use == on purpose because the pathArray may be a number        vv
                        const partIsEquals = listenerPathPart === "*" || listenerPathPart == pathArray[i]
                        if(!partIsEquals){
                            listenerMatch = false;
                            break;
                        }
                    }
                    if(listenerMatch){
                        const listenersOfPath = this.listeners.get(listenerPath) ;
                        for(let l of listenersOfPath.values()){
                            listeners.push(l) ;
                        }
                    }
                }
            }
            return listeners ;
        }

        for (let mask = 0; mask < total; mask++) {
            let variant = "";
            for (let i = 0; i < n; i++) {
                if(i>0){
                    variant += "."
                }
                // Check the bit at position i
                // If the bit is set, use '*', otherwise keep the original element
                if (mask & (1 << i)) {
                    variant += "*";
                } else {
                    variant += pathArray[i];
                }
            }

            const listenersOfPath = this.listeners.get(variant) ;
            if(listenersOfPath){
                for(let l of listenersOfPath.values()){
                    listeners.push(l) ;
                }
            }
        }

        return listeners ;

    }

    /**
     * Retrieves a value from the data using a dot-notation path
     * @param {string} path - Dot-notation path (e.g., "user.name")
     * @param {*} defaultValueIfNotExists - Default value to return if the path does not exist. Will automatically create the tree if needed
     * @returns {*} The value at the specified path
     */
    getValueFromPath(path, defaultValueIfNotExists = undefined) {
        if(path === ""){
            //access the root data
            return this.data ;
        }
        let value = this.flattenedData.get(path);
        if(value === undefined){
            // no direct access in flattened data, go to parent
            const lastDotIndex = path.lastIndexOf(".");
            if(lastDotIndex !== -1){
                const parentPath = path.substring(0, lastDotIndex);
                const parentValue = this.flattenedData.get(parentPath);
                if(parentValue && (parentValue.constructor === Object || parentValue.constructor === Array)){
                    // if the parent is an object, get the value from the parent
                    const property = path.substring(lastDotIndex+1);
                    value = parentValue[property];
                }
            }
        }
        if(value === undefined){
            // no value found, walk through the original data
            let data = this.data;
            const pathParts = path.split(".");
            for(let i=0; i<pathParts.length; i++){
                if(!data){ 
                    // no data, stop
                    return undefined ; 
                }
                let part = pathParts[i] ;
                const isArray = Array.isArray(data) ;
                if(isArray){
                    part = parseInt(part, 10);
                    if(isNaN(part)){
                        // invalid index, stop
                        return undefined ;
                    }
                }
                if(data[part] === undefined && defaultValueIfNotExists !== undefined){
                    // reach undefined value, default value is given, create the path
                    if(i<pathParts.length-1){
                        const nextPart = pathParts[i+1] ;
                        if(!isNaN(parseInt(nextPart, 10))){
                            // next part is an index, create a new array
                            data[part] = [] ;
                        }else{
                            // create an object
                            data[part] = {} ;
                        }
                    }else{
                        // last part, set the default value
                        data[part] = defaultValueIfNotExists ;
                    }
                }
                data = data[part];
            }
            return data;
        }
        return value;
    }

    setFlattenedData(propertyPathString, value){
        this.flattenedData.set(propertyPathString, value);
        const keys = this.flattenedData.keys();
        for(let key of keys){
            if(key.startsWith(propertyPathString) && key !== propertyPathString){
                this.flattenedData.delete(key);
            }
        }
    }

    removeFlattenedData(propertyPathString){
        if(this.flattenedData.has(propertyPathString)){
            this.flattenedData.delete(propertyPathString);
        }
        const keys = this.flattenedData.keys();
        for(let key of keys){
            if(key.startsWith(propertyPathString) && key !== propertyPathString){
                this.flattenedData.delete(key);
            }
        }
    }


    removeDataPath(item, pathToRemove){
        const allPathOfItem = item.__allLinkedDataPaths ;
        if(allPathOfItem){
            const pathToRemoveStr = pathToRemove.join(".") ;
            this.removeFlattenedData(pathToRemoveStr) ;
            for(let i=0; i<allPathOfItem.length; i++){
                const itemDataPath = allPathOfItem[i] ;
                if(itemDataPath.join(".") === pathToRemoveStr){
                    //this is the path to remove
                    //console.log("remove item path", itemDataPath.join(".")) ;
                    allPathOfItem.splice(i, 1) ;
                    i-- ;
                }
            }

            if(Array.isArray(item)){
                for(let i=0; i<item.length; i++){
                    if(item[i]){
                        let subItemPaths = item[i].__allLinkedDataPaths ;
                        if(subItemPaths){
                            this.removeDataPath(item[i], pathToRemove.concat([i])) ;
                        }
                    }
                }
            }else if(typeof(item) === "object" && item.constructor !== Date){
                for(let [k, v] of Object.entries(item)){
                    if(v){
                        let subItemPaths = v.__allLinkedDataPaths ;
                        if(subItemPaths){
                            this.removeDataPath(v, pathToRemove.concat([k])) ;
                        }
                    }
                }
            }
        }
    }

    updateItemDataPath(item, oldPath, newPath){
        //console.log("update item path from ", oldPath.join("."), "to", newPath.join(".")) ;
        item.__allLinkedDataPaths.splice(item.__allLinkedDataPaths.indexOf(oldPath), 1, newPath);
        const arrayStrPath = oldPath.join(".") ;
        this.removeFlattenedData(arrayStrPath) ;
        if(Array.isArray(item)){
            for(let i=0; i<item.length; i++){
                if(item[i]){
                    let subItemPaths = item[i].__allLinkedDataPaths ;
                    if(subItemPaths){
                        for(let itemDataPath of subItemPaths){
                            const itemStrPath = itemDataPath.join(".") ;
                            if(itemStrPath === arrayStrPath+"."+i){
                                this.updateItemDataPath(item[i], itemDataPath, newPath.concat([i])) ;
                            }
                        }
                    }
                }
            }
        }else if(typeof(item) === "object" && item.constructor !== Date){
            for(let [k, v] of Object.entries(item)){
                if(v){
                    let subItemPaths = v.__allLinkedDataPaths ;
                    if(subItemPaths){
                        for(let itemDataPath of subItemPaths){
                            const itemStrPath = itemDataPath.join(".") ;
                            if(itemStrPath === arrayStrPath+"."+k){
                                this.updateItemDataPath(v, itemDataPath, newPath.concat([k])) ;
                            }
                        }
                    }
                }
            }
        }
    }

    appendItemDataPath(item, newPath){
        //console.log("add item path ", newPath.join(".")) ;
        item.__allLinkedDataPaths.push(newPath);
        if(Array.isArray(item)){
            for(let i=0; i<item.length; i++){
                if(item[i]){
                    let subItemPaths = item[i].__allLinkedDataPaths ;
                    if(subItemPaths){
                        this.appendItemDataPath(item[i], newPath.concat([i])) ;
                    }
                }
            }
        }else if(typeof(item) === "object" && item.constructor !== Date){
            for(let [k, v] of Object.entries(item)){
                if(v){
                    let subItemPaths = v.__allLinkedDataPaths ;
                    if(subItemPaths){
                        this.appendItemDataPath(v, newPath.concat([k])) ;
                    }
                }
            }
        }
    }

    applySpliceOnProxy(proxiedData, startIndex, deleteCount, addedItems, updatedSiblings = []) {
        if(updatedSiblings.includes(proxiedData)){ return ; }
        updatedSiblings.push(proxiedData) ;

        // first for the item to remove, remove all their path that was relative to the array
        for(let i=startIndex; i<startIndex+deleteCount; i++){
            const removedItem = proxiedData[i] ;
            const itemPathsToRemove = [] ;
            for(let arrayDataPath of proxiedData.__allLinkedDataPaths){
                const arrayStrPath = arrayDataPath.join(".") ;
                for(let itemDataPath of removedItem.__allLinkedDataPaths){
                    const itemStrPath = itemDataPath.join(".") ;
                    if(itemStrPath === arrayStrPath+"."+i){
                        //this path is obsolete
                        itemPathsToRemove.push(itemDataPath) ;
                    }
                }
            }
            // remove after to avoid modifying the array while iterating
            while(itemPathsToRemove.length > 0){
                const pathToRemove = itemPathsToRemove.pop() ;
                //console.log("removed item path", pathToRemove.join(".")) ;
                removedItem.__allLinkedDataPaths.splice(removedItem.__allLinkedDataPaths.indexOf(pathToRemove), 1) ;
            }
        }

        // for the added items, it will be handled by the "set" handler

        //for the items that remains, update their id in their path relative to the array
        for(let i=startIndex+deleteCount; i<proxiedData.length; i++){
            // remaining items in the array after the delete
            const item = proxiedData[i] ;
            const newIndex = i - deleteCount + addedItems.length ;
            if(newIndex !== i){
                for(let arrayDataPath of proxiedData.__allLinkedDataPaths){
                    const arrayStrPath = arrayDataPath.join(".") ;
                    for(let itemDataPath of item.__allLinkedDataPaths){
                        const itemStrPath = itemDataPath.join(".") ;
                        if(itemStrPath === arrayStrPath+"."+i){
                            // update the last part of the path to the index
                            //console.log("update item path", itemStrPath, "to", arrayStrPath+"."+newIndex) ;
                            this.updateItemDataPath(item, itemDataPath, itemDataPath.slice(0, -1).concat([newIndex])) ;
                        }
                    }
                }

            }
        }
        // clean the flattened cache
        proxiedData.__dataZ.flattenedData.clear() ; //TODO: optimize this, only clear the paths that are affected by the splice
        
        for(let sibling of proxiedData.__siblings){
            const siblingRef = sibling;
            if(siblingRef){
                // apply the same splice on the sibling
                this.applySpliceOnProxy(siblingRef, startIndex, deleteCount, addedItems, updatedSiblings);
            }
        }
    }

    /**
     * Creates a proxy wrapper around data objects to observe changes
     * @param {*} data - The data to observe (Object or Array)
     * @param {string[]} [dataPath=[]] - Current path in the data structure
     * @returns {Proxy} Proxied data object that triggers listeners on changes
     */
    observe(data, dataPath = []) {
        if(data && this.observers.has(data)){
            // the same data is set again but was already observed, use the existing proxy
            data = this.observers.get(data) ;
        }

        //contains the other proxies of the same object that are observed by other DataZ instances
        const siblings = [] ;

        let sibling = null;
        
        if(data && data.__isProxy){
            //already observed
            if(data.__dataZ === this){
                //already observed by this DataZ instance, register new path
                this.appendItemDataPath(data, dataPath) ;
                return data ; 
            }else{
                //the data is observed by another instance

                //we register the sibling
                sibling = data;
                siblings.push(data) ;
               
                //reobserve it from original data
                data = data.__rawData ;
            }
        }
        if(data && 
        (   
            data.constructor === FileList || 
            data.constructor === File ||
            (data.constructor && data.constructor.name === "File") ||
            (data.constructor && data.constructor.name === "FileList")
            )
        
        ){
            // don't observe inside File instances
            return data;
        }

        const allLinkedDataPaths = [dataPath] ;
        let proxiedData = null; 

        const self = this;
        const changeHandler = {
            set: function(target, property, value/*, receiver*/) {
                
                let autobind = true;
                let withListener = true;

                let siblingsUpdated = [] ;
                let fromSibling = false;
                if(value !== undefined && value !== null && value.siblingsUpdated){
                    //came from a sibling proxy
                    if(value.siblingsUpdated.includes(proxiedData)){
                        //this value was already set by this proxy, do not update it again
                        return true;
                    }
                    siblingsUpdated = value.siblingsUpdated ;
                    if(value._dontAutoBind){
                        //given a value but explicitly ask to not bind
                        autobind = false;
                    }
                    if(value._noListener){
                        //given a value but explicitly ask to not call listeners
                        withListener = false;
                    }
                    value = value.value ;
                    fromSibling = true ;
                }else{
                    if(value !== undefined && value !== null && value._dontAutoBind){
                        //given a value but explicitly ask to not bind
                        autobind = false;
                    }
                    if(value !== undefined && value !== null && value._noListener){
                        //given a value but explicitly ask to not call listeners
                        withListener = false;
                    }
    
                    if(!autobind || !withListener){
                        value = value.value;
                    }
                }

                if(value && value.constructor === Date){
                    value = value.toISOString();
                }

                

                // Update a property value
                if(target[property] === value && property!=="length"){
                    if(!fromSibling){ // if from sibling, the value is already set, but we want to trigger the listeners
                        //no change
                        return true;
                    }
                }

                const oldValue = target[property];
                if(oldValue && oldValue !== value && oldValue.__isProxy){
                    // the old value is a proxy, remove its paths
                    for(let dataPath of allLinkedDataPaths){
                        self.removeDataPath(oldValue, dataPath.concat([property]));
                    }
                }

                for(let dataPath of allLinkedDataPaths){
                    const propertyPath = dataPath.concat([property]);
                    if(value && typeof(value) === "object"){
                        value = self.observe(value, propertyPath);
                        self.setFlattenedData(propertyPath.join("."), value) ;
                    }
                }
                
                target[property] = value;

                for(let siblingRef of siblings){
                    let valueSibling = { value, siblingsUpdated: siblingsUpdated.concat([proxiedData]) };
                    if(!autobind){
                        valueSibling._dontAutoBind = true ;
                    }
                    if(!withListener){
                        valueSibling._noListener = true ;
                    }
                    const sibling = siblingRef;
                    if(sibling){
                        sibling[property] = valueSibling ;
                    }
                }

                if(withListener){
                    for(let dataPath of allLinkedDataPaths){
                        const propertyPath = dataPath.concat([property]);
                        //console.log("set value for path", propertyPath.join("."), "to", value, self.data) ;
                        const fullPath = propertyPath.join(".");
                        const listenersForThisPath = self.getListenersForPath(propertyPath);
                        if(listenersForThisPath){
                            for(let listener of listenersForThisPath.values()){
                                let mustRun = true;
                                if(listener.regexp){
                                    mustRun = listener.regexp.test(fullPath);
                                //}else{ already test in getListenersForPath
                                //    mustRun = listener.path === fullPath;
                                }
                                if(mustRun){
                                    // notify listeners for the path
                                    try{
                                        listener.listener({oldValue, newValue: value, target: target, property, autobind});
                                    }catch(err){
                                        console.error("Error while run listener ", listener, err) ;
                                    }
                                }
                            }
                        }
                    }
                }
                return true;
            },
            get: (target, key) => {
                if(key === "__isProxy"){ return true ; }
                if(key === "__dataZ"){ return self ; }
                if(key === "__siblings"){ return siblings ; }
                if(key === "__allLinkedDataPaths"){ return allLinkedDataPaths ; }
                if(key === "__rawData"){ return data ; }
                if(key === "addListener"){ 
                    return function(propPath, listener){
                        self.addListener(dataPath.concat(propPath.split(".")).join("."), listener) ;
                    } ; 
                }
                if(key === "removeListener"){ 
                    return function(propPath, listener){
                        self.removeListener(dataPath.concat(propPath.split(".")).join("."), listener) ;
                    } ; 
                }
                if(key === "splice"){
                    return function(){
                        const startIndex = arguments[0];
                        const deleteCount = arguments[1];
                        const addedItems = Array.from(arguments).slice(2);

                        // apply splice on the proxy and its siblings
                        self.applySpliceOnProxy(proxiedData, startIndex, deleteCount, addedItems);                       

                        // perform the real splice
                        const result = Array.prototype.splice.apply(proxiedData, arguments);
                        
                        return result;
                    }
                }
                if(key === "unshift"){
                    return function(){

                        const addedItems = Array.from(arguments);

                       // for the added items, it will be handled by the "set" handler

                        //for the items that remains, update their id in their path relative to the array
                        for(let i=0; i<proxiedData.length; i++){
                            // remaining items in the array after the delete
                            const item = proxiedData[i] ;
                            const newIndex = i + addedItems.length ;
                            if(newIndex !== i){
                                for(let arrayDataPath of allLinkedDataPaths){
                                    const arrayStrPath = arrayDataPath.join(".") ;
                                    for(let itemDataPath of item.__allLinkedDataPaths){
                                        const itemStrPath = itemDataPath.join(".") ;
                                        if(itemStrPath === arrayStrPath+"."+i){
                                            // update the last part of the path to the index
                                            //console.log("update item path", itemStrPath, "to", arrayStrPath+"."+newIndex) ;
                                            self.updateItemDataPath(item, itemDataPath, itemDataPath.slice(0, -1).concat([newIndex])) ;
                                        }
                                    }
                                }

                            }
                        }

                        

                        // perform the real unshift
                        const result = Array.prototype.unshift.apply(proxiedData, arguments);
                        
                        // clean the flattened cache
                        self.flattenedData.clear() ; //TODO: optimize this, only clear the paths that are affected by the splice

                        return result;
                    }
                }
                if(key === "shift"){
                    return function(){

                        //for the items that remains, update their id in their path relative to the array
                        for(let i=1; i<proxiedData.length; i++){
                            // remaining items in the array after the delete
                            const item = proxiedData[i] ;
                            const newIndex = i - 1 ;
                            if(newIndex !== i){
                                for(let arrayDataPath of allLinkedDataPaths){
                                    const arrayStrPath = arrayDataPath.join(".") ;
                                    for(let itemDataPath of item.__allLinkedDataPaths){
                                        const itemStrPath = itemDataPath.join(".") ;
                                        if(itemStrPath === arrayStrPath+"."+i){
                                            // update the last part of the path to the index
                                            //console.log("update item path", itemStrPath, "to", arrayStrPath+"."+newIndex) ;
                                            self.updateItemDataPath(item, itemDataPath, itemDataPath.slice(0, -1).concat([newIndex])) ;
                                        }
                                    }
                                }

                            }
                        }

                        

                        // perform the real unshift
                        const result = Array.prototype.shift.apply(proxiedData, arguments);
                        
                        
                        return result;
                    }
                }
                return target[key];
            }
        }
        proxiedData = new Proxy(data, changeHandler);
        if(sibling){
            // we have a sibling, we register ourself in its siblings
            sibling.__siblings.push(proxiedData);
        }
        self.observers.set(data, proxiedData) ;
        if(!Array.isArray(data)){
            for(let [k, v] of Object.entries(data)){
                if(v && typeof(v) === "object" && v.constructor !== Date){
                    const observedData = this.observe(v, dataPath.concat([k]));
                    data[k] = observedData ;
                    self.setFlattenedData(dataPath.concat([k]).join("."), data[k]) ;
                }
            }
        }else{
            for(let i=0; i<data.length; i++){
                if(data[i] && typeof(data[i]) === "object" && data[i].constructor !== Date){
                    const dataPathWithIndex = dataPath.concat([i]);
                    const observedData = this.observe(data[i], dataPathWithIndex) ;
                    data[i] = observedData ;
                    self.setFlattenedData(dataPathWithIndex.join("."), data[i]);
                }
            }
        }
        

        return proxiedData ;
    }
}

/**
 * Map to cache compiled expressions for performance optimization
 * @type {Map<string, Function>}
 */
const CACHE_EXPRESSIONS = new Map();

/**
 * BindZ - Main binding class that handles two-way data binding between DOM elements and data
 */
export class BindZ {
    /**
     * Creates a new BindZ instance
     * @param {HTMLElement} node - The DOM node to bind
     * @param {Object|DataZ} [data={}] - Data object or DataZ instance
     * @param {Object} [context={}] - Additional context variables
     * @param {Object} [variablesPath={}] - Variable path mappings
     */
    constructor(node, data = {}, context = {}, variablesPath= {}) {
        this.node = node;
        node.bindz = this;
        if(data instanceof DataZ){
            this.data = data
        }else{
            this.data = new DataZ(data);
        }
        this.bindings = [];
        this.repeaters = [];
        this.eventListeners = [];
        this.hidings = [];
        this.variablesPath = variablesPath;
        this.invertedVariablesPath = {} ;
        for(let [k, p] of Object.entries(this.variablesPath)){
            this.invertedVariablesPath[p] = k ;
        }
        this.context = context;
        this.started = false;
        this.prepared = false;
        delete node.zzBindAnalyzed ;
    }

    /**
     * Destroys the BindZ instance and cleans up references
     */
    destroy(){
        this.stopBinding() ;
        delete this.node.zzBindAnalyzed;
        for(let hiding of this.hidings){
            hiding.hider.destroy() ;
        }
        for(let repeater of this.repeaters){
            repeater.repeater.destroy() ;
        }
    }

    updateContext(context, variablesPath){
        //console.log("UPDATE CONTEXT BINDZ", this.node, context, variablesPath) ;
        this.context = {...this.context, ...context };
        this.variablesPath = {...this.variablesPath, ...variablesPath };
        this.invertedVariablesPath = {} ;
        for(let [k, p] of Object.entries(this.variablesPath)){
            this.invertedVariablesPath[p] = k ;
        }
        const contextKeys = Object.keys(this.context);
        for(let key of contextKeys){
            for(let binding of this.bindings){
                if(binding.bindAtt.includes(key)){
                    this.bindValue(binding);
                }
            }
        }
        for(let r of this.repeaters){
            r.repeater.updateContext(context, variablesPath) ;
        }
        for(let h of this.hidings){
            h.hider.updateContext(context, variablesPath) ;
        }
    }

    
    /**
     * Starts the data binding process
     */
    startBinding() {
        this.prepare();
        if(this.started){ return; }
        //console.log("START BINDING ON ", this.node) ;
        this.started = true;
        for(let hiding of this.hidings){
            hiding.hider.start() ;
        }
        for(let repeater of this.repeaters){
            repeater.repeater.start() ;
        }
        // start the binding process
        for(let i=this.bindings.length-1; i>=0; i--){
            const binding = this.bindings[i];
            // prepare the binding to listen to changes
            this.prepareBinding(binding);
            this.bindValue(binding);
        }
        for(let i=0; i<this.eventListeners.length; i++){
            const event = this.eventListeners[i];
            this.registerEventListener(event);
        }
        
    }

    bindAll() {
        for(let hiding of this.hidings){
            hiding.hider.updateVisibility() ;
        }
        for(let repeater of this.repeaters){
            repeater.repeater.updateItems() ;
        }
        for(let i=this.bindings.length-1; i>=0; i--){
            const binding = this.bindings[i];
            this.bindValue(binding);
        }
    }

    /**
     * Stops the data binding process
     */
    stopBinding(){
        if(!this.started){ return; }
        this.started = false;
        //console.log("STOP BINDING ON ", this.node) ;
        // stop the binding process
        for(let binding of this.bindings){
            // remove the listeners
            for(let listener of binding.listeners){
                this.data.removeListener(listener.path, listener.listener);
            }
        }
        for(let hiding of this.hidings){
            hiding.hider.stop() ;
        }
        for(let repeater of this.repeaters){
            repeater.repeater.stop() ;
        }
    }

    /**
     * Prepares the binding by analyzing the DOM tree
     */
    prepare() {
        if(this.prepared){ return; }
        this.prepared = true;
        if(this.analyzeNode(this.node)){
            //if the root element is not a stop node, traverse its children
            this.traverse(this.node);
        }
    }

    /**
     * Recursively traverses DOM nodes to find binding directives
     * @param {HTMLElement} parent - Parent element to traverse
     */
    traverse(parent){
        for(let i=0; i<parent.childNodes.length; i++){
            const node = parent.childNodes[i];
            let continueTraversal = this.analyzeNode(node);
            if(continueTraversal && node.childNodes && node.childNodes.length > 0){
                //continue traversal if the node is not a stop node
                this.traverse(node);
            }
        }
    }

    /**
     * Finds an element by ID within the bound node tree
     * @param {string} id - Element ID to find
     * @returns {HTMLElement|null} Found element or null
     */
    getElementById(id){
        if(this.node.id === id){
            return this.node;
        }
        return this.node.querySelector("#"+id.replaceAll("$", "\\$").replaceAll("{", "\\{").replaceAll(".", "\\.").replaceAll("}", "\\}"));
    }

    /**
     * Gets the current state of all bindings for serialization
     * @returns {Object} Serializable state object
     */
    getState(){

        let bindings = [] ;
        for(let binding of this.bindings){
            if(!binding.node.id){
                binding.node.id = "node_"+(idInc++);
            }
            bindings.push({nodeId: binding.node.id, bindAtt: binding.bindAtt, bindProp: binding.bindProp}) ;
        }
        let hidings = []
        for(let hiding of this.hidings){
            if(!hiding.node.id){
                hiding.node.id = "node_"+(idInc++);
            }
            //put back the hider node
            hiding.hider.placeholder.replaceWith(hiding.node) ;
            hidings.push({
                nodeId: hiding.node.id,
                hideIfCondition: hiding.hideIfCondition, 
                hiderState: hiding.hider.getState()
            }) ;
        }

        let repeaters = []
        for(let repeater of this.repeaters){
            if(!repeater.node.id){
                repeater.node.id = "node_"+(idInc++);
            }

            repeater.repeater.placeholder.replaceWith(repeater.node) ;

            repeaters.push({
                nodeId: repeater.node.id,
                bindAtt: repeater.repeater.bindAtt,
                repeaterState: repeater.repeater.getState()
            })
        }
        
        for(let event of this.eventListeners){
            if(!event.node.id){
                event.node.id = "node_"+(idInc++);
            }
            event.nodeId = event.node.id;
            delete event.node;
        }
        return {bindings, repeaters, hidings, eventListeners: this.eventListeners }
    }

    /**
     * Restores binding state from a serialized state object
     * @param {Object} state - Previously serialized state
     */
    prepareFromState(state){
        for(let binding of state.bindings){
            this.bindings.push({
                node: this.getElementById(binding.nodeId),
                bindAtt: binding.bindAtt,
                bindProp: binding.bindProp
            })
        }
        for(let hiding of state.hidings){
            const hiderId = "hider-"+idInc++;
            const placeholder = document.createComment(hiderId+"-placeholder for "+hiding.hideIfCondition);

            const node = this.getElementById(hiding.nodeId);
            //node.replaceWith(placeholder);
            const hider = new Hider(node, hiding.hideIfCondition, this.data, placeholder, this.context, this.variablesPath) ;
            this.hidings.push({
                node: node,
                hideIfCondition: hiding.hideIfCondition, 
                hider: hider
            });
            hider.prepareFromState(hiding.hiderState) ;
        }

        for(let repeater of state.repeaters){
            const repeaterId = "repeater-"+idInc++;
            const placeholder = document.createComment(repeaterId+"-placeholder for "+repeater.bindAtt);
            const node = this.getElementById(repeater.nodeId);
            node.replaceWith(placeholder);

            const repeaterInstance = new Repeater(node, repeater.bindAtt, this.data, placeholder, this.context, this.variablesPath);
            this.repeaters.push({node, repeater: repeaterInstance});
            repeaterInstance.prepareFromState(repeater.repeaterState) ;
        }
        for(let eventListener of state.eventListeners){
            this.eventListeners.push({...eventListener})
        }
        
        for(let event of this.eventListeners){
            event.node = this.getElementById(event.nodeId);
        }
        this.prepared = true;
    }

    /**
     * Analyzes a DOM node for binding directives and creates appropriate handlers
     * @param {Node} node - DOM node to analyze
     * @returns {boolean} Whether to continue traversing child nodes
     */
    analyzeNode(node) {
        if(node.zzBindAnalyzed){
            //already analyzed (can happen when automatically add node in analyze)
            return false;
        }
        node.zzBindAnalyzed = true;
        if(node.nodeType === Node.ELEMENT_NODE){
            //analyze element
            const bindAtt = node.getAttribute("z-bind");
            const isRepeater = bindAtt && /\s+of\s+/.test(bindAtt);
            if( !isRepeater &&
                (node.hasAttribute("z-hide-if") || node.hasAttribute("z-show-if"))){
                //this is a hide/show conditional node
                let hideIfCondition;
                if(node.hasAttribute("z-hide-if")){
                    hideIfCondition = node.getAttribute("z-hide-if");
                }else if(node.hasAttribute("z-show-if")){
                    hideIfCondition = "!(" + node.getAttribute("z-show-if") + ")";
                }
                const hiderId = "hider-"+idInc++;
                const placeholder = document.createComment(hiderId+"-placeholder for "+hideIfCondition);
                //node.replaceWith(placeholder);
                const hider = new Hider(node, hideIfCondition, this.data, placeholder, this.context, this.variablesPath) ;
                this.hidings.push({node, hideIfCondition, hider});
                hider.prepare() ;
                return false; //stop traversal for this node
            } else if(node.hasAttribute("z-bind")){
                if(isRepeater){
                    //this is a repeater
                    const repeaterId = "repeater-"+idInc++;
                    const placeholder = document.createComment(repeaterId+"-placeholder for "+bindAtt);
                    node.replaceWith(placeholder);
                    const repeater = new Repeater(node, bindAtt, this.data, placeholder, this.context, this.variablesPath) ;
                    this.repeaters.push({node, repeater});
                    repeater.prepare() ;
                    return false; //stop traversal for this node
                }else{
                    //this is a binding of the node value
                    // ex <input z-bind="name">
                    this.bindings.push({node, bindAtt, bindProp: "_value"});
                }
            }
            const attributes = node.attributes;
            for(let a = 0; a < attributes.length; a++){
                const att = attributes[a];
                if(att.value.startsWith("literal(")){
                    // this node contains a literal value using binding syntax inside
                    // ex <input placeholder="literal(Label expression. Ex: [${code}] ${name})">
                    // remove the literal() part and don't register it as a binding
                    att.value = att.value.replace(/^literal\(/, "").replace(/\)\s*$/, "");
                }else if(att.name === "z-class" || att.name === "z-style"){
                    // this node has a class or style binding
                    // ex <div z-class="${className}"> or <div z-style="${style}">
                    this.bindings.push({node, bindAtt:att.value, bindProp: att.name});
                }else if(att.value.indexOf("${") !== -1){
                    // this node contains a binding expression
                    // ex <input placeholder="${name}">
                    // or <input placeholder="${name} ${surname}">
                    this.bindings.push({node, bindAtt:att.value, bindProp: att.name});
                    if(att.name === "src"){
                        // if it is an image, set a 1x1 transparent pixel as src to avoid loading the src before binding
                        node.setAttribute("src", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=") ;
                    }
                }
                if(att.name.indexOf("z-on") === 0){
                    // this node has an event handler
                    // ex <button z-on-click="handleClick">
                    const eventName = att.name.substring("z-on-".length).split("-").map((v, i)=>{
                        if(i>0){
                            return v.substring(0,1).toUpperCase()+v.substring(1);
                        }else{
                            return v;
                        }
                    }).join("");
                    this.eventListeners.push({
                        event: eventName, node, expression: att.value
                    })
                }
            }
            
        }else if(node.nodeType === Node.TEXT_NODE){
            const text = node.textContent;
            const indexKeyword = text.indexOf("${");
            if(indexKeyword !== -1){
                //it is a text node that contains expressions ${...}
                const parts = exprExtractor(text);
                for(let part of parts){
                    let nodePart;
                    if(part.type === "text"){
                        // normal text, keep as is
                        nodePart = document.createTextNode(part.text);
                    }else{
                        // expression part
                        let formatPrefixes = Object.keys(FORMATTERS);
                        for(let prefix of formatPrefixes){
                            if(part.text.startsWith(prefix)){
                                // match a formatter, let the formatter create the element to format
                                const formatter = FORMATTERS[prefix];
                                try{
                                    nodePart = formatter.createElement(part.text);
                                }catch(err){
                                    console.error("Error while creating formatter element "+part.text, err);
                                    nodePart = document.createElement("span");
                                    nodePart.style.color = "red";
                                    nodePart.innerHTML = "Error formatting "+part.text+" : "+err;
                                }
                            }
                        }
                        if(!nodePart){
                            //no formatter, use basic span
                            nodePart = document.createElement("span");
                            nodePart.setAttribute("z-inner-text", "${"+part.text+"}");
                        }                            
                    }
                    node.parentElement.insertBefore(nodePart, node);
                    this.analyzeNode(nodePart);
                }
                node.remove();
            }
        }
        if(node !== this.node && (node.tagName === "Z-SUB-VIEW" || node.tagName === "Z-VIEW")){
            // don't traverse sub-views or views, they will be handled separately
            return false;
        }
        return true; //continue traversal;
    }

    /**
     * Registers an event listener on a DOM element
     * @param {Object} event - Event configuration object
     */
    registerEventListener(event){ 
        if(event.registered){ return;}
        event.registered = true;
        const eventName = event.event;
        const el = event.node;
        const handlerDefinition = event.expression;
        
        const runEv = (ev, evContext= {})=>{
            // run the event handler
            return this.runExpression(handlerDefinition, el, false, {event: ev, ...evContext});
        }
        if(eventName === "enter"){
            el.addEventListener("keyup", (ev)=>{
                if(ev.keyCode === 13){
                    runEv(ev);
                }
            });
        }else if(eventName === "escape"){
            el.addEventListener("keyup", (ev)=>{
                if(ev.keyCode === 27){
                    runEv(ev);
                }
            });
        }else if(eventName === "click" && el.hasAttribute("z-prevent-double-click")){
            el.addEventListener(eventName, (function (ev) {
                //event is click and detail is > 1, it is a second or third click, don't trigger event don't emit twice on double click
                if(eventName === "click" && ev.detail>1){ 
                    return; 
                }
                setTimeout(()=>{
                    runEv.bind(this)(ev);
                    if(el.tagName === "BUTTON"){
                        el.disabled = true;
                        setTimeout(() => { el.disabled = false; }, 1000);
                    }
                }, 1);
            }));
        }else{
            el.addEventListener(eventName, runEv);
        }
    }

    /**
     * Executes a JavaScript expression in the context of the binding
     * @param {string} expression - JavaScript expression to execute
     * @param {HTMLElement} [bindObj=null] - Element context for 'this'
     * @param {boolean} [isStringExpression=false] - Whether to treat as template string
     * @param {Object} [localContext={}] - Additional local variables
     * @returns {*} Result of expression execution
     */
    runExpression(expression, bindObj=null, isStringExpression = false, localContext = {}) {
        
        // prepare the function arguments
        const funcArgs = {};
        const argsKeys = ["data"];
        const argsValues = [this.data.data];
        
        let funcCacheKey = "";

        const dataKeys = Object.keys(this.data.originalData);
        for(let k of dataKeys){
            const variableName = transformToVariableName(k);
            funcArgs[variableName] = this.data.data[k];
            argsKeys.push(variableName);
            argsValues.push(this.data.data[k])
            funcCacheKey += "_"+variableName;
        }
        const thisContextKeys = Object.keys(this.context);
        for(let k of thisContextKeys){
            funcArgs[k] = this.context[k];
            argsKeys.push(k);
            argsValues.push(this.context[k])
            funcCacheKey += "_"+k;
        }
        const localContextKeys = Object.keys(localContext);
        for(let k of localContextKeys){
            funcArgs[k] = localContext[k];
            argsKeys.push(k);
            argsValues.push(localContext[k])
            funcCacheKey += "_"+k;
        }
        
        funcCacheKey += "_"+expression;
        let func = CACHE_EXPRESSIONS.get(funcCacheKey);
        if(!func){
            //create a new function from the expression
            
            try{
                //replace syntax foo.1 by foo[1]
                expression = expression.replace(/\.(\d+)(?=\.|$|\s|[),}])/g, '[$1]');
                if(isStringExpression){
                    // if the expression is a string, we need to create a function that returns the string
                    func = new Function(...argsKeys, "return `" + expression + "`");
                }else{
                    // if the expression is not a string, we create a function that returns the value
                    if(expression.indexOf("\n") === -1 && expression.indexOf("return ") === -1){
                        expression = "return "+expression;
                    }
                    // replace syntax ${foo.bar} by foo.bar
                    expression = expression.replace(/\$\{([^}]+)\}/g, '$1');

                    // replace special keyword arguments by the argsKeys
                    //expression.replace("arguments", argsKeys.join(", "));
                    func = new Function(...argsKeys, expression);
                }
                CACHE_EXPRESSIONS.set(funcCacheKey, func);
            }catch(err){
                console.error("Error when compile function "+expression+" with args ",argsKeys, err);
                //throw err;
                return null;
            }
        }
        try{
            let result = func.apply(bindObj, argsValues);
            if(result === "false"){ result = false ; }
            if(result === "true"){ result = true ; }
            return result;
        }catch(err){
            console.error("Error when run function "+expression+" with args ",argsKeys,argsValues, err);
            //throw err;
            return null;
        }
    }

    /**
     * Substitutes variable placeholders with their actual paths
     * @param {string} str - String containing variable placeholders
     * @returns {string} String with substituted variables
     */
    substituteVariables(str){
        const keys = Object.keys(this.variablesPath);
        for(let variable of keys){
            const realPath = this.variablesPath[variable];
            str = substituteVariable(str, variable, realPath);
        }
        return str;
    }

    /**
     * Gets a value from the data using a path, with variable substitution
     * @param {string} path - Data path
     * @param {*} defaultValueIfNotExists - Default value to return if the path does not exist. Will automatically create the tree if needed
     * @returns {*} Value at the specified path
     */
    getValueFromPath(path, defaultValueIfNotExists=undefined){
        if(this.context[path] !== undefined){
            return this.context[path] ;
        }
        return this.data.getValueFromPath(this.substituteVariables(path), defaultValueIfNotExists);
    }

    /**
     * Updates a DOM element with the current value from its binding
     * @param {Object} binding - Binding configuration object
     */
    bindValue(binding) {
        const elementToBind = binding.node;
        let att = binding.bindProp
        const bindExpression = binding.bindAtt;
        if(att === "_value"){
            // in _value case, the bindExpression is a straight path to the data
            let valueToBind = this.getValueFromPath(bindExpression);
            if(binding.lastValue === valueToBind){ return; }
            binding.lastValue = valueToBind;
            let changed = false;
            //if(elementToBind.tagName && elementToBind.tagName === "INPUT" && elementToBind.type === "checkbox"){
            if(elementToBind instanceof HTMLInputElement && elementToBind.type === "checkbox"){
                //special case of checkbox, affect the value to the checked property
                //if(elementToBind.checked != valueToBind){
                    changed = true;
                    elementToBind.checked = valueToBind;
                //}
            //}else if(elementToBind.tagName === "INPUT" && elementToBind.type === "radio"){
            }else if(elementToBind instanceof HTMLInputElement && elementToBind.type === "radio"){
                //special case of radio buttons, set checked property if the value matches the radio value
                //if(elementToBind.checked != (elementToBind.value == valueToBind)){
                    changed = true;
                    elementToBind.checked = elementToBind.value == valueToBind;
                //}
            }else if(hasWritableValue(elementToBind)){
                //if the element has a writable value, use it
                if(valueToBind === undefined || valueToBind === null){
                    //the value is undefined or null
                    if(["INPUT", "TEXTAREA"].includes(elementToBind.tagName)){
                        // text field, set the value to empty string
                        valueToBind = "";
                    }
                }
                //if(elementToBind.value !== valueToBind){
                    //the value changed, set the new value
                    changed = true;
                    elementToBind.value = valueToBind;
                //}
            }else{
                //if the element does not have a writable value, use the innerHTML
                if(valueToBind === undefined || valueToBind === null){
                    //the value is undefined or null
                    valueToBind = "";
                }else{
                    valueToBind = ""+valueToBind;
                }
                //if(elementToBind.innerHTML !== valueToBind){
                //    changed = true ;
                 //   elementToBind.innerHTML = valueToBind ;
                //if(elementToBind.textContent !== valueToBind){ already tested
                    const textNode = document.createTextNode(valueToBind);
                    elementToBind.replaceChildren(textNode);
                //}
                
                //}
            }
            if(changed){
                //if the value changed, dispatch a change event
                
                //remove this event dispatch because it have 
                //heavy performance impact and not sure is very useful
                //if(elementToBind.zzEventsPrepared && elementToBind.zzEventsPrepared.bound){
                    // only dispatch if there is a bound listener
                    //elementToBind.dispatchEvent(new CustomEvent("bound", {bubbles: true, detail: valueToBind}));
                //}
            }
        }else{
            // binding an attribute
            let valueToBind = null;
            if(binding.bindDataDirect){
                //this is a simple data path
                valueToBind = this.getValueFromPath(bindExpression);
            }else{
                // the bindExpression is an string expression like : my name is ${name}
                valueToBind = this.runExpression(bindExpression, elementToBind, true);
            }
            if(binding.lastValue === valueToBind){ return; }
            binding.lastValue = valueToBind;

            if(att === "z-inner-text"){
                 //if the element does not have a writable value, use the innerHTML
                if(valueToBind === undefined || valueToBind === null){
                    //the value is undefined or null
                    valueToBind = "";
                }else{
                    valueToBind = ""+valueToBind;
                }
                //if(elementToBind.innerHTML !== valueToBind){
                //    changed = true ;
                 //   elementToBind.innerHTML = valueToBind ;
                //if(elementToBind.textContent !== valueToBind){ already tested
                    const textNode = document.createTextNode(valueToBind);
                    elementToBind.replaceChildren(textNode);
                //}
            }else if(att === "z-inner-html"){
                 //if the element does not have a writable value, use the innerHTML
                if(valueToBind === undefined || valueToBind === null){
                    //the value is undefined or null
                    valueToBind = "";
                }else{
                    valueToBind = ""+valueToBind;
                }
                elementToBind.innerHTML = valueToBind ;
            }else{
                let previousValue;
                if(att === "z-style"){
                    att = "style";
                }
                if(att === "z-class"){
                    previousValue = elementToBind.getAttribute(att);
                }
                if(att === "src"){
                    //first set blank image to avoid keeping the old image
                    elementToBind.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
                    setTimeout(()=>{
                        elementToBind.src = valueToBind;
                    },1);
                }else{
                    // transform att-name to attName
                    /*let propertyName = att.split("-").map((v, i)=>{
                        if(i>0){
                            return v.substring(0,1).toUpperCase()+v.substring(1) ;
                        }else{
                            return v ;
                        }
                    }).join("") ;*/
                    let propertyName = "";
                    let upperNext = false;
                    for (let i = 0; i < att.length; i++) {
                        let char = att[i];
                        if (char === "-") {
                            upperNext = true;
                        } else {
                            if (upperNext) {
                                propertyName += char.toUpperCase();
                                upperNext = false;
                            } else {
                                propertyName += char;
                            }
                        }
                    }
                    let valueProperty = valueToBind;
                    if(propertyName.startsWith("on")){
                        valueProperty = new Function("event", valueToBind).bind(elementToBind);
                    }
                    elementToBind[propertyName] = valueProperty; //always set the value on the element to avoid serialization
                    if(valueToBind === false){
                        if(elementToBind.hasAttribute(att)){
                            //if the value is false, remove the attribute
                            elementToBind.removeAttribute(att);
                        }
                    }else if(typeof(valueToBind) === "object"){
                        //if the value is an object, we need to serialize it
                        const valueStr = JSON.stringify(valueToBind);
                        if(valueStr.length > 2000){
                            elementToBind.setAttribute(att, `Value too long, get value on element.${propertyName} property`);
                        }else{
                            elementToBind.setAttribute(att, JSON.stringify(valueToBind));
                        }
                    }else if(elementToBind.getAttribute(att) !== valueToBind){
                        elementToBind.setAttribute(att, valueToBind);
                    }
                }
                if(att === "z-class"){
                    //for attribute z-class, we update the css class list
                    (previousValue||"").split(" ").forEach((cl)=>{
                        if(cl){
                            elementToBind.classList.remove(cl);
                        }
                    });
                    (valueToBind||"").split(" ").forEach((cl)=>{
                        if(cl){
                            elementToBind.classList.add(cl);
                        }
                    });
                }
            }
        }
    }

    /**
     * Sets up listeners and two-way binding for a binding configuration
     * @param {Object} binding - Binding configuration object
     */
    prepareBinding(binding){
        binding.listeners = [] ;
        const listenPaths = [] ;
        if(binding.bindProp === "_value"){
            //this is a binding to the value of an input
            listenPaths.push(binding.bindAtt) ;
        }else{
            //this is a binding to an attribute using ${...} syntax
            const expressions = extractExpressions(binding.bindAtt) ;
            for(let expr of expressions){
                //for each expression, extract the paths
                //expr can be ${name} or ${user.name} or ${user.address.street}
                const paths = extractPaths(expr) ;
                listenPaths.push(...paths) ;
            }
        }

        let bindDataDirect = true;
        for(let i=0; i<binding.bindAtt.length; i++){
            const c = binding.bindAtt[i] ;
            if(i===0 && c !== "$"){
                bindDataDirect = false;
                break;
            }
            if(i===1 && c !== "{"){
                bindDataDirect = false;
                break;
            }
            if(i===binding.bindAtt.length-1 && c !== "}"){
                bindDataDirect = false;
                break;
            }
            if(i>1 && i<binding.bindAtt.length-1){
                if(c >= "a" && c <= "z" || 
                    c >= "A" && c <= "Z" || 
                    c >= "0" && c <= "9" || 
                    c === "_" || c === "."){
                        //valid character for a path

                }else{
                    //not valid character for a path
                    bindDataDirect = false;
                    break;
                }
            }
        }
        if(bindDataDirect){
            binding.bindDataDirect = true;
            binding.bindAtt = binding.bindAtt.substring(2, binding.bindAtt.length-1) ;
        }

        const changeListener = (change, path)=>{
            //when the data changes, update the binding
            if(change.autobind !== false){ //if autobind is false, don't update the binding
                if(this.invertedVariablesPath[path]){
                    let k = this.invertedVariablesPath[path] ;
                    //a context element has been updated
                    if(this.context[k] !== change.newValue ){
                        this.context[k] = change.newValue ;
                    }

                }
                this.bindValue(binding) ;
            }
        }

        for(let path of listenPaths){

            //substitute variables
            path = this.substituteVariables(path) 

            // if we receive a path like "user.name", we need to listen to changes on "user" and "user.name"
            while(path){
                const localPath = path ;
                this.data.addListener(path, (change)=>{
                    //console.log("CALL CHANGED ON PATH FOR BINDING", localPath, binding) ;
                    changeListener(change, localPath) ;
                }) ;
                binding.listeners.push({path, listener:  (change)=>{
                    //console.log("CALL CHANGED ON PATH FOR BINDING", localPath, binding) ;
                    changeListener(change, localPath) ;
                }}) ;
                const lastDotIndex = path.lastIndexOf(".") ;
                if(lastDotIndex !== -1){
                    path = path.substring(0, lastDotIndex) ;
                }else{
                    break;
                }
            }

            /*
            const pathParts = path.split(".") ;
            for(let i=0; i<pathParts.length; i++){
                const subPath = pathParts.slice(0, i+1).join(".") ;
                this.data.addListener(subPath, changeListener) ;
                binding.listeners.push({path: subPath, listener: changeListener}) ;
            }*/
        }


        // listen to user modification in input field
        if(binding.bindProp === "_value"){
            let events = ["change"];
            if(binding.node.tagName === "INPUT" || binding.node.tagName === "TEXTAREA" 
                || binding.node.tagName === "DB-FIELD"){
                events.push("keyup");
            }
            for(let event of events){
                binding.node.addEventListener(event, ()=>{
                    const bindPath = binding.bindAtt.split(".") ;
                    const property = bindPath.pop() ;
                    const parentPath = bindPath.join(".") ;

                    // prepare a default value to construct the data tree of the binding if it does not exist yet
                    let defaultParentValue = {} ;
                    if(!isNaN(property)){
                        // property is a number, so default value is most likely an array
                        defaultParentValue = [] ;
                    }
                    const parent = this.getValueFromPath(parentPath, defaultParentValue) ;
                    if(parent){
                        let value = binding.node.value;
                        if(binding.node.tagName === "INPUT" && binding.node.type === "radio" && !binding.node.checked){
                            return;
                        }
                        if(binding.node.tagName === "INPUT" && binding.node.type === "checkbox"){
                            value = binding.node.checked;
                        }
                        if(binding.node.tagName === "INPUT" && binding.node.type === "file"){
                            if(!binding.node.multiple){
                                value = binding.node.files[0] ;
                            }else{
                                value = Array.from(binding.node.files);
                            }
                        }
                        binding.lastValue = value;
                        parent[property] = value ;
                    }
                }) ;
            }
        }
    }
    
    getData(){
        return this.data.data ;
    }
    
}


/**
 * Class responsible for conditionally hiding/showing DOM nodes based on expressions.
 * Manages the visibility state and provides automatic updates when data changes.
 */
export class Hider {
    /**
     * Creates a new Hider instance.
     * @param {HTMLElement} node - The DOM node to hide/show
     * @param {string} condition - The expression condition to evaluate for visibility
     * @param {Object} data - The data object to bind to
     * @param {Comment} placeholder - The placeholder comment node used when hiding
     * @param {Object} context - The binding context
     * @param {Object} variablesPath - Map of variable names to their data paths
     */
    constructor(node, condition, data, placeholder, context, variablesPath) {
        this.node = node;
        // remove attributes that should not be taken in account as we are inside the hider
        node.removeAttribute("z-hide-if");
        node.removeAttribute("z-show-if");
        delete node.zzBindAnalyzed;
        this.condition = `try {
            return ${condition};
        } catch (err) {
            console.info("Expression ${condition.replaceAll('"', '\\"')} failed, assume hiding", err) ;
            return true;
        }`
        condition;
        this.data = data;
        this.placeholder = placeholder;
        this.context = context;
        this.variablesPath = variablesPath;
        this.invertedVariablesPath = {} ;
        for(let [k, p] of Object.entries(this.variablesPath)){
            this.invertedVariablesPath[p] = k ;
        }
        this.bindz = new BindZ(node, data, context, variablesPath) ;
        this.listeners = [] ;
        this.hidden = null;
        this.prepared = false;
        this.started = false;

    }

    updateContext(context, variablesPath){
        //console.log("UPDATE HIDER CONTEXT", this, context) ;
        this.context = {...this.context, ...context };
        this.variablesPath = {...this.variablesPath, ...variablesPath };
        this.invertedVariablesPath = {} ;
        for(let [k, p] of Object.entries(this.variablesPath)){
            this.invertedVariablesPath[p] = k ;
        }
        this.bindz.updateContext(context, variablesPath) ;
        this.updateVisibility() ;
    }

    
    /**
     * Updates the visibility of the node based on the condition evaluation.
     * Replaces the node with placeholder when hiding, and vice versa when showing.
     */
    updateVisibility() {
        // run the condition expression to check if the node should be hidden or not
        const shouldHide = this.bindz.runExpression(this.condition) ;
        
        if(shouldHide !== this.hidden){
            // hide state changed
            this.hidden = shouldHide ;
            if(this.hidden){
                //hide the node
                if(this.node.parentElement){
                    this.node.replaceWith(this.placeholder) ;
                }
                this.bindz.stopBinding() ;
            }else{
                //show the node
                this.placeholder.replaceWith(this.node) ;
                
                this.bindz.startBinding() ;
            }
        }
    }

    /**
     * Prepares the data listeners for the condition expression.
     * Extracts paths from the condition and sets up change listeners on relevant data paths.
     */
    prepare(){
        if(this.prepared){ return ; }
        this.prepared = true ;
        this.listeners = [] ;
        // get path to listen to check the condition change
        // for example, the condition is "user.name === 'John'", we need to listen to "user" and "user.name"
        const listenPaths = extractPaths(this.condition) ;
        this.listenPaths = listenPaths ;
        this.bindz.prepare() ;
    }

    getState(){
        const bindzState = this.bindz.getState() ;
        
        return {listenPaths: this.listenPaths, bindzState} ;
    }

    /**
     * Restores binding state from a serialized state object
     * @param {Object} state - Previously serialized state
     */
    prepareFromState(state){
        this.bindz.prepareFromState(state.bindzState) ;
        this.listenPaths = state.listenPaths ;
        this.prepared = true;
    }

     /**
     * Substitutes variable placeholders with their actual paths
     * @param {string} str - String containing variable placeholders
     * @returns {string} String with substituted variables
     */
    substituteVariables(str){
        const keys = Object.keys(this.variablesPath);
        for(let variable of keys){
            const realPath = this.variablesPath[variable];
            str = substituteVariable(str, variable, realPath);
        }
        return str;
    }


    start(){
        this.prepare();
        if(this.started){ return ;}
        this.started = true ;

        
        const changeListener = (change, path)=>{
            //when the data changes, update the binding
            if(change.autobind !== false){ //if autobind is false, don't update the binding
                if(this.invertedVariablesPath[path]){
                    let k = this.invertedVariablesPath[path] ;
                    //a context element has been updated
                    if(this.context[k] !== change.newValue ){
                        this.context[k] = change.newValue ;
                        this.bindz.updateContext(this.context, this.variablesPath) ;
                    }

                }
                this.updateVisibility() ;
            }
        }
        for(let path of this.listenPaths){
            // if we receive a path like "user.name", we need to listen to changes on "user" and "user.name"
            // const pathParts = path.split(".") ;
            // for(let i=0; i<pathParts.length; i++){
            //     const subPath = pathParts.slice(0, i+1).join(".") ;
            //     this.data.addListener(subPath, changeListener) ;
            //     this.listeners.push({path: subPath, listener: changeListener}) ;
            // }

            //substitute variables
            path = this.substituteVariables(path) 

            // if we receive a path like "user.name", we need to listen to changes on "user" and "user.name"
            while(path){
                const localPath = path ;
                this.data.addListener(path,  (change)=>{
                    //console.log("CALL CHANGED ON PATH FOR HIDING", localPath, this.condition) ;
                    changeListener(change, localPath) ;
                }) ;
                this.listeners.push({path, listener:  (change)=>{
                    //console.log("CALL CHANGED ON PATH FOR HIDING", localPath, this.condition) ;
                    changeListener(change, localPath) ;
                }}) ;
                const lastDotIndex = path.lastIndexOf(".") ;
                if(lastDotIndex !== -1){
                    path = path.substring(0, lastDotIndex) ;
                }else{
                    break;
                }
            }
        }

        this.updateVisibility() ;
    }

    stop(){
        if(!this.started){ return; }
        this.started = false;
        this.bindz.stopBinding() ;
        let listener = this.listeners.pop() ;
        while(listener){
            this.data.removeListener(listener.path, listener.listener) ;
            listener = this.listeners.pop() ;
        }
    }

    destroy(){
        this.bindz.destroy() ;
    }

}

/**
 * Class responsible for repeating DOM nodes based on array data.
 * Manages the creation, binding, and lifecycle of repeated elements with support for recursion.
 */
export class Repeater {
    /**
     * Creates a new Repeater instance.
     * @param {HTMLElement} node - The template node to repeat
     * @param {string} bindAtt - The binding attribute (e.g., "item of items" or "(item,index) of items")
     * @param {Object} data - The data object to bind to
     * @param {Comment} placeholder - The placeholder comment node for positioning
     * @param {Object} context - The binding context
     * @param {Object} variablesPath - Map of variable names to their data paths
     */
    constructor(node, bindAtt, data, placeholder, context, variablesPath) {
        this.node = node;
        node.removeAttribute("z-bind");
        delete node.zzBindAnalyzed;
        this.recurseProperty = node.getAttribute("z-recurse") ;
        if(this.recurseProperty){
            this.recurseLevel = 0;
            if(this.node.hasAttribute("z-recurse-level")){
                this.recurseLevel = Number(this.node.getAttribute("z-recurse-level"));
            }
        }
        this.bindAtt = bindAtt;
        this.data = data;
        this.placeholder = placeholder;
        this.context = context;
        this.variablesPath = variablesPath;
        this.binders = [] ;
        this.listeners = [] ;
        this.started = false;
        this.prepared = false;
    }

    updateContext(context, variablesPath){
        this.context = {...this.context, ...context };
        this.variablesPath = {...this.variablesPath, ...variablesPath };

        this.updateItems() ;
    }

    /**
     * Substitutes variable names with their actual data paths.
     * @param {string} str - The string containing variables to substitute
     * @returns {string} The string with variables replaced by their real paths
     */
    substituteVariables(str){
        const keys = Object.keys(this.variablesPath);
        for(let variable of keys){
            const realPath = this.variablesPath[variable];
            str = substituteVariable(str, variable, realPath) ;
        }
        return str ;
    }

    /**
     * Prepares the repeater by parsing the binding attribute and setting up data listeners.
     * Analyzes the loop syntax and establishes change listeners for array modifications.
     */
    prepare() {
        if(this.prepared){ return ;}
        this.prepared = true ;
        if(!this.recurseProperty){
            this.preparedBindz = new BindZ(this.node, this.data) ;
            this.preparedBindz.prepare() ;
            this.bindState = this.preparedBindz.getState() ;
        }
        
        
        // bind can have 2 forms : item of items or (item,index) of items
        let [item, items] = this.bindAtt.split(/\s+of\s+/) ;
        item = item.replace("(", "").replace(")", "").trim() ;
        this.loopVariable = item ; // syntax item of items
        this.indexVariable = null;
        this.arrayVariable = this.substituteVariables(items);
        if(/\s*,\s*/.test(item)){
            // syntax (item,index) of items
            const [itemName, indexName] = item.split(/\s*,\s*/) ;
            this.loopVariable = itemName.trim() ;
            this.indexVariable = indexName.trim() ;
        }
        
    }

    getState() {       
        return {
            loopVariable: this.loopVariable, 
            indexVariable: this.indexVariable, 
            arrayVariable: this.arrayVariable, 
            bindState: this.bindState
        } ;
    }


    /**
     * Restores binding state from a serialized state object
     * @param {Object} state - Previously serialized state
     */
    prepareFromState(state){
        if(this.prepared){ return ;}
        this.prepared = true ;

        this.loopVariable = state.loopVariable;
        this.indexVariable = state.indexVariable;
        this.arrayVariable = this.substituteVariables(state.arrayVariable); 
        this.bindState = state.bindState;
    }
    

    start(){
        this.prepare();
        if(this.started){ return ;}
        this.started = true ;

        const changeListener = (change)=>{
            if(change.autobind !== false){ //if autobind is false, don't update the binding
                this.updateItems() ;
            }
        };
        
        // get path to listen to check the array length changes
        let path = this.arrayVariable+".length" ;
        while(path){
            //const localPath = path ;
            this.data.addListener(path, (change)=>{
                //console.log("CALL CHANGED ON PATH FOR REPEATER", localPath, this.arrayVariable) ;
                changeListener(change) ;
            }) ;
            this.listeners.push({path: path, listener: (change)=>{
                //console.log("CALL CHANGED ON PATH FOR REPEATER", localPath, this.arrayVariable) ;
                changeListener(change) ;
            }})
            const lastDotIndex = path.lastIndexOf(".") ;
            if(lastDotIndex !== -1){
                path = path.substring(0, lastDotIndex) ;
            }else{
                break;
            }
        }

        

        this.prepare();
        this.updateItems() ;
    }

    stop(){
        if(!this.started){ return; }
        this.started = false;
        
        let listener = this.listeners.pop() ;
        while(listener){
            this.data.removeListener(listener.path, listener.listener) ;
            listener = this.listeners.pop() ;
        }
        for(let b of this.binders){
            b.bindz.stopBinding() ;
        }
    }

    destroy(){
        
    }

    /**
     * Updates the repeated items based on the current array data.
     * Creates new binders as needed and removes excess ones when array shrinks.
     */
    updateItems(){
        const array = this.data.getValueFromPath(this.arrayVariable)||[] ;
        // prepare enough items to do the render
        while(array.length>this.binders.length){
            let index = this.binders.length;
            this.createBinder(array[index], index, array) ;
        }
        // for all item in the array, start the binding
        let fragment = null;
        for(let i=0; i<array.length; i++){
            if(!this.binders[i].bindz.node.parentElement){
                // add the node in the fragment
                if(!fragment){
                    fragment = document.createDocumentFragment();
                }
                fragment.appendChild(this.binders[i].bindz.node)
            }
            const context = this.createContext(array[i], i, array) ;
            const variablesPath = this.createVariablePath(array[i], i) ;
        
            this.binders[i].bindz.updateContext(context, variablesPath);
            this.binders[i].bindz.startBinding() ;
        }
        if(fragment){
            //add the fragment to the DOM
            this.placeholder.parentElement.insertBefore(fragment, this.placeholder) ;
        }
        if(this.binders.length > array.length){
            // remove not user binders
            // while(this.binders.length > array.length){
            //     const binder = this.binders.pop() ;
            //     binder.bindz.stopBinding() ;
            //     binder.bindz.node.remove() ;
            // }
            // const parent = this.placeholder.parentElement ;
            // const workingPlaceholder = document.createComment("Removing "+(this.binders.length-array.length)+" binders") ;
            // parent.replaceWith(workingPlaceholder) ;
            const bindersToRemove = this.binders.splice(array.length) ;
            for(let binder of bindersToRemove){
                // stop the binding of the binder
                binder.bindz.stopBinding() ;
                // remove the node from the DOM
                binder.bindz.node.remove() ;
            }
            // workingPlaceholder.replaceWith(parent) ;
            // for performance, we move the node to keep in a fragment and add the remaining in a fragment
            // this way we don't have to remove the nodes one by one and we work outside of the DOM
            // and don't trigger reflows
            // const parent = this.placeholder.parentElement ;
            // const fragment = document.createDocumentFragment() ;
            // const bindersToRemove = this.binders.slice(array.length) ;
            // let indexNode = 0;
            // let node = parent.childNodes[indexNode] ;
            // while(node){
            //     let isNodeToRemove = false ;
            //     for(let i=0; i<bindersToRemove.length; i++){
            //         const b = bindersToRemove[i] ;
            //         if(b.bindz.node.repeaterId === node.repeaterId){
            //             // this node is a binder to remove, stop the binding
            //             b.bindz.stopBinding() ;
            //             //bindersToRemove.splice(i, 1) ; //remove the binder from the list
            //             isNodeToRemove = true ;
            //             break ;
            //         }
            //     }
            //     if(!isNodeToRemove){
            //         // this node is not a binder to remove, keep it in the fragment
            //         fragment.appendChild(node);
            //         node = parent.childNodes[indexNode] ;
            //     }else{
            //         indexNode++;
            //         node = parent.childNodes[indexNode] ;
            //     }
            // }
            // parent.innerHTML = "" ; //clear the parent
            // parent.appendChild(fragment) ; //readd the remaining nodes in the parent
            
        }
    }

    /**
     * Creates a context object for a specific item in the loop.
     * @param {*} item - The current item from the array
     * @param {number} index - The current index in the array
     * @returns {Object} The context object with loop variables
     */
    createContext(item, index, array){
        const context = {} ;
        context[this.loopVariable] = item;
        context.itemData = item ;
        context.array = array ;
        if(this.indexVariable){
            context[this.indexVariable] = index;
        }
        if(this.recurseProperty){
            context.recurseLevel = this.recurseLevel ;
            context[this.recurseProperty] = array ;
        }
        return context ;
    }

    /**
     * Creates a variables path mapping for a specific item in the loop.
     * @param {*} item - The current item from the array
     * @param {number} index - The current index in the array
     * @returns {Object} The variables path mapping
     */
    createVariablePath(item, index){
        const variablesPath = {} ;
        variablesPath[this.loopVariable] = this.arrayVariable+"."+index;
        return variablesPath ;
    }

    /**
     * Creates a new binder for a specific array item.
     * Handles node cloning, recursive binding setup, and BindZ initialization.
     * @param {*} item - The array item to create a binder for
     * @param {number} index - The index of the item in the array
     */
    createBinder(item, index, array){
        const context = this.createContext(item, index, array) ;
        const variablesPath = this.createVariablePath(item, index) ;
        
        const cloneNode = this.node.cloneNode(true) ;
        if(this.recurseProperty){
            // this repeater has a recursive property
            const recurseContainer = cloneNode.querySelector("[z-recurse-container]") ;
            if(!recurseContainer){
                console.error("You defined a z-recurse but you did not add the z-recurse-container inside", this.node) ;
            }else{
                // create a clone of itself
                const cloneRecurse = this.node.cloneNode(true) ;
                //change the bind loop to loop in the recurse property
                //for example the initial loop is "block of blocks", the recursed loop will be "block of block.blocks"
                let recurseBind = `${this.loopVariable} of ${this.loopVariable}.${this.recurseProperty}` ;
                if(this.indexVariable){
                    recurseBind = `(${this.loopVariable},${this.indexVariable}) of ${this.loopVariable}.${this.recurseProperty}` ;
                }
                cloneRecurse.setAttribute("z-bind", recurseBind) ;
                cloneRecurse.setAttribute("z-recurse-level", this.recurseLevel+1) ;
                //replace the container by the recurse clone
                recurseContainer.replaceWith(cloneRecurse) ;
            }
        }
        if(!cloneNode.repeaterId){
            // if the node has no id, we generate a unique id
            cloneNode.repeaterId = "node-"+(idInc++) ;
        }
        const bindz = new BindZ(cloneNode, this.data, {...this.context, ...context}, {...this.variablesPath, ...variablesPath}) ;
        if(this.recurseProperty){
            //recursive need to prepare again because recursive binding has been added automatically
            bindz.prepare();
        }else{
            //if no recurse, prepare from state to gain performances
            bindz.prepareFromState(this.bindState) ;
        }
        this.binders.push({bindz: bindz, index}) ;
    }
}

export function bind(el, data= {}, context= {}){
    el.setAttribute("zz-bind-root", "true") ;
    const bindz =  new BindZ(el, data, context) ;
    bindz.startBinding() ;
    return bindz ;
}

const FORMATTERS = {} ;

export function registerFormatter(formatter){
    FORMATTERS[formatter.prefix] = formatter ;
}