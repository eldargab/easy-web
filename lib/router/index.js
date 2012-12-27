var path2regex = require('path-to-regexp')
var methods = require('methods')

module.exports = Router

function Router () {
  this._routes = []
}

Router.prototype.dispatch = function (path, req) {
  var task
  for (var i = 0; i < this._routes.length; i++) {
    if (task = this._routes[i].match(path, req)) {
      return task
    }
  }
  return '404'
}

Router.prototype.route = function (meth, path, task, cb) {
  meth = meth.toUpperCase()

  if (this._app) task = this._app + '_' + task

  var route = path instanceof RegExp
    ? new RegexRoute(task, meth, path, cb)
    : new PathRoute(task, meth, path)

  this._routes.push(route)
  return this
}

Router.prototype.app = function (app, fn) {
  try {
    this._app = app
    this.routes(fn)
  } finally {
    this._app = null
  }
}

Router.prototype.at = function (path, app, fn) {
  if (path[path.length - 1] == '/') path = path.slice(0, path.length - 1)

  if (typeof app == 'function') {
    fn = app
    app = null
  }

  var router = new Router

  router._app = app

  router.routes(fn)

  this._routes.push({
    match: function (p, req) {
      if (p.indexOf(path) != 0) return false
      p = p.slice(path.length)
      if (p[0] != '/') p = '/' + p
      return router.dispatch(p, req)
    }
  })
}

Router.prototype.routes = function (fn) {
  fn.call(this)
  return this
}

methods.forEach(function (meth) {
  Router.prototype[meth] = function (path, task, fn) {
    return this.route(meth, path, task, fn)
  }
})

Router.prototype.del = Router.prototype['delete']

Router.prototype.all = function (path, task, fn) {
  return this.route('*', path, task, fn)
}


function RegexRoute (task, meth, regex) {
  this.task = task
  this.regex = regex
  this.method = meth
}

RegexRoute.prototype.match = function (p, req) {
  if (!(this.method == req.method || req.method == 'HEAD' && this.method == 'GET' || this.method == '*'))
    return false
  var m = this.regex.exec(p)
  if (!m) return false
  if (this.cb) {
    this.cb(decodeMatch(m), req, p)
  }
  req.routePath = p
  req.task = this.task
  return this.task
}

RegexRoute.prototype.setup = function (cb) {
  this.cb = cb
  return this
}

function decodeMatch (m) {
  var decoded = []
  for (var i = 0; i < m.length; i++) {
    decoded[i] = m[i] && decodeURIComponent(m[i])
  }
  return decoded
}


function PathRoute (task, meth, path) {
  this.keys = []
  RegexRoute.call(this, task, meth, path2regex(path, this.keys), this.cb)
}

PathRoute.prototype.__proto__ = RegexRoute.prototype

PathRoute.prototype.cb = function (m, req) {
  req.params = {}
  for (var i = 1; i < m.length; i++) {
    var key = this.keys[i - 1]
    if (key) {
      req.params[key.name] = m[i]
    }
  }
}
