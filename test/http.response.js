var should = require('should')
var supertest = require('supertest')
var Response = require('../lib/http/response')

describe('http.Response', function () {
  var res

  function request (server) {
    server = server || function (rq, rs) {
      res.req = rq
      res.res = rs
      res.end()
    }
    return supertest(server)
  }

  beforeEach(function () {
    res = new Response
  })

  describe('.send(body)', function() {
    it('Should accept strings', function(done) {
      res.send('hello world')
      request().get('/')
        .expect(200, 'hello world', done)
    })

    it('Should accept buffers', function(done) {
      res.send(new Buffer('hi'))
      request().get('/')
        .expect(200, 'hi', done)
    })

    it('Should accept min-streams', function (done) {
      request(function (req, res) {
        var sent = false
        new Response(req, res)
        .send(function(close, cb) {
          if (sent) return process.nextTick(cb)
          sent = true
          cb(null, 'Hello world')
        })
        .end()
      })
      .get('/')
      .expect(200, 'Hello world', done)
    })
  })

  describe('Should set Content-Length', function() {
    it('for strings', function(done) {
      res.send('раз два')
      request().get('/')
        .expect('Content-Length', '13')
        .expect('раз два', done)
    })

    it('for buffers', function(done) {
      res.send(new Buffer([1, 2]))
      request().get('/')
        .expect('Content-Length', '2', done)
    })
  })

  describe('Content-Type', function() {
    it('Should default to text/plain for strings', function(done) {
      res.send('hello')
      request().get('/')
        .expect('Content-Type', 'text/plain; charset=UTF-8', done)
    })

    it('Should default to application/octet-stream otherwise', function(done) {
      res.send(new Buffer('Hello'))
      request().get('/')
        .expect('Content-Type', 'application/octet-stream', done)
    })

    it('Should not override explicitly set Content-Type', function(done) {
      request(function (req, res) {
        new Response(req, res)
          .type('foo/bar')
          .send('foo')
          .end()
      })
      .get('/')
      .expect('Content-Type', 'foo/bar')
      .expect(200, 'foo', done)
    })
  })

  describe('When status is 304', function () {
    it('Should strip Content-* headers, Transfer-Encoding and body', function (done) {
      request(function (req, res) {
        new Response(req, res)
          .status(304)
          .set('Transfer-Encoding', 'chunked')
          .send('hi')
          .end()
      })
      .get('/')
      .end(function (err, res) {
        if (err) return done(err)
        res.should.not.have.property('content-length')
        res.should.not.have.property('content-type')
        res.should.not.have.property('transfer-encoding')
        res.text.should.equal('')
        done()
      })
    })
  })

  describe('When status is 204', function () {
    it('Should strip Content-* headers, Transfer-Encoding and body', function (done) {
      request(function (req, res) {
        new Response(req, res)
          .status(204)
          .set('Transfer-Encoding', 'chunked')
          .send('hi')
          .end()
      })
      .get('/')
      .end(function (err, res) {
        if (err) return done(err)
        res.should.not.have.property('content-length')
        res.should.not.have.property('content-type')
        res.should.not.have.property('transfer-encoding')
        res.text.should.equal('')
        done()
      })
    })
  })

  describe('Freshness checking', function() {
    it('Should respond with 304 when fresh', function (done) {
      res.set('ETag', 'hello')
      request()
        .get('/')
        .set('If-None-Match', 'hello')
        .expect(304, done)
    })

    it('Should not check for freshness unless 2xx or 303', function (done) {
      request(function (req, res) {
        new Response(req, res)
          .status(400)
          .set('Etag', 'asd')
          .send('hi')
          .end()
      })
      .get('/')
      .set('If-None-Match', 'asd')
      .expect(400, 'hi', done)
    })
  })

  describe('Streaming', function() {
    it('Should destroy response on upstream error', function(done) {
      request(function(req, res) {
        new Response(req, res)
        .send(function(close, cb) {
          process.nextTick(function() {
            cb(new Error)
          })
        })
        .end()
      })
      .get('/')
      .end(function(err, res) {
        should.exist(err)
        done()
      })
    })

    it('Should pass upstream error to callback', function(done) {
      var error = new Error
      var errors = []

      request(function(req, res) {
        new Response(req, res)
        .send(function(close, cb) {
          process.nextTick(function() {
            cb(error)
          })
        })
        .end(function(err) {
          errors.push(err)
        })
      })
      .get('/')
      .end(function(err) {
        should.exist(err)
        errors.should.eql([error])
        done()
      })
    })
  })

  describe('.cookie(name, val, opts)', function() {
    it('Should set cookie', function(done) {
      res.cookie('a', 'b')
      request()
      .get('/')
      .end(function(err, res) {
        if (err) return done(err)
        res.headers['set-cookie'].should.eql(['a=b; Path=/'])
        done()
      })
    })

    it('Should respect passed options', function(done) {
      res.cookie('a', 'b', {path: '/hello', httpOnly: true, secure: true})
      request()
      .get('/')
      .end(function(err, res) {
        if (err) return done(err)
        res.headers['set-cookie']
          .should.eql(['a=b; Path=/hello; HttpOnly; Secure'])
        done()
      })
    })

    it('Should allow multiple calls', function(done) {
      res
      .cookie('foo', 'bar')
      .cookie('baz', 10)

      request()
      .get('/')
      .end(function(err, res) {
        if (err) return done(err)
        res.headers['set-cookie']
          .should.eql(['foo=bar; Path=/', 'baz=10; Path=/'])
        done()
      })
    })
  })

  describe('.clearCookie(name, opts)', function() {
    it('Should set an expired cookie', function(done) {
      res.clearCookie('sid')
      request()
      .get('/')
      .end(function(err, res) {
        if (err) return done(err)
        res.headers['set-cookie']
          .should.eql(['sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'])
        done()
      })
    })

    it('Should respect passed options', function(done) {
      res.clearCookie('sid', {path: '/admin'})
      request()
      .get('/')
      .end(function(err, res) {
        if (err) return done(err)
        res.headers['set-cookie']
          .should.eql(['sid=; Path=/admin; Expires=Thu, 01 Jan 1970 00:00:00 GMT'])
        done()
      })
    })
  })
})
