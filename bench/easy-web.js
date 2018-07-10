const Web = require('..')
const app = new Web


app.route('GET', '/', 'hello')
app.def('hello', function(send) {
  return send(200, 'text/plain', 'Hello world')
})


app.set('PORT', 8000)
app.run('listen').get(function(err) {
  if (err) throw err
})
