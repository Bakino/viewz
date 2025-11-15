export default {
    globals: {
        saveToLocalStorage: (key, data)=>{
            localStorage.setItem(key, JSON.stringify(data)) ; 
        },
        loadFromLocalStorage: (key)=>{
            let valueStr = localStorage.getItem(key) ;
            let data = [] ;
            if(valueStr){
                try{
                    data = JSON.parse(valueStr) ;
                }catch(err){
                    console.warn("Wrong value in localStorage for key "+key) ;
                }
            } 
            return data;
        }
    }
}