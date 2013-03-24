var App = require('easy-app')
var nsconcat = App.nsconcat
var nssuffix = App.nssuffix

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

Router.prototype.getUrlFor = function (task, params) {
  for (var i = 0; i < this.routes.length; i++) {
    var url = this.routes[i].url(task, params)
    if (url) return url
  }
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

Router.prototype.url = function (task, params) {
  task = nssuffix(this.namespace, task)
  var url = this.getUrlFor(task, params)
  if (!url) return
  return this.prefix + url
}
