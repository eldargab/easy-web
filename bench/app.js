var app = require('..')()

app.get('/', function (res) {
  res.send('Hello world').end()
})

app.createServer().listen(4000)
