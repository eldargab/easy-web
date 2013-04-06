var Container = require('easy-app')
var nsconcat = Container.nsconcat
var Router = require('./router')
var Route = require('./router/route')
var http = require('./http')
var methods = require('methods')
var STATUS_CODES = require('http').STATUS_CODES
var crc = require('buffer-crc32').signed

var App = module.exports = Container()

App.createServer = function() {
  var app = this.run()
    , request = this.request

  app.useweb()
  app.layer('app')

  function server(req, res) {
    req.__proto__ = request

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

App.request = http.request

App.dispatch = function(req, res) {
  var self = this
    , task

  this.set('httpRequest', req)
  this.set('httpResponse', res)

  try {
    task = this.router().dispatch(req.path, req)
  } catch (e) {
    this.onerror(e)
    return
  }

  this.eval(task, function(err) {
    if (err) self.onerror(err)
  })
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

App.env = ( process.env.NODE_ENV || '' ).toLowerCase()

App.onerror = function(e) {
  this.handleErrorResponse(e)
  this.handleError(e)
}

App.handleErrorResponse = function(err) {
  var res = this.get('httpResponse')
  if (!res) return

  var msg = '500 Internal server error.'
  if (this.env != 'production') {
    msg += '\n\n'
    msg += (err.stack || String(err))
    msg += '\n'
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

App.useweb = function() {
  if (!this.defined('req'))
    this.alias('req', 'httpRequest')

  if (!this.defined('res'))
    this.def('res', function(Response, httpRequest, httpResponse) {
      return new Response(httpRequest, httpResponse)
    })

  if (!this.defined('Response'))
    this.set('Response', http.Response)

  if (!this.defined('404'))
    this.def('404', function(req, res) {
      res
      .status(404)
      .type('text')
      .send('Cannot ' + req.method + ' ' + req.path)
      .end()
    })

  if (!this.defined('json_stringify'))
    this.def('app', 'json_stringify', function() {
      var production = this.env == 'production'
      var spaces = production ? 0 : 2
      return function stringify(obj) {
        return JSON.stringify(obj, null, spaces)
      }
    })

  if (!this.defined('send'))
    this.def('send', function(res, eval, json_stringify) {
      var app = this
      /*
       * Send a response.
       *
       * Supports signatures:
       *    send(body, [cb])
       *    send(code, body, [cb])
       *    send(type, body, [cb]) // body may be null or undefined, but must be passed
       *    send(code, type, body, [cb])
       *    send(code, [cb])
       *
       * @param {Number} code
       * @param {String} type
       * @param {String|Buffer|Object} body
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

        if (typeof type != 'string') {
          type = null
        }

        if (typeof status == 'number') {
          // send(404) -> general app level 404 response
          if (status == 404 && args.length == 1)
            return eval('404', function(err) {
              if (err) return app.onerror(err)
            })
        } else {
          status = 200
        }

        if (typeof body == 'number') body = null

        if (!body) {
          body = ''
        }

        var string
          , stream
          , buffer
          , json

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
            body = json_stringify(body)
          } catch (e) {
            return app.onerror(e)
          }
          res.type(type || 'application/json')
        } else if (string) {
          res.type(type || 'text/html')
        }

        res.status(status)
        res.send(body)

        cb ? cb(res) : res.end()
      }
    })

  if (!this.defined('redirect'))
    this.def('redirect', function(req, res) {
      var app = this
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
        res.type('text/plain')
        res.send(status + ' ' + STATUS_CODES[status] + '.'
          + ' Redirecting to ' + url)

        cb ? cb(res) : res.end()
      }
    })

  if (!this.defined('to'))
    this.def('app', 'to', function() {
      var router = this.router()
      return function getUrlFor(task, params) {
        if (task[0] == '/') task = task.slice(1)
        return router.getUrlFor(task, params)
      }
    })

  return this
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
  'req',
  'res',
  '404',
  'json_stringify',
  'send',
  'redirect',
  'to'
)
