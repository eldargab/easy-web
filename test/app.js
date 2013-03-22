var should = require('should')
var supertest = require('supertest')
var App = require('..')

describe('App', function () {
  var app

  function request (meth, path) {
    if (arguments.length == 1) {
      path = meth
      meth = 'get'
    }
    return supertest(app.createServer())[meth || 'get'](path || '/')
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

  describe('.route()', function () {
    it('Should accept route objects', function (done) {
      app.route({
        match: function (path, req) {
          if (path == '/hello') return 'hello'
        }
      }, 'hello', function (res) {
        res.send('hello').end()
      })
      request('/hello').expect('hello', done)
    })

    it('Should accept route functions', function (done) {
      app.route(function (path, req) {
        if (path == '/hello') return 'hello'
      }).def('hello', function (res) {
        res.send('hello').end()
      })
      request('/hello').expect('hello', done)
    })
  })

  describe('.at(path, ns, subapp | fn, aliases)', function () {
    describe('If path does not start with /', function () {
      it('Should work like .at(layer)', function () {
        app.at('app', function (app) {
          app.def('foo', function () {
            return 'foo'
          })
        })
        app.layer('app')
        app.run().eval('foo')
        app.get('foo').should.equal('foo')
      })
    })

    describe('When given a subapp', function () {
      it('Should install it and it\'s routes', function (done) {
        var sub = App()
        sub.get('/world', function (res, greeting) {
          res.send(greeting).end()
        })
        app.at('/hello', 'hello', sub, {'res': '*'})
        app.set('hello_greeting', 'Hello world')
        request('/hello/world').expect('Hello world', done)
      })

      it('Should allow namespace omission', function (done) {
        var sub = App()
        sub.get('/world', function (res, greeting) {
          res.send(greeting).end()
        })
        app.at('/hello', sub)
        app.set('greeting', 'Hello world')
        request('/hello/world').expect('Hello world', done)
      })
    })

    describe('When given a function', function () {
      it('Should install all routes at `path`', function (done) {
        app.at('/foo', function (app) {
          app.get('/bar', 'bar')
        })
        app.def('bar', function (res) {
          res.send('bar').end()
        })
        request('/foo/bar').expect(200, 'bar', function (err) {
          if (err) return done(err)
          request('/bar').expect(404, done)
        })
      })

      it('Should prefix all passed tasks with `ns`', function (done) {
        app.at('/foo', 'foo', function (app) {
          app.get('/bar', 'bar')
        })
        app.def('foo_bar', function (res) {
          res.send('bar').end()
        })
        request('/foo/bar').expect(200, 'bar', done)
      })

      it('Should support inline task definition', function (done) {
        app.at('/foo', 'foo', function (app) {
          app.get('/bar', function (res) { // note we are in global namespace
            res.send('bar').end()
          })
        })
        request('/foo/bar').expect(200, 'bar', done)
      })

      describe('Should support nesting', function () {
        it('subapp case', function (done) {
          var sub = App()
          sub.get('/qux', function (res) {
            res.send('qux').end()
          })
          app.at('/foo', 'foo', function (app) {
            app.at('/bar', 'bar', sub)
          })
          app.alias('foo_bar_res', 'res')
          request('/foo/bar/qux').expect('qux', done)
        })

        it('function case', function (done) {
          app.at('/foo', 'foo', function (app) {
            app.at('/bar', 'bar', function (app) {
              app.get('/qux', function (res) {
                res.send('qux').end()
              })
            })
          })
          request('/foo/bar/qux').expect('qux', done)
        })
      })
    })
  })
})
