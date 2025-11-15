/* globals view, router */

// implement loader to provide data to bind to the view
// loader is called on view initialization and when view.refresh is called
view.loader = async () =>{
    console.log("LOADER "+view.id);
    return { options: {} }
}

// displayed is called once when the data are loaded and DOM available
view.displayed = async () => {
    console.log("DISPLAYED "+view.id);
}

//called when view.refresh() has been called and completed
view.refreshed = async () => {
    console.log("REFRESHED "+view.id);
}

// called when the view is being destroyed
view.destroyed = async () => {
    console.log("DESTROYED "+view.id);
}

view.openNow = async ()=>{
    view.router.openStack({type: view.data.openMode, options: view.data.options, path: "/view-03"}) ;
}
view.openInPopup = async ()=>{
    let result = await view.router.openStack({type: "(", path: "/view-03"}) ;

    console.log("FINISH", result)
}

view.openInPopupGetView = async ()=>{
    let openedView = await view.router.openStack({type: "(", path: "/view-03", returnView: true}) ;

    console.log("VIEW", openedView)
}
