/* globals view, router */

// implement loader to provide data to bind to the view
// loader is called on view initialization and when view.refresh is called
view.loader = async () =>{
    console.log("LOADER "+view.id);
    return {
        openParams: {
            param1: 1,
            param2: "second",
        }
    }
}

// displayed is called once when the data are loaded and DOM available
view.displayed = async () => {
    console.log("DISPLAYED "+view.id);
    setInterval(()=>{
        view.data.openParams.param1++ ;
    }, 1000)
}

//called when view.refresh() has been called and completed
view.refreshed = async () => {
    console.log("REFRESHED "+view.id);
}

// called when the view is being destroyed
view.destroyed = async () => {
    console.log("DESTROYED "+view.id);
}

view.openInPopup = async ()=>{
    let result = await view.router.openStack({type: "(", path: "/view-03"}) ;

    console.log("FINISH", result)
}
