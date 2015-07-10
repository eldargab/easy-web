'use strict'

const util = require('./http/util')
const main = require('./main')
const App = require('./app')
const Router = require('./router/router')
const run = App.prototype.run

App.prototype.run = function() {
  let app = main.copy()
  app.at('/', this)
  if (!app.defs.router) app.set('router', new Router(app.routes))
  return run.apply(app, arguments)
}

exports.App = App

exports.main = main

exports.Router = Router

exports.Route = require('./router/route')

exports.Zone = require('./router/zone')

exports.request = require('./http/request')

exports.response = require('./http/response')

for(let key in util) {
  exports[key] = util[key]
}
