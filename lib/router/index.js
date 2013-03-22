var nsconcat = require('easy-app').nsconcat

module.exports = Router

function Router () {
  this.routes = []
}

Router.prototype.dispatch = function (path, req) {
  for (var i = 0; i < this.routes.length; i++) {
    var task = this.routes[i].match(path, req)
    if (task) return task
  }
  return '404'
}

Router.prototype.push = function (route) {
  this.routes.push(route)
  return this
}

Router.prototype.at = function (path, namespace) {
  var router = new Router
  router.prefix = encodeURI(path)
  router.namespace = namespace
  router.routes = this.routes.slice()
  return router
}

Router.prototype.match = function (path, req) {
  if (path.indexOf(this.prefix) == 0) {
    path = path.slice(this.prefix.length)
    var task = this.dispatch(path, req)
    if (task == '404') return '404'
    return nsconcat(this.namespace, task)
  }
  return false
}
