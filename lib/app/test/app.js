var should = require('should')
var supertest = require('supertest')
var App = require('..')

describe('App', function () {
  var app

  function request (meth, path) {
    meth = meth || 'get'
    path = path || '/'
    return supertest(app.createServer())[meth](path)
  }

  beforeEach(function () {
    app = App()
    app.routes(function () {
      this.get('/', 'respond')
    })
  })

  describe('When there is no routes setuped', function () {
    it('Should always repond with 404', function (done) {
      app = App()
      request().expect(404, done)
    })
  })

  it('Should dispatch tasks', function (done) {
    app.def('respond', function (http_response) {
      http_response.end('Hello')
    })
    request().expect(200, 'Hello', done)
  })

  it('Should catch task exceptions', function (done) {
    app.def('respond', function () {
      throw new Error('shit happened')
    })
    request().expect(500, /shit/, done)
  })

  it('Should catch async errors', function (end) {
    app.def('respond', function (done) {
      done('shit happened')
    })
    request().expect(500, /shit/, end)
  })

  describe('response', function () {
    beforeEach(function () {
      app.alias('res', 'response')
    })

    it('.send(string)', function (done) {
      app.def('respond', function (res) {
        res.send('hello').end()
      })
      request().expect(200, 'hello', done)
    })

    it('.send(buf)', function (done) {
      app.def('respond', function (res) {
        res.send(new Buffer('hey')).end()
      })
      request().expect(200, 'hey', done)
    })

    it('.send(json)', function (done) {
       app.def('respond', function (res) {
        res.send({foo: 'bar'}).end()
      })
      request()
        .expect('Content-Type', 'application/json')
        .end(function (err, res) {
          if (err) return done(err)
          JSON.parse(res.text).should.eql({
            foo: 'bar'
          })
          done()
        })
    })
  })
})
