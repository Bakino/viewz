/* globals view */

// implement loader to provide data to bind to the view
// loader is called on view initialization and when view.refresh is called
view.loader = async () =>{
    console.log("LOADER");
    return {
        title: 'Hello, World!',
        number: randomInt(1, 100),
    };
}

// displayed is called once when the data are loaded and DOM available
view.displayed = async () => {
    console.log("DISPLAYED") ; 

    // if you need to listen to data changes, do it here
    view.data.addListener("number", ()=>{
        console.log("NUMBER CHANGED TO: " + view.data.number);
    }) ;
}

//called when view.refresh() has been called and completed
view.refreshed = async () => {
    console.log("REFRESHED") ;

    // don't do view.data.addListener here, the view.data remains the same across refreshes
    // so view.displayed is the place where to add listeners
}

// called when the view is being destroyed
view.destroyed = async () => {
    console.log("DESTROYED") ;
    // clean up any resources here
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}