var path2regex = require('path-to-regexp')

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

Router.prototype.route = function (meth, path, task) {
  var route
  if (typeof meth == 'object') {
    route = meth
  } else {
    meth = meth.toUpperCase()
    route = new Route(meth, path, task)
  }
  this.routes.push(route)
  return this
}

Router.prototype.at = function (path, namespace) {
  var router = new Router
  router.prefix = encodeURI(path)
  router.namespace = namespace ? namespace + '_' : ''
  router.routes = this.routes.slice()
  return router
}

Router.prototype.match = function (path, req) {
  if (path.indexOf(this.prefix) == 0) {
    path = path.slice(this.prefix.length)
    var task = this.dispatch(path, req)
    if (task == '404') return '404'
    return this.namespace + task
  }
  return false
}


function Route (meth, path, task) {
  this.meth = meth
  this.task = task
  this.keys = []
  this.regex = path2regex(path, this.keys)
}

Route.prototype.match = function (p, req) {
  if (this.meth != req.method
    && !(this.meth == 'GET' && req.method == 'HEAD')
    && this.meth != 'ALL') return false

  var m = this.regex.exec(p)
  if (!m) return false

  req.routePath = p
  req.params = {}
  req.task = this.task

  for (var i = 1; i < m.length; i++) {
    var key = this.keys[i]
    req.params[key.name] = m[i] && decodeURIComponent(m[i])
  }

  return this.task
}
