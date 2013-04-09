var App = require('..')
var app = App()

app.get('/', function(send) {
  send('Hello world')
})

app.get('/one-async-task', function(timeout, send) {
  send('One async task')
})

app.get('/just-set-immediate', function(send) {
  setImmediate(function() {
    send('setImmediate()')
  })
})

app.get('/async-computation', function(async_ab, async_cd, async_abcd, send) {
  send(async_ab + async_cd + async_abcd)
})

app.get('/sync-computation', function(ab, cd, abcd, send) {
  send(ab + cd + abcd)
})

app
.def('a', function() {
  return 'a'
})
.def('b', function() {
  return 'b'
})
.def('c', function() {
  return 'c'
})
.def('d', function() {
  return 'd'
})
.def('ab', function(a, b) {
  return a + b
})
.def('cd', function(c, d) {
  return c + d
})
.def('abcd', function(ab, cd) {
  return ab + cd
})
.def('async_ab', function(a, b, done) {
  setImmediate(function() {
    done(null, a + b)
  })
})
.def('async_cd', function(c, d, done) {
  setImmediate(function() {
    done(null, c + d)
  })
})
.def('async_abcd', function(async_ab, async_cd, done) {
  setImmediate(function() {
    done(null, async_ab + async_cd)
  })
})
.def('timeout', function(done) {
  setImmediate(done)
})


var subapp = App()

subapp.get('/hello', function(send) {
  send('Hello world')
})

app.at('/subapp', 'sub', subapp)

app.createServer().listen(8000)
