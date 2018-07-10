const App = require('easy-app')
const go = require('go-async')
const http = require('http')


const app = module.exports = new App


app.def('PORT', function() {
  return process.env.PORT || 3000
})


app.level('requestHandler', 'serve', ['req', 'res'])


app.def('server', function() {
  return http.createServer()
})


app.def('listen', function(server, requestHandler, PORT) {
  let future = new go.Future

  server.on('close', function() {
    future.done()
  })

  server.on('error', function(err) {
    future.done(err)
    server.close()
  })

  server.on('request', function(req, res) {
    go(requestHandler, req, res).get(err => {
      if (err) onError(err, req, res)
    })
  })

  server.listen(PORT, function() {
    console.error('Listening on http://localhost:' + PORT)
  })

  return future
})


function onError(err, req, res) {
  console.error(err)
  if (res.headersSent) {
    res.destroy()
  } else {
    let msg = '500 Internal Sever Error'
    res.writeHead(500, {
      'Content-Type': 'text/plain; charset=UTF-8',
      'Content-Length': Buffer.byteLength(msg)
    })
    res.end(msg)
  }
}
