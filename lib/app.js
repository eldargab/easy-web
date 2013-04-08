var Container = require('easy-app')
var nsconcat = Container.nsconcat
var Router = require('./router')
var Route = require('./router/route')
var http = require('./http')
var methods = require('methods')
var STATUS_CODES = require('http').STATUS_CODES

var App = module.exports = Container()

App.createServer = function() {
  var app = this.run()

  app.useWeb()
  app.layer('app')

  function server(req, res) {
    app
    .run()
    .layer('request')
    .dispatch(req, res)
  }

  server.listen = function() {
    var server = require('http').createServer(this)
    return server.listen.apply(server, arguments)
  }

  return server
}

App.Request = http.Request

App.dispatch = function(req, res) {
  var self = this
    , Request = this.Request

  this.set('httpRequest', req)
  this.set('httpResponse', res)
  this.set('req', req = new Request(req))

  try {
    var task = this.router().dispatch(req.path, req)
  } catch (e) {
    this.onerror(e)
    return
  }

  this.eval(task, function(err) {
    if (err) self.onerror(err)
  })
}

App.onerror = function(e) {
  this.handleErrorResponse(e)
  this.handleError(e)
}

App.env = ( process.env.NODE_ENV || '' ).toLowerCase()

App.handleErrorResponse = function(err) {
  var res = this.get('httpResponse')
  if (!res) return

  var msg = '500 Internal server error.'
  if (this.env != 'production') {
    msg += '\n\n'
    msg += (err.stack || String(err))
    msg += '\n\n'
    msg += 'Task : ' + err._task
    msg += '\n'
    msg += 'Layer: ' + err._layer
  }

  if (res.headersSent) {
    res.destroy()
  } else {
    res.writeHead(500, {
      'Content-Type': 'text/plain; charset=UTF-8',
      'Content-Length': Buffer.byteLength(msg)
    })
    res.end(msg)
  }
}

App.doNotLogErrors = false

App.handleError = function(err) {
  if (this.doNotLogErrors) return
  console.error(err.stack || String(err))
  console.error('Task : ' + err._task)
  console.error('Layer: ' + err._layer + '\n')
}

App.router = function() {
  if (this._router) return this._router
  return this._router = new Router
}

methods.concat('all').forEach(function(meth) {
  App[meth] = function(path, task, def) {
    if (meth == 'get' && arguments.length == 1)
      return Container.prototype.get.call(this, path)
    var args = [].slice.call(arguments)
    return this.route.apply(this, [meth].concat(args))
  }
})

var taskid = 0

App.route = function(meth, path, task, def, opts) {
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

App.at = function(path, namespace, app, aliases) {
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

App.def('send', function(Response, req, httpResponse) {
  var res = new Response(req, httpResponse, this)

  /*
   * Send a response.
   *
   *   send([code], [[type], body], [cb])
   *
   * @param {Number} code
   * @param {String} type
   * @param {Mixed} body
   * @param {Function} cb
   */
  return function send() {
    var args = arguments
      , last = args.length - 1
      , status = args[0]
      , type
      , body
      , cb

    if (typeof args[last] == 'function') {
      cb = args[last]
      body = args[last - 1]
      type = args[last - 2]
    } else {
      body = args[last]
      type = args[last - 1]
    }

    if (typeof type == 'string') {
      res.type(type)
    }

    if (typeof status == 'number') {
      res.status(status)
    }

    if (typeof body != 'number') {
      res.send(body)
    }

    cb ? cb(res) : res.end()
  }
})

App.useWeb = function() {
  this.useResponse()
  this.use404()
  this.useRedirect()
  this.useTo()
  return this
}

App.useResponse = function() {
  if (this.defined('Response')) return
  this.def('app', 'Response', function() {
    function Response(req, res, app) {
      this.req = req
      this.res = res
      this.app = app
      this.headers = {}
    }

    Response.prototype = Object.create(http.Response.prototype)

    Response.prototype.end = function(cb) {
      var app = this.app
        , status = this.statusCode || 200
        , body = this.body
        , headers = this.headers
        , type = headers['content-type']
        , string
        , stream
        , buffer
        , json

        if (!body && !type && status >= 200 && status != 304 && status != 204) {
          body = status + ' ' + STATUS_CODES[status]
          headers['content-type'] = 'text/plain; charset=UTF8'
          http.send(this.req, this.res, status, headers, body, cb)
          return
        }

        if (typeof body == 'string') {
          string = true
        } else if (Buffer.isBuffer(body)) {
          buffer = true
        } else if (typeof body.pipe == 'function') {
          stream = true
        } else {
          json = true
        }

        if (json) {
          try {
            body = JSON.stringify(body, null, app.env == 'production' ? 0 : 2)
          } catch (e) {
            app.onerror(e)
            return
          }
          type = type || 'application/json'
        } else if (string) {
          type = type || 'text/html; charset=UTF-8'
        }

        headers['content-type'] = type

        http.send(this.req, this.res, status, headers, body, cb)
    }

    return Response
  })
}

App.use404 = function() {
  if (this.defined('404')) return
  this.def('404', function(send) {
    send(404)
  })
}

App.useRedirect = function() {
  if (this.defined('redirect')) return
  this.def('redirect', function(Response, req, httpResponse) {
    var res = new Response(req, httpResponse, this)
      , app = this

    return function redirect(status, url, cb) {
      if (typeof status == 'string') {
        cb = url
        url = status
        status = 302
      }

      if (typeof url != 'string')
        return app.onerror(new TypeError('Url should be a string'))

      url = url == 'back'
        ? req.get('Referer') || '/'
        : url

      res.status(status)
      res.set('Location', url)
      res.type('text')
      res.send(status + ' ' + STATUS_CODES[status] + '.'
        + ' Redirecting to ' + url)

      cb ? cb(res) : res.end()
    }
  })
}

App.useTo = function() {
  if (this.defined('to')) return
  this.def('app', 'to', function() {
    var router = this.router()
    return function getUrlFor(task, params) {
      if (task[0] == '/') task = task.slice(1)
      return router.getUrlFor(task, params)
    }
  })
}

App.onsubapp = function (ns, app) {
  this.define_to_forSubapp(ns, app)
}

App.define_to_forSubapp = function(ns, app) {
  if (!ns) return
  if (!app.imports('to')) return
  var t = nsconcat(ns, 'to')
  if (this.defined(t)) return
  this.def('app', t, function(to) {
    return function getUrlFor(task, params) {
      if (task[0] == '/') return to(task, params)
      task = nsconcat(ns, task)
      return to(task, params)
    }
  })
}

App.importing(
  'httpRequest',
  'httpResponse',
  'Response',
  'req',
  '404',
  'redirect',
  'to'
)
