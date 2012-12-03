var App = require('./app')
var http = require('../http')
var util = require('./util')

var exports = module.exports = function () {
  return App.run().layer('app')
}

exports.Send = http.Send

exports.send = util.send

exports.json = util.json

exports.Action = util.Action

exports.action = util.action

