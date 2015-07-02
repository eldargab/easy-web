'use strict'

const App = require('./app')
const util = require('./http/util')

const app = module.exports = new App

app.install(require('./http/request'))
app.install(require('./http/response'))

app.level('request', ['req'])
app.level('serialize', ['res'])
app.level('response', ['httpResponse'])
app.level('error', ['err'])

app.def('request', function*(route, eval, error, response, serialize) {
  try {
    try {
      var res = yield eval(route.name)
    } catch(e) {
      if (!e.http) throw e
      res = e
    }
    res.headers = res.headers || {}
    yield serialize({res: res})
  } catch(e) {
    res = error({err: e})
  }
  return response({httpResponse: res})
})

app.def('route', function(router, req, path) {
  let route = router.dispatch(path, req)
  route.name = route.name || 'http404'
  route.params = route.params || {}
  return route
})

app.def('params', function(route) {
  return route.params
})

app.def('error', function(err, production) {
  return production ? util.statusPage(500) : util.statusPage(500, err.stack)
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
