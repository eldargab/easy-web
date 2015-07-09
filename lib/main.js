'use strict'

const App = require('./app')
const util = require('./http/util')
const Stream = require('easy-streaming')

const app = module.exports = new App

app.install(require('./http/request'))
app.install(require('./http/response'))

app.level('request', ['req'])
app.level('response', ['res'])

app.def('request', function*(route, eval, response) {
  try {
    var res = yield eval(route.name)
  } catch(e) {
    if (!e.http) throw e
    res = e
  }
  return response({res: res})
})

app.def('route', function(router, req, path) {
  let route = router.dispatch(path, req) || {}
  route.name = route.name || 'http404'
  route.params = route.params || {}
  return route
})

app.def('params', function(route) {
  return route.params
})

app.def('http404', function() {
  return {status: 404}
})

app.def('ENV', function() {
  return process.env.NODE_ENV || 'development'
})

app.def('production', function(ENV) {
  return ENV == 'production'
})

app.def('handler', function(request, onerror) {
  return function(req, res) {
    request({
      req: {
        method: req.method,
        headers: req.headers,
        body: Stream.sanitize(req)
      }
    }).get(function(err, r) {
      if (err) {
        r = onerror(err)
      }
      res.writeHead(r.status, r.headers)
      if (r.body && typeof r.body.read == 'function') {
        Stream.sink(r, res)
      } else {
        res.end(r.body)
      }
    })
  }
})

app.def('onerror', function(production) {
  return function(err) {
    return util.statusPage(500, production ? null : err.stack)
  }
})
