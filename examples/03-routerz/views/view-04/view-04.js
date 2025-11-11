/* globals view */

// implement loader to provide data to bind to the view
// loader is called on view initialization and when view.refresh is called
view.loader = async () =>{
    console.log("LOADER "+view.id);
}

view.title = async ()=>{
    return "I am view 04"
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
