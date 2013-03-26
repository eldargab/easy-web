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
    it('Should respond with 404', function (done) {
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
    function hello (req, res) {
      var greeting = 'hello'
      var whom = req.param('whom') || ''
      if (whom) whom = ' ' + whom
      res.send(greeting + whom).end()
    }

    function expect (body, done) {
      request('/').expect(body, done)
    }

    function match (path) {
      if (path == '/') return 'hello'
    }

    var opts = {
      p: {
        whom: 'world'
      }
    }

    describe('Should accept route objects', function () {
      it('route, task, def', function (done) {
        app.route({
          match: match
        }, 'hello', hello)
        expect('hello', done)
      })

      it('route', function (done) {
        app.route({
          match: match
        }).def('hello', hello)
        expect('hello', done)
      })
    })

    describe('Should accept route functions', function () {
      it('route, task, def', function (done) {
        app.route(match, 'hello', hello)
        expect('hello', done)
      })

      it('route', function (done) {
        app.route(match).def('hello', hello)
        expect('hello', done)
      })
    })

    describe('Should accept regular route definitions', function () {
      it('meth, path, task, def, opts', function (done) {
        app.route('get', '/', 'hello', hello, opts)
        expect('hello world', done)
      })

      it('meth, path, def, opts', function (done) {
        app.route('get', '/', hello, opts)
        expect('hello world', done)
      })

      it('meth, path, task, opts', function (done) {
        app.route('get', '/', 'hello', opts).def('hello', hello)
        expect('hello world', done)
      })
    })
  })

  describe('.at(path, ns, subapp | fn, aliases)', function () {
    describe('When given a path not starting with /', function () {
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
      it('Should install subapp and it\'s routes', function (done) {
        var sub = App()
        sub.get('/world', function (res, greeting) {
          res.send(greeting).end()
        })
        app.at('/hello', 'hello', sub)
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
