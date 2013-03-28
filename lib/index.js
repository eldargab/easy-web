var App = require('./app')
var Container = require('easy-app')

exports = module.exports = function() {
  return App.run()
}

exports.nsconcat = Container.nsconcat

exports.nssuffix = Container.nssuffix

exports.http = require('./http')
