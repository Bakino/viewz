view.loader = async ()=>{
    const time = new Date().toLocaleTimeString();
    const color = view.route.params.color??"green" ;
    const clockName = view.route.params.clock??"" ;
    return {time, color, clockName} ;
}

view.displayed = ()=>{
    view.data.addListener("time", ()=>{
        view.container.dispatchEvent(new CustomEvent("time", {detail: view.data.time})) ;
    }) ;
    setInterval(()=>{
        view.data.time = new Date().toLocaleTimeString() ;
    }, 1000) ;
}