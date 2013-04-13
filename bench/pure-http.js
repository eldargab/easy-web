var http = require('http')
var Request = require('../lib/http/request')
var Response = require('../lib/http/response')
var Router = require('../lib/router')

var router = Router().get('/', 'hello')

http.createServer(function(req, res) {

  router.dispatch(new Request(req).path, req)

  new Response(req, res).send('Hello world').end()
}).listen(8000)
