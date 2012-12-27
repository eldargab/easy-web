var Container = require('easy-app')
var sendStackTrace = require('connect').errorHandler()
var Router = require('../router')
var http = require('../http')

var App = module.exports = Container()

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
      .set('httpRequest', req)
      .set('httpResponse', res)

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
  sendStackTrace(e, this.get('httpRequest'), this.get('httpResponse'))
}

App.def('app', 'Response', function () {
  function Response (req, res) {
    this.req = req
    this.res = res
    http.Response.call(this)
  }

  Response.prototype.__proto__ = http.Response.prototype

  Response.prototype.end = function (cb) {
    if (this.statusCode == 404 && !this.body) {
      this.send('Can not ' + this.req.method + ' ' + this.req.path)
    }
    http.send(this.req, this.res, this, cb)
  }

  return Response
})

App.def('response', function (Response, httpRequest, httpResponse) {
  return new Response(httpRequest, httpResponse)
})

App.def('404', function (response, done) {
  response.status(404).end(done)
})

