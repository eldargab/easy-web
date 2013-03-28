var App = require('..')
var http = require('http')
var request = App.http.Request
var send = App.http.send
var Router = App.Router
var Route = App.Route

var router = new Router

router.push(new Route('GET', '/', 'hello'))

http.createServer(function(req, res) {
  req.__proto__ = request

  router.dispatch(req.path, req)

  send(req, res, 'Hello world')
}).listen(8000)
