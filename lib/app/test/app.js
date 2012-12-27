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
    it('Should always respond with 404', function (done) {
      app = App()
      request().expect(404, done)
    })
  })

  it('Should dispatch tasks', function (done) {
    app.def('respond', function (httpResponse) {
      httpResponse.end('Hello')
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

  describe('response.end()', function () {
    it('Should send http response', function (done) {
      app.def('respond', function (response, done) {
        response.send('hello').end(done)
      })
      request().expect(200, 'hello', done)
    })
  })
})
