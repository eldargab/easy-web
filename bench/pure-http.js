var http = require('http')
var request = require('../lib/http/request')
var Response = require('../lib/http/response')
var Router = require('../lib/router')
var Route = require('../lib/router/route')

var router = new Router

router.push(new Route('GET', '/', 'hello'))

http.createServer(function(req, res) {
  req.__proto__ = request

  router.dispatch(req.path, req)

  new Response(req, res).send('Hello world').end()
}).listen(8000)
