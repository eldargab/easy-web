var should = require('should')
var supertest = require('supertest')
var App = require('..')
var send = App.send
var Action = App.Action

function respond (app) {
  app.routes(function () {
    this.get('/', 'respond')
  })
}

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
    it('Should always repond with 404', function (done) {
      request().expect(404, done)
    })
  })

  it('Should dispatch tasks', function (done) {
    app.def('respond', function (response) {
      response.end('Hello')
    })
    .use(respond)

    request().expect(200, 'Hello', done)
  })

  it('Should dispatch tasks and actions recursively', function (done) {
    app.def('respond', function (done) {
      done(null, 'bar')
    })
    .def('bar', function () {
      return 'baz'
    })
    .def('baz', function () {
      return new Action('qux')
    })
    .def('qux', function (response) {
      return function () {
        response.end('hi')
      }
    })
    .use(respond)

    request().expect(200, 'hi', done)
  })

  it('Should catch task exceptions', function (done) {
    app.def('respond', function () {
      throw new Error('shit happened')
    })
    .use(respond)

    request().expect(500, /shit/, done)
  })

  it('Should catch async errors', function (end) {
    app.def('respond', function (done) {
      done('shit happened')
    })
    .use(respond)

    request().expect(500, /shit/, end)
  })

  it('Should catch action exceptions', function (done) {
    app.def('respond', function () {
      return new Action('foo')
    })
    .def('foo', function () {
      return function () {
        throw new Error('action error')
      }
    })
    .use(respond)

    request().expect(500, /action error/, done)
  })

  it('Should catch async action errors', function (done) {
    app.def('respond', function () {
      return new Action('foo')
    })
    .def('foo', function () {
      return function (cb) {
        cb(new Error('action error'))
      }
    })
    .use(respond)

    request().expect(500, /action error/, done)
  })

  it('Http module should be installed', function (done) {
    app.def('respond', function () {
      return send('http is here')
    })
    .use(respond)

    request().expect(200, 'http is here', done)
  })
})
