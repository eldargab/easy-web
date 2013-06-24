var App = require('./app')

exports = module.exports = function() {
  return App.run()
}

exports.nsconcat = require('easy-app').nsconcat

exports.nssuffix = require('easy-app').nssuffix

exports.http = require('./http')

exports.createRouter = require('./router')
