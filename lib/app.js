var Container = require('easy-app')
var nsconcat = Container.nsconcat
var Router = require('./router')
var Route = require('./router/route')
var http = require('./http')
var methods = require('methods')

var App = module.exports = Container()

App.createServer = function () {
  var app = this.run().layer('app')
  var router = this.router()

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

App.router = function () {
  if (this._router) return this._router
  return this._router = new Router
}

methods.concat('all').forEach(function (meth) {
  App[meth] = function (path, task, def) {
    if (meth == 'get' && arguments.length == 1)
      return Container.prototype.get.call(this, path)
    var args = [].slice.call(arguments)
    return this.route.apply(this, [meth].concat(args))
  }
})

var taskid = 0

App.route = function (meth, path, task, def, opts) {
  if (typeof meth != 'string') {
    opts = def
    def = task
    task = path
  } else if (typeof task == 'function'){
    opts = def
    def = task
    task = 'handle ' + path + ' ' + taskid++
  } else if (typeof def == 'object') {
      opts = def
      def = null
  }

  var route
    , router = this._at_router || this.router()

  if (typeof meth == 'object') {
    route = meth
  } else if (typeof meth == 'function') {
    route = {match: meth}
  } else {
    meth = meth.toUpperCase()
    route = new Route(meth, path, task, opts)
  }

  router.push(route)

  if (def) {
    var ns = this._at_namespace
    this.def(nsconcat(ns, task), def)
  }

  return this
}

App.at = function (path, namespace, app, aliases) {
  if (path[0] != '/')
    return Container.prototype.at.apply(this, arguments)

  if (typeof namespace != 'string') {
    aliases = app
    app = namespace
    namespace = null
  }

  var router = this._at_router || this.router()
  var ns = nsconcat(this._at_namespace, namespace)

  if (typeof app == 'object') { // subapp installation
    router.push(app.router().at(path, namespace))
    this.install(ns, app, aliases)
  } else {
    var p_at_router = this._at_router
    var p_at_ns = this._at_namespace
    this._at_router = new Router().at(path, namespace)
    this._at_namespace = ns
    router.push(this._at_router)
    try {
      this.use(app)
    } finally {
      this._at_router = p_at_router
      this._at_namespace = p_at_ns
    }
  }
  return this
}

App.onerror = function (e) {
  var req = this.get('httpRequest')
  var res = this.get('httpResponse')
  var msg = e.stack || String(e)

  if (res && !res.headersSent) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'text/plain')
    http.send(req, res, msg)
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

  Response.prototype.setHeaders = function () {
    for (var key in this.headers) {
      this.res.setHeader(key, this.headers[key])
    }
  }

  Response.prototype.end = function (cb) {
    this.res.statusCode = this.statusCode
    this.setHeaders()
    http.send(this.req, this.res, this.body, cb)
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