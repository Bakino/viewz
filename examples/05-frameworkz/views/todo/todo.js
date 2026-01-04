view.loader = async ()=>{

    // get todos from local storage
    let todos = loadFromLocalStorage("todos") ;

    // filter from the URL param
    let filteredTodos = todos ;
    if(view.route.params.state === "active"){
        filteredTodos = todos.filter(t=>!t.completed) ;
    }else if(view.route.params.state === "completed"){
        filteredTodos = todos.filter(t=>t.completed) ;
    }

    let filter = view.route.params.state;

    return { todos, filteredTodos, filter }
}

view.saveTodos = ()=>{  
    saveToLocalStorage("todos", view.data.todos) ;
}

view.displayed = async ()=>{
    view.data.addListener("todos.*", view.saveTodos);
    view.data.addListener("todos.*.*", view.saveTodos);
}

view.addTodo = ()=>{
    if(view.data.newTodo){
        view.data.todos.push({
            label: view.data.newTodo,
            completed: false,
            editing: false
        }) ;
        view.data.newTodo = "" ;
    }
}

view.toogleAll = ()=>{
    targetCompleted = view.data.todos.some(t=>!t.completed) ;
    for(let todo of view.data.todos){
        todo.completed = targetCompleted ;
    }
}

view.removeTodo = (todo)=>{
    view.data.todos.splice(view.data.todos.indexOf(todo), 1) ;
}

view.removeCompleted = ()=>{
    const todoCompleted = view.data.todos.filter(t=>t.completed) ;
    for(let todo of todoCompleted){
        view.data.todos.splice(view.data.todos.indexOf(todo), 1) ;
    }
}

view.editTodo = (todo, el)=>{
    const li = el.closest("li") ;
    todo.labelBeforeEditing = todo.label ;
    todo.editing = true ;
    setTimeout(()=>{
        li.querySelector("input.edit").focus() ;
    }, 1) ;
}

view.editFinish = (todo)=>{
    todo.editing = false ;
}

view.editCancel = (todo)=>{
    todo.label = todo.labelBeforeEditing ;
    todo.editing = false ;
}