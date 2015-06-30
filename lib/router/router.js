
module.exports = Router

function Router(routes) {
  this.routes = routes
}

Router.prototype.dispatch = function(path, req) {
  for(let route of this.routes) {
    let m = route.match(path, req)
    if (m) return m
  }
}

Router.prototype.getUrlFor = function(name, params) {
  for(let route of this.routes) {
    let url = route.url && route.url(name, params)
    if (url != null) return url
  }
}
