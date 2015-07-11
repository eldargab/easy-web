'use strict'

const util = require('./http/util')
const main = require('./main')
const App = require('./app')
const Router = require('./router/router')
const run = App.prototype.run

exports.main = function() {
  let app = main.copy()
  app.run = function() {
    if (!this.defs.router) this.set('router', new Router(this.routes))
    return run.apply(this, arguments)
  }
  return app
}

exports.App = App

exports.Router = Router

exports.Route = require('./router/route')

exports.Zone = require('./router/zone')

exports.request = require('./http/request')

exports.response = require('./http/response')

for(let key in util) {
  exports[key] = util[key]
}
