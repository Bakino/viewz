/* globals view */

// implement loader to provide data to bind to the view
// loader is called on view initialization and when view.refresh is called
view.loader = async () =>{
    console.log("LOADER");
    return {
        title: 'Hello, World!',
        time: today(),
    };
}

// displayed is called once when the data are loaded and DOM available
view.displayed = async () => {
    console.log("DISPLAYED") ; 

    setInterval(() => {
        view.updateTime();
    }, 1000) ;
}
