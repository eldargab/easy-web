var App = require('./app')
var Container = require('easy-app')

exports = module.exports = function(setup) {
  var app = App.run()
  if (setup) app.use.apply(app, arguments)
  return app
}

exports.nsconcat = Container.nsconcat

exports.nssuffix = Container.nssuffix

exports.http = require('./http')

exports.createRouter = require('./router')
