view.timeChanged = (event)=>{
    console.log("New time is "+event.detail) ;
}

view.changeColor = ()=>{
    const clock = view.getElementById("anotherClock") ;
    clock.setAttribute("clock-color", "red") ;
}

view.changeColorThroughData = ()=>{
    const clock = view.getElementById("anotherClock") ;
    clock.view.data.clockColor = "yellow" ;
}