var App = require('..')
var app = App()

app.get('/', function (res) {
  res.send('Hello world').end()
})

var subapp = App()

subapp.get('/hello', function (res) {
  res.send('Hello world').end()
})

app.at('/subapp', 'sub', subapp, {'res': '*'})

app.createServer().listen(8000)
