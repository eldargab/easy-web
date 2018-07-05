'use strict'

const App = require('easy-app')
const inherits = require('util').inherits
const Router = require('./router')
const RoutePath = require('./route-path')
const clone = require('lodash.clonedeep')
const METHODS = require('http').METHODS
const http = require('./http')
const server = require('./server')


module.exports = Web


function Web() {
  App.call(this)
  this.routes = []
}


inherits(Web, App)


Web.prototype.route = function(methods, path, name) {
  if (typeof methods == 'string') {
    methods = methods.split(/\s+/)
  }

  methods.forEach(m => {
    if (METHODS.indexOf(m) < 0) throw new Error(`Unsupported method '${m}'`)
  })

  this.routes.push({
    name: name,
    methods: methods,
    prefix: '',
    path: new RoutePath(path)
  })
}


Web.prototype.at = function(path, ns, web) {
  if (typeof ns != 'string') {
    web = ns
    ns = null
  }

  if (typeof web == 'function') {
    let fn = web
    web = new Web
    fn(web)
  }

  if (path == '/') path = null
  if (path && path[path.length - 1] == '/') throw new Error("Non-root prefix path should not end with '/'")
  if (path && path[0] != '/') throw new Error("Prefix path should always start with '/'")

  this.deleteRoutes(web.routes.map(r => r.name))

  web.routes.forEach(r => {
    r = clone(r)
    if (ns) r.name = ns + '_' + r.name
    if (path) r.prefix = path + r.prefix
    this.routes.push(r)
  })

  this.install(ns, web)
}


Web.prototype.deleteRoutes = function(names) {
  this.routes = this.routes.filter(route => names.indexOf(route.name) < 0)
}


Web.prototype.compile = function(main, seeds) {
  let app = new App
  let router = new Router(this.routes)

  app.install(http)
  app.install(server)
  app.set('router', router)
  app.install(this)
  app.defs.requestProcessing.uses = (app.defs.requestProcessing.uses || []).concat(Object.keys(router.names))

  return app.compile(main, seeds)
}
