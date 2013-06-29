var should = require('should')
var supertest = require('supertest')
var App = require('..')
var Router = App.createRouter

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


  describe('.at(path, ns, subapp | subrouter | fn, aliases)', function() {
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

    describe('When given a subrouter', function() {
      it('Should install subrouter', function(done) {
        var sub = Router(function(r) {
          r.get('/world', 'world')
        })
        app.at('/hello', 'hello', sub)
        app.def('hello_world', function(send) {
          send('world')
        })
        request('/hello/world').expect('world', done)
      })

      it('Should allow namespace omission', function(done) {
        var sub = Router(function(r) {
          r.get('/world', 'world')
        })
        app.at('/hello', sub)
        app.def('world', function(send) {
          send('world')
        })
        request('/hello/world').expect('world', done)
      })
    })

    describe('When given a function', function() {
      it('Should create subapp and setup it with the given function', function(done) {
        app.at('/hello', function(hello) {
          hello.get('/world', function(send) {
            send('Hello world')
          })
          this.should.equal(hello)
        })
        request('/hello/world').expect('Hello world', done)
      })
    })
  })

  describe('to(task, params)', function() {
    it('Should return url for `task`', function(done) {
      app.useWeb()
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
          app.useWeb()

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
          app.useWeb()

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

      app.useWeb()
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

    describe('send(body)', function() {
      it('Should send `body`', function(done) {
        app.get('/', function(send) {
          send('hello')
        })
        request('/').expect(200, 'hello', done)
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

    describe('send(status, type, body)', function() {
      it('Should set status, Content-Type and send body', function(done) {
        app.get('/', function(send) {
          send(201, 'foo/bar', null)
        })
        request('/')
          .expect('Content-Type', 'foo/bar')
          .expect(201, done)
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

    it('Should support progressive setup', function(done) {
      app.get('/', function(send) {
        send('ok').set('hello', 'world').end()
      })
      request('/')
        .expect('hello', 'world')
        .expect('ok', done)
    })

    describe('Given a json body', function() {
      it('Should send a json', function(done) {
        app.get('/', function(send) {
          send({foo: 'bar'})
        })
        request('/')
          .expect(200)
          .expect('Content-Type', 'application/json; charset=UTF-8')
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
          .expect('Content-Type', 'text/x-json; charset=UTF-8')
          .expect(/bar/, done)
      })
    })

    describe('Given a stream body', function() {
      it('Should pass streaming errors to app.onerror()', function(done) {
        var error = new Error
        var errors = []

        app.get('/', function(send) {
          send(function(close, cb) {
            cb(error)
          })
        })

        app.onerror = function(err) {
          errors.push(err)
        }

        request('/').end(function() {
          errors.should.eql([error])
          done()
        })
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

    it('Should support progressive setup', function(done) {
      app.get('/', function(redirect) {
        redirect('/foo').status(303).end()
      })
      request('/').expect(303, done)
    })
  })
})
