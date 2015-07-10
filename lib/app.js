'use strict'

const App = require('easy-app')
const methods = require('methods')
const inherits = require('util').inherits
const Router = require('./router/router')
const Route = require('./router/route')
const Zone = require('./router/zone')

module.exports = Web

function Web() {
  App.call(this)
  this.routes = []
}

inherits(Web, App)

methods.forEach(function(meth) {
  Web.prototype[meth] = function(path, task, opts, fn) {
    if (typeof task != 'string') {
      fn = opts
      opts = task
      task = path
    }
    if (typeof opts != 'object') {
      fn = opts
      opts = {}
    }
    opts.route = true
    this.routes.push(new Route(meth, path, task))
    this.def(task, opts, fn)
    return this
  }
})

Web.prototype.at = function(path, ns, app) {
  if (typeof ns != 'string') {
    app = ns
    ns = ''
  }
  if (typeof app == 'function') {
    app = app(new Web)
  }
  if (path == '/') path = ''
  if (path || ns) {
    let zone = new Zone(path, ns, new Router(app.routes))
    this.routes.push(zone)
  } else {
    this.routes.concat(app.routes)
  }
  this.install(ns, app)
  return this
}

Web.prototype.copy = function() {
  let app = App.prototype.copy.call(this)
  app.routes = this.routes.slice()
  return app
}
