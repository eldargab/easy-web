var Container = require('easy-app')
var sendStackTrace = require('connect').errorHandler()
var Router = require('../router')
var Request = require('./request')

var App = module.exports = Container()

App.use = function (fn) {
  var setup = fn
  arguments[0] = this
  setup.apply(this, arguments)
  return this
}

App.routes = function (fn) {
  if (!this._router) this._router = new Router
  this._router.routes(fn)
  return this
}

App.createServer = function () {
  var router = this._router || (this._router = new Router)
  var app = this

  function server (req, res) {
    req.__proto__ = Request

    var instance = app.run()
      .layer('request')
      .set('request', req)
      .set('response', res)

    var task

    try {
      task = router.dispatch(req.path, req)
    } catch (e) {
      instance.handleException(e)
      return
    }

    instance.eval(task, function (err) {
      if (err) return instance.handleException(err)
    })
  }

  server.listen = function () {
    var server = require('http').createServer(this)
    return server.listen.apply(server, arguments)
  }

  return server
}

App.handleException = function (e) { // TODO: handle double calls and be more accurate in general
  sendStackTrace(e, this.get('request'), this.get('response'))
}

App.install('http', require('./http'), {
  'req': 'request',
  'res': 'response'
})

App.def('404', ['request', 'http.send'], function (req, send) {
  send(404, 'text/plain', 'Can not ' + req.method + ' ' + req.path)
})

