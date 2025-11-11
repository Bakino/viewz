/* globals view */

// implement loader to provide data to bind to the view
view.loader = async () =>{
    return {
        title: 'Hello, World!',
        description: 'This is a simple example of data binding using BindZ.',
        styling: {
            color: 'blue'
        }
    };
}

// function called be events in the view
view.showAlert = (event, element) => {
    if(event){
        alert(`You did a ${event.type} on element with text: ${element.textContent}`);
    }else{
        alert('Button clicked!');
    }
}