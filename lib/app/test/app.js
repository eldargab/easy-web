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
  })

  describe('When there is no routes setuped', function () {
    it('Should always respond with 404', function (done) {
      request().expect(404, done)
    })
  })

  it('Should dispatch tasks', function (done) {
    app.get('/', function (res) {
      res.send('Hello').end()
    })
    request().expect(200, 'Hello', done)
  })

  it('Should respond with 500 on error', function (done) {
    app.get('/', function () {
      throw new Error('shit happened')
    })
    request().expect(500, /shit/, done)
  })
})
