var App = require('easy-app')
var nsconcat = App.nsconcat
var nssuffix = App.nssuffix
var methods = require('methods')
var Route = require('./route')

module.exports = function(setup) {
  var router = new Router
  if (setup) router.use.apply(router, arguments)
  return router
}

function Router() {
  this.routes = []
}

Router.prototype.dispatch = function(path, req) {
  for (var i = 0; i < this.routes.length; i++) {
    var task = this.routes[i].match(path, req)
    if (task) return task
  }
  return '404'
}

Router.prototype.getUrlFor = function(task, params) {
  for (var i = 0; i < this.routes.length; i++) {
    var r = this.routes[i]
    var url = r.url && r.url(task, params)
    if (url != null) return url
  }
}

Router.prototype.route = function(route) {
  if (typeof route == 'function') route = {match: route}
  this.routes.push(route)
  return this
}

methods.concat('all').forEach(function(meth) {
  Router.prototype[meth] = function(path, task, opts) {
    meth = meth.toUpperCase()
    this.route(new Route(meth, path, task, opts))
    return this
  }
})

Router.prototype.use = function(fn) {
  var f = fn
  arguments[0] = this
  f.apply(this, arguments)
  return this
}

Router.prototype.at = function(path, ns, router) {
  if (typeof ns != 'string') {
    router = ns
    ns = ''
  }
  if (typeof router == 'function') {
    router = new Router().use(router)
  }
  this.route(new Subrouter(path, ns, router))
  return this
}

function Subrouter(path, ns, router) {
  this.path = encodeURI(trimSlash(path))
  this.ns = ns
  this.router = router
}

Subrouter.prototype.match = function(path, req) {
  if (!startsWith(this.path, path)) return false
  path = path.slice(this.path.length)
  var task = this.router.dispatch(path, req)
  if (task == '404' && this.path == '') return false
  if (task == '404') return '404'
  return nsconcat(this.ns, task)
}

Subrouter.prototype.url = function(task, params) {
  task = nssuffix(this.ns, task)
  if (!task) return
  var url = this.router.getUrlFor(task, params)
  if (url == null) return
  return this.path + url
}


function trimSlash(path) {
  var last = path.length - 1
  return path[last] == '/'
    ? path.slice(0, last)
    : path
}

function startsWith(prefix, str) {
  for (var i = 0; i < prefix.length; i++) {
    if (prefix[i] != str[i]) return false
  }
  return true
}
