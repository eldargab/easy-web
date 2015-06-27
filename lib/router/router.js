
module.exports = Router

function Router(routes) {
  this.routes = routes
}

Router.prototype.dispatch = function(path, req) {
  for (var route of this.routes) {
    var m = route.match(path, req)
    if (m) return m
  }
}

Router.prototype.getUrlFor = function(name, params) {
  for (var route of this.routes) {
    var url = route.url && route.url(name, params)
    if (url != null) return url
  }
}
