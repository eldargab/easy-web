var Container = require('easy-app')
var sendStackTrace = require('connect').errorHandler()
var util = require('./util')
var Server = require('./server')
var Router = require('../router')

var proto = module.exports = new Container

proto.handleException = function (e) { // TODO: handle double calls and be more accurate in general
  sendStackTrace(e, this.get('request'), this.get('response'))
}

proto.install('http', require('../http').module, {
  'req': 'request',
  'res': 'response'
})

proto.def('404', function (request) {
  return util.send(404, 'text/plain', 'Can not ' + request.method + ' ' + request.path)
})

proto.routes = function (fn) {
  if (!this._router) this._router = new Router
  this._router.routes(fn)
  return this
}

proto.createServer = function () {
  var router = this._router || (this._router = new Router)
  return Server(this, router)
}

proto.use = function (fn) {
  var setup = fn
  arguments[0] = this
  setup.apply(this, arguments)
  return this
}
