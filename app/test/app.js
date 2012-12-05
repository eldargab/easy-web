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
    app.def('respond', function (response) {
      response.end('Hello')
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

  describe('http.send', function () {
    beforeEach(function () {
      app.alias('send', 'http.send')
    })

    it('send(body)', function (done) {
      app.def('respond', function (send) {
        send('hello')
      })
      request().expect(200, 'hello', done)
    })

    it('send(status)', function (done) {
      app.def('respond', function (send) {
        send(201)
      })
      request().expect(201, '', done)
    })

    it('send(status, body)', function (done) {
      app.def('respond', function (send) {
        send(401, 'go away!')
      })
      request().expect(401, 'go away!', done)
    })

    it('send(status, type, body)', function (done) {
      app.def('respond', function (send) {
        send(401, 'text/plain', 'foo')
      })
      request()
        .expect('Content-Type', 'text/plain')
        .expect(401, 'foo', done)
    })

    it('send(json)', function (done) {
       app.def('respond', function (send) {
        send({foo: 'bar'})
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

    it('send(buf)', function (done) {
      app.def('respond', function (send) {
        send(new Buffer('hey'))
      })
      request().expect('hey', done)
    })
  })
})
