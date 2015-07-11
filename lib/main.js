'use strict'

const go = require('go-async')
const Stream = require('easy-streaming')
const App = require('./app')
const util = require('./http/util')

const app = module.exports = new App

app.install(require('./http/request'))
app.install(require('./http/response'))

app.level('request', ['req'])
app.level('response', ['res'])

app.def('request', function*(route, evaluate, response) {
  try {
    var res = yield evaluate(route.name)
  } catch(e) {
    if (!e.http) throw e
    res = e
  }
  return response({res: res})
})

app.def('route', function(router, req, path) {
  let route = router.dispatch(path, req) || {}
  route.name = route.name || '404'
  route.params = route.params || {}
  return route
})

app.def('params', function(route) {
  return route.params
})

app.def('404', function() {
  return {status: 404}
})

app.def('ENV', function() {
  return 'development'
})

app.def('production', function(ENV) {
  return ENV == 'production'
})

app.def('handler', function(request, onerror) {
  return function(req, res) {
    request({
      req: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: Stream.sanitize(req)
      }
    }).get(function(err, r) {
      if (err) {
        r = onerror(err, req)
      }
      util.send(r, res)
    })
  }
})

app.def('onerror', function(production) {
  return function(err) {
    return util.statusPage(500, production ? null : err.stack)
  }
})

app.set('port', 3000)

app.def('server', function() {
  return require('http').createServer()
})

app.def('main', function(handler, server, port) {
  server.on('request', handler)
  server.listen(port)
  return new go.Future
})
