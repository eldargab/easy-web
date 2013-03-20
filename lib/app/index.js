var Container = require('easy-app')
var Router = require('../router')
var http = require('../http')
var methods = require('methods')

exports = module.exports = function () {
  return App.run()
}

exports.http = http

exports.Container = Container

var App = Container()

App.createServer = function () {
  var app = this.run().layer('app')
  var router = this.router = this.router || new Router

  function server (req, res) {
    req.__proto__ = http.Request

    var instance = app.run()
      .layer('request')
      .set('httpRequest', req)
      .set('httpResponse', res)

    try {
      var task = router.dispatch(req.path, req)
    } catch (e) {
      instance.onerror(e)
      return
    }

    instance.eval(task, function (err) {
      if (err) instance.onerror(err)
    })
  }

  server.listen = function () {
    var server = require('http').createServer(this)
    return server.listen.apply(server, arguments)
  }

  return server
}

methods.concat('all').forEach(function (meth) {
  App[meth] = function (path, task, def) {
    if (meth == 'get' && arguments.length == 1)
      return Container.prototype.get.call(this, path)

    this.router = this.router || new Router

    if (typeof task == 'function') {
      def = task
      task = 'handle ' + path
    }

    this.router[meth](path, task)
    if (def) this.def(task, def)
    return this
  }
})

App.onerror = function (e) {
  var req = this.get('httpRequest')
  var res = this.get('httpResponse')
  var msg = e.stack || String(e)

  if (res && !res.headersSent) {
    http.send(req, res, {
      statusCode: 500,
      headers: {
        'content-type': 'text/plain'
      },
      body: msg
    })
  }
}

App.alias('req', 'httpRequest')

App.def('app', 'Response', function () {
  function Response (req, res) {
    this.req = req
    this.res = res
    http.Response.call(this)
  }

  Response.prototype.__proto__ = http.Response.prototype

  Response.prototype.end = function (cb) {
    http.send(this.req, this.res, this, cb)
  }

  return Response
})

App.def('res', function (Response, httpRequest, httpResponse) {
  return new Response(httpRequest, httpResponse)
})

App.def('404', function (req, res) {
  res
  .status(404)
  .type('text')
  .send('Cannot ' + req.method + ' ' + req.path)
  .end()
})
