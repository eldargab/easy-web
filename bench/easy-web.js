var App = require('..')
var app = App()

app.get('/', function(send) {
  send('Hello world')
})

var subapp = App()

subapp.get('/hello', function(send) {
  send('Hello world')
})

app.at('/subapp', 'sub', subapp)

app.createServer().listen(8000)
