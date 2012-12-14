var Container = require('easy-app')
var sendStackTrace = require('connect').errorHandler()
var Router = require('../router')
var http = require('../http')

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
    req.__proto__ = http.Request

    var instance = app.run()
      .layer('request')
      .set('http_request', req)
      .set('http_response', res)

    var task

    try {
      task = router.dispatch(req.path, req)
    } catch (e) {
      instance.handleException(e)
      return
    }

    instance.eval(task, function (err) {
      if (err) instance.handleException(err)
    })
  }

  server.listen = function () {
    var server = require('http').createServer(this)
    return server.listen.apply(server, arguments)
  }

  return server
}

App.handleException = function (e) { // TODO: handle double calls and be more accurate in general
  sendStackTrace(e, this.get('http_request'), this.get('http_response'))
}

App.def('response', ['http_request', 'http_response'], function (req, res) {
  var o = new http.Response

  o.end = function (cb) {
    if (this.statusCode == 404 && !this.body) {
      this.send('Can not ' + req.method + ' ' + req.path)
    }
    http.send(req, res, this, cb)
  }

  return o
})

App.def('404', function (response, done) {
  response.status(404).end(done)
})

