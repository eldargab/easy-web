var Container = require('easy-app')
var nsconcat = Container.nsconcat
var createRouter = require('./router')
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
    , task

  this.set('httpRequest', req)
  this.set('httpResponse', res)

  req = new this.Request(req)

  this.set('req', req)

  try {
    task = this.router().dispatch(req.path, req)
  } catch (e) {
    this.onerror(e)
    return
  }

  this.eval(task || '404#', function(err) {
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
  return this._router = createRouter()
}

var taskid = 0

methods.concat('all').forEach(function(meth) {
  App[meth] = function(path, task, def, opts) {
    if (meth == 'get' && arguments.length == 1)
      return Container.prototype.get.call(this, path)

    if (typeof task == 'function') {
      opts = def
      def = task
      task = 'route' + (taskid++) + ' ' + path + '#'
    }

    this.route(new Route(meth.toUpperCase(), path, task, opts))

    if (def) {
      this.def(task, def)
    }

    return this
  }
})

App.route = function(route) {
  this.router().route(route)
  return this
}

App.at = function(path, ns, app, aliases) {
  if (path[0] != '/')
    return Container.prototype.at.apply(this, arguments)

  if (typeof ns != 'string') {
    aliases = app
    app = ns
    ns = ''
  }

  if (app.dispatch && app.getUrlFor) {
    // it is a router
    this.router().at(path, ns, app)
  } else {
    // it is a subapp installation
    if (typeof app == 'function') app = App.run().use(app)
    this.router().at(path, ns, app.router())
    this.install(ns, app, aliases)
  }

  return this
}

App.def('send', function(Response, req, httpResponse) {
  var app = this

  /*
   * Send a response.
   *
   *   send([code], [[type], body])
   *
   * @param {Number} code
   * @param {String} type
   * @param {Mixed} body
   * @return {Response}
   */

  return function send() {
    var last = arguments.length - 1
      , body = arguments[last]
      , type = arguments[last - 1]
      , status = arguments[0]
      , res = new Response(req, httpResponse, app)

    if (typeof type == 'string') {
      res.type(type)
    }

    if (typeof status == 'number') {
      res.status(status)
    }

    if (typeof body != 'number') {
      res.send(body)
    }

    process.nextTick(function() {
      if (!res.sent) res.end()
    })

    return res
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
      this.sent = false
    }

    Response.prototype = Object.create(http.Response.prototype)

    Response.prototype.end = function(cb) {
      var app = this.app
        , status = this.statusCode || 200
        , body = this.body
        , headers = this.headers
        , type = headers['content-type']

      if (this.sent) throw new Error('Response already sent')
      this.sent = true

      if (!body && !type && status >= 200 && status != 304 && status != 204) {
        body = status + ' ' + STATUS_CODES[status]
        headers['content-type'] = 'text/plain; charset=UTF8'
        http.send(this.req, this.res, status, headers, body, cb)
        return
      }

      if (typeof body == 'object' && !Buffer.isBuffer(body)) {
        try {
          body = JSON.stringify(body, null, app.env == 'production' ? 0 : 2)
        } catch (e) {
          app.onerror(e)
          return
        }
        if (!type) headers['content-type'] = 'application/json; charset=UTF-8'
      }

      http.send(this.req, this.res, status, headers, body, function(err) {
        if (err) app.onerror(err)
      })
    }

    return Response
  })
}

App.use404 = function() {
  if (this.defined('404#')) return
  this.def('404#', function(send) {
    send(404)
  })
}

App.useRedirect = function() {
  if (this.defined('redirect')) return
  this.def('redirect', function(Response, req, httpResponse) {
    var app = this

    return function redirect(status, url) {
      if (typeof status == 'string') {
        url = status
        status = 302
      }

      if (typeof url != 'string')
        throw new TypeError('Url should be a string')

      var res = new Response(req, httpResponse, app)

      url = url == 'back'
        ? req.get('Referer') || '/'
        : url

      res.status(status)
      res.set('Location', url)
      res.type('text')
      res.send(status + ' ' + STATUS_CODES[status] + '.'
        + ' Redirecting to ' + url)

      process.nextTick(function() {
        if (!res.sent) res.end()
      })

      return res
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
