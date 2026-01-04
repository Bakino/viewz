view.loader = async ()=>{
    const time = new Date().toLocaleTimeString();
    const clockColor = view.route.params.clockColor??"green" ;
    const clockName = view.route.params.clock??"" ;
    return {time, clockColor, clockName} ;
}

view.displayed = ()=>{
    view.data.addListener("time", ()=>{
        view.container.dispatchEvent(new CustomEvent("time", {detail: view.data.time})) ;
    }) ;
    setInterval(()=>{
        view.data.time = new Date().toLocaleTimeString() ;
    }, 1000) ;
}