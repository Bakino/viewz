/* globals view */

// implement loader to provide data to bind to the view
// loader is called on view initialization and when view.refresh is called
view.loader = async () =>{
    console.log("LOADER "+view.id, view.route);
    let data = {} ;
    if(view.route.params){
        data.params = [] ;
        for(let [key, value] of Object.entries(view.route.params)){
            data.params.push({ key: key, value: value }) ;
        }
    }
    return data ;
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
