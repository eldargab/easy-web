var should = require('should')
var supertest = require('supertest')
var App = require('..')

describe('App', function() {
  var app

  function request(meth, path) {
    if (arguments.length == 1) {
      path = meth
      meth = 'get'
    }
    return supertest(app.createServer())[meth || 'get'](path || '/')
  }

  beforeEach(function() {
    app = App()
  })

  describe('When there is no routes setuped', function() {
    it('Should respond with 404', function(done) {
      request().expect(404, done)
    })
  })

  it('Should dispatch tasks', function(done) {
    app.get('/', function(send) {
      send('Hello')
    })
    request().expect(200, 'Hello', done)
  })

  it('Should respond with 500 on error', function(done) {
    app.doNotLogErrors = true
    app.get('/', function() {
      throw new Error('shit happened')
    })
    request().expect(500, /shit/, done)
  })

  describe('.route()', function() {
    function hello(req, send) {
      var greeting = 'hello'
      var whom = req.param('whom') || ''
      if (whom) whom = ' ' + whom
      send(greeting + whom)
    }

    function expect(body, done) {
      request('/').expect(body, done)
    }

    function match(path) {
      if (path == '/') return 'hello'
    }

    var opts = {
      p: {
        whom: 'world'
      }
    }

    describe('Should accept route objects', function() {
      it('route, task, def', function(done) {
        app.route({
          match: match
        }, 'hello', hello)
        expect('hello', done)
      })

      it('route', function(done) {
        app.route({
          match: match
        }).def('hello', hello)
        expect('hello', done)
      })
    })

    describe('Should accept route functions', function() {
      it('route, task, def', function(done) {
        app.route(match, 'hello', hello)
        expect('hello', done)
      })

      it('route', function(done) {
        app.route(match).def('hello', hello)
        expect('hello', done)
      })
    })

    describe('Should accept regular route definitions', function() {
      it('meth, path, task, def, opts', function(done) {
        app.route('get', '/', 'hello', hello, opts)
        expect('hello world', done)
      })

      it('meth, path, def, opts', function(done) {
        app.route('get', '/', hello, opts)
        expect('hello world', done)
      })

      it('meth, path, task, opts', function(done) {
        app.route('get', '/', 'hello', opts).def('hello', hello)
        expect('hello world', done)
      })
    })
  })

  describe('.at(path, ns, subapp | fn, aliases)', function() {
    describe('When given a path not starting with /', function() {
      it('Should work like .at(layer)', function() {
        app.at('app', function(app) {
          app.def('foo', function() {
            return 'foo'
          })
        })
        app.layer('app')
        app.run().eval('foo')
        app.get('foo').should.equal('foo')
      })
    })

    describe('When given a subapp', function() {
      it('Should install subapp and it\'s routes', function(done) {
        var sub = App()
        sub.get('/world', function(send, greeting) {
          send(greeting)
        })
        app.at('/hello', 'hello', sub)
        app.set('hello_greeting', 'Hello world')
        request('/hello/world').expect('Hello world', done)
      })

      it('Should allow namespace omission', function(done) {
        var sub = App()
        sub.get('/world', function(send, greeting) {
          send(greeting)
        })
        app.at('/hello', sub)
        app.set('greeting', 'Hello world')
        request('/hello/world').expect('Hello world', done)
      })
    })

    describe('When given a function', function() {
      it('Should install all routes at `path`', function(done) {
        app.at('/foo', function(app) {
          app.get('/bar', 'bar')
        })
        app.def('bar', function(send) {
          send('bar')
        })
        request('/foo/bar').expect(200, 'bar', function(err) {
          if (err) return done(err)
          request('/bar').expect(404, done)
        })
      })

      it('Should prefix all passed tasks with `ns`', function(done) {
        app.at('/foo', 'foo', function(app) {
          app.get('/bar', 'bar')
        })
        app.def('foo_bar', function(send) {
          send('bar')
        })
        request('/foo/bar').expect(200, 'bar', done)
      })

      it('Should support inline task definition', function(done) {
        app.at('/foo', 'foo', function(app) {
          app.get('/bar', function(send) { // note we are in global namespace
            send('bar')
          })
        })
        request('/foo/bar').expect(200, 'bar', done)
      })

      describe('Should support nesting', function() {
        it('subapp case', function(done) {
          var sub = App()
          sub.get('/qux', function(send) {
            send('qux')
          })
          app.at('/foo', 'foo', function(app) {
            app.at('/bar', 'bar', sub)
          })
          app.alias('foo_bar_res', 'res')
          request('/foo/bar/qux').expect('qux', done)
        })

        it('function case', function(done) {
          app.at('/foo', 'foo', function(app) {
            app.at('/bar', 'bar', function(app) {
              app.get('/qux', function(send) {
                send('qux')
              })
            })
          })
          request('/foo/bar/qux').expect('qux', done)
        })
      })
    })
  })

  describe('to(task, params)', function() {
    it('Should return url for `task`', function(done) {
      app.useweb()
      app.get('/hello/{world}', 'hello')
      app.eval('to', function(err, to) {
        to('hello', {world: 'world'}).should.equal('/hello/world')
        to('/hello', {world: 'world'}).should.equal('/hello/world')
        done()
      })
    })

    describe('Within subapp', function() {
      describe('Given a task without leading `/`', function() {
        it('Should resolve task relative to subapp namespace', function(done) {
          var sub = App()
          sub.get('/foo/{param}', 'foo')
          sub.def('url', function(to) {
            return to('foo', {param: 'bar'})
          })

          app.get('/foo', 'foo')
          app.at('/sub', 'sub', sub)
          app.useweb()

          app.eval('sub_url', function(err, url) {
            url.should.equal('/sub/foo/bar')
            done()
          })
        })
      })

      describe('Given a task with leading `/`', function() {
        it('Should resolve task in a global namespace', function(done) {
          var sub = App()
          sub.get('/hello', 'foo')
          sub.def('url', function(to) {
            return to('/foo', {param: 'bar'})
          })

          app.at('/sub', 'sub', sub)
          app.get('/foo/{param}', 'foo')
          app.useweb()

          app.eval('sub_url', function(err, url) {
            url.should.equal('/foo/bar')
            done()
          })
        })
      })
    })

    it('Should work within deep subapp', function(done) {
      var sub = App()
      sub.get('/foo/{param}', 'foo')
      sub.def('url', function(to) {
        return to('foo', {param: 'bar'})
      })

      app.useweb()
      app.get('/foo', 'foo')
      app.at('/1', 'l1', App().at('/2', 'l2', sub))

      app.eval('l1_l2_url', function(err, url) {
        url.should.equal('/1/2/foo/bar')
        done()
      })
    })
  })

  describe('send', function() {
    describe('send(code)', function() {
      it('Should set status and send response', function(done) {
        app.get('/', function(send) {
          send(201)
        })
        request('/').expect(201, done)
      })
    })

    describe('send(code, cb)', function() {
      it('Should set status and delegate response to callback', function(done) {
        app.get('/', function(send) {
          send(302, function(res) {
            res.statusCode.should.equal(302)
            res.send('redirect')
            res.end()
          })
        })
        request('/').expect(302, 'redirect', done)
      })
    })

    describe('send(404)', function() {
      it('Should mean "send general app level 404 response"', function(done) {
        app.get('/', function(send) {
          send(404)
        })
        request('/').expect(404, /Cannot GET/, done)
      })
    })

    describe('send(body)', function() {
      it('Should send `body`', function(done) {
        app.get('/', function(send) {
          send('hello')
        })
        request('/').expect(200, 'hello', done)
      })
    })

    describe('send(body, cb)', function() {
      it('Should set body and delegate response to callback', function(done) {
        app.get('/', function(send) {
          send('hello', function(res) {
            res.body.should.equal('hello')
            res.send('foo')
            res.end()
          })
        })
        request('/').expect('foo', done)
      })
    })

    describe('send(status, body)', function() {
      it('Should set status and send `body`', function(done) {
        app.get('/', function(send) {
          send(201, 'hello')
        })
        request('/').expect(201, 'hello', done)
      })
    })

    describe('send(status, body, cb)', function() {
      it('Should set status, body and delegate response to callback', function(done) {
        app.get('/', function(send) {
          send(201, 'hello', function(res) {
            res.statusCode.should.equal(201)
            res.body.should.equal('hello')
            res.send('foo')
            res.end()
          })
        })
        request('/').expect(201, 'foo', done)
      })
    })

    describe('send(status, type, body)', function() {
      it('Should set status, Content-Type and send body', function(done) {
        app.get('/', function(send) {
          send(201, 'foo/bar', 'hello')
        })
        request('/')
          .expect('Content-Type', 'foo/bar')
          .expect(201, 'hello', done)
      })
    })

    describe('send(status, type, body, cb)', function() {
      it('Should set status, Content-Type, body and delegate response to callback', function(done) {
        app.get('/', function(send) {
          send(201, 'foo/bar','hello', function(res) {
            res.statusCode.should.equal(201)
            res.body.should.equal('hello')
            res.type().should.equal('foo/bar')
            res.send('foo')
            res.end()
          })
        })
        request('/')
          .expect('Content-Type', 'foo/bar')
          .expect(201, 'foo', done)
      })
    })

    describe('send(type, body)', function() {
      it('Should set Content-Type and send body', function(done) {
        app.get('/', function(send) {
          send('foo/bar', 'hello')
        })
        request('/')
          .expect('Content-Type', 'foo/bar')
          .expect(200, 'hello', done)
      })
    })

    describe('send(type, body, cb)', function() {
      it('Should set Content-Type, body and delegate response to callback', function(done) {
        app.get('/', function(send) {
          send('foo/bar','hello', function(res) {
            res.body.should.equal('hello')
            res.type().should.equal('foo/bar')
            res.send('foo')
            res.end()
          })
        })
        request('/')
          .expect('Content-Type', 'foo/bar')
          .expect(200, 'foo', done)
      })
    })

    describe('Given a json body', function() {
      it('Should send json', function(done) {
        app.get('/', function(send) {
          send({foo: 'bar'})
        })
        request('/')
          .expect(200)
          .expect('Content-Type', 'application/json')
          .expect({foo: 'bar'}, done)
      })

      it('Should catch serialization errors', function(done) {
        app.doNotLogErrors = true
        app.get('/', function(send) {
          var obj = {}
          obj.self = obj
          send(obj)
        })
        request('/')
          .expect(500, /circular/, done)
      })

      it('Should not override Content-Type', function(done) {
        app.get('/', function(send) {
          send('text/x-json', {foo: 'bar'})
        })
        request('/')
          .expect(200)
          .expect('Content-Type', 'text/x-json')
          .expect(/bar/, done)
      })
    })

    describe('Given a string body', function() {
      it('Should default Content-Type to text/html', function(done) {
        app.get('/', function(send) {
          send('hello')
        })
        request('/')
          .expect('Content-Type', 'text/html', done)
      })
    })

    describe('Given a buffer body', function() {
      it('Should default Content-Type to application/octet-stream', function(done) {
        app.get('/', function(send) {
          send(new Buffer('hello'))
        })
        request('/')
          .expect('Content-Type', 'application/octet-stream', done)
      })
    })
  })

  describe('redirect', function() {
    describe('redirect(url)', function() {
      it('Should redirect to `url`', function(done) {
        app.get('/', function(redirect) {
          redirect('http://example.com/')
        })
        request('/')
          .expect(302)
          .expect('Location', 'http://example.com/')
          .expect('302 Moved Temporarily. Redirecting to http://example.com/', done)
      })
    })

    describe('redirect("back")', function() {
      it('Should should mean "redirect to Referer"', function(done) {
        app.get('/', function(redirect) {
          redirect('back')
        })
        request('/')
          .set('Referer', 'http://example.com/')
          .expect('Location', 'http://example.com/')
          .expect(302, done)
      })
    })

    describe('redirect(url, cb)', function() {
      it('Should prepare response for redirection and delegate it to callback', function(done) {
        app.get('/', function(redirect) {
          redirect('http://example.com/', function(res) {
            res.statusCode.should.equal(302)
            res.get('Location').should.equal('http://example.com/')
            res.send('foo')
            res.end()
          })
        })
        request('/')
          .expect(302)
          .expect('Location', 'http://example.com/')
          .expect('foo', done)
      })
    })

    describe('redirect(status, url)', function() {
      it('Should redirect with passed status', function(done) {
        app.get('/', function(redirect) {
          redirect(303, '/foo/bar')
        })
        request('/')
          .expect('Location', '/foo/bar')
          .expect(303, done)
      })
    })

    describe('redirect(status, url, cb)', function() {
      it('Should prepare response for redirection and delegate it to callback', function(done) {
        app.get('/', function(redirect) {
          redirect(303, 'http://example.com/', function(res) {
            res.statusCode.should.equal(303)
            res.get('Location').should.equal('http://example.com/')
            res.send('foo')
            res.end()
          })
        })
        request('/')
          .expect(303)
          .expect('Location', 'http://example.com/')
          .expect('foo', done)
      })
    })
  })
})
