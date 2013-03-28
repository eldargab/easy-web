var http = require('http')
var send = require('http-send')
var request = require('../lib/http/request')
var Router = require('../lib/router')
var Route = require('../lib/router/route')

var router = new Router

router.push(new Route('GET', '/', 'hello'))

http.createServer(function(req, res) {
  req.__proto__ = request

  router.dispatch(req.path, req)

  send(req, res, 'Hello world')
}).listen(8000)
