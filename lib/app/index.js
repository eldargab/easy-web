var App = require('./proto')

var exports = module.exports = function () {
  return App.run()
}

exports.Container = require('easy-app')

exports.http = require('../http')

