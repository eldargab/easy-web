var http = require('http')

http.createServer(function(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Content-Length': '11'
  })
  res.end('Hello world')
}).listen(8000)
