# ViewZ

The ViewZ library is composed of 3 layers : 
 - BindZ : the auto-binding system, it manage the binding of data with elements on screen
 - ViewZ : the view system, it manage a view linked to some data with a life-cycle
 - RouterZ : the routing system that load views from user navigation

Each layer can be user without its upper layer. For example, you can use only the BindZ system without ViewZ and RouterZ. You can use BindZ + ViewZ without RouterZ.
 
But the opposite is not true (RouterZ needs ViewZ and ViewZ needs BindZ)

## BindZ


## ViewZ


## RouterZ

RouterZ is the routing system, it handle user navigation (which change the browser URL) to load or remove ViewZ views.

### Route modes



