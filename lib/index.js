var App = require('./app')

exports = module.exports = function () {
  return App.run()
}

exports.http = require('./http')

exports.Router = require('./router')

exports.Container = require('easy-app')
