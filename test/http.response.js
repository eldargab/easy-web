var should = require('should')
var supertest = require('supertest')
var fs = require('fs')
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

    it('Should accept streams', function (done) {
      var stream = fs.createReadStream(__filename)
      request(function (req, res) {
        new Response(req, res)
          .send(stream)
          .end(function() {
            stream.destroy()
          })
      })
      .get('/')
      .expect(200, /Should accept streams/, done)
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

  it('Should default Content-Type to application/octet-stream', function(done) {
    res.send('hello')
    request().get('/')
      .expect('Content-Type', 'application/octet-stream', done)
  })

  describe('Given explicitly set Content-Type', function() {
    it('Should not override it', function(done) {
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

  describe('.end(cb)', function() {
    it('Should call passed callback when response were finished or closed', function (done) {
      var called = false
      request(function (req, res) {
        new Response(req, res)
          .send('hi')
          .end(function() {
            called = true
          })
      })
      .get('/')
      .expect(200, 'hi')
      .end(function (err) {
        called.should.be.true
        done(err)
      })
    })
  })
})
