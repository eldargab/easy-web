var should = require('should')
var supertest = require('supertest')
var http = require('..')

describe('http.send', function () {
  var server, o

  function request () {
    return supertest(server).get('/')
  }

  beforeEach(function () {
    o = new http.Response
    server = function (req, res) {
      http.send(req, res, o)
    }
  })

  describe('If nothing passed...', function () {
    it('Should just respond', function (done) {
      o = null
      request().expect(200, done)
    })
  })

  it('Should send passed headers', function (done) {
    o.set('X-Powered-By', 'easy-web')
    request()
      .expect('X-Powered-By', 'easy-web')
      .end(done)
  })

  describe('Should send body', function (done) {
    it('string', function () {
      o.send('hello world')
      request().expect('hello world', done)
    })

    it('buffer', function (done) {
      o.send(new Buffer('hi'))
      request().expect('hi', done)
    })

    it('json', function (done) {
      o.send({hello: 'world'})
      request()
        .expect('Content-Type', 'application/json')
        .expect({hello: 'world'}, done)
    })
  })

  it('Should set .statusCode', function (done) {
    o.status(201)
    request().expect(201, done)
  })

  describe('Content-Type', function (done) {
    it('Should default to text/html for strings', function () {
      o.send('hello')
      request()
        .expect('Content-Type', 'text/html')
        .expect('hello', done)
    })

    it('Should defualt to octet-stream for buffers', function (done) {
      o.send(new Buffer('hi'))
      request().expect('Content-Type', 'application/octet-stream', done)
    })

    it('Should be overridable', function (done) {
      o.type('text')
      request().expect('Content-Type', 'text/plain', done)
    })
  })

  it('Should send ETag for large bodies', function (done) {
    o.send(Array(1024 * 2).join('-'))
    request().expect('ETag', '"-1498647312"', done)
  })

  describe('When .statusCode is 304', function () {
    it('Should strip Content-* headers, Transfer-Encoding and body', function (done) {
      o.status(304).send('hi').set('Transfer-Encoding', 'chunked')
      request().end(function (err, res) {
        if (err) return done(err)
        res.should.not.have.property('content-length')
        res.should.not.have.property('content-type')
        res.should.not.have.property('transfer-encoding')
        res.text.should.equal('')
        done()
      })
    })
  })

  describe('When .statusCode is 204', function () {
    it('Should strip Content-* headers, Transfer-Encoding and body', function (done) {
      o.status(204).send('hi').set('Transfer-Encoding', 'chunked')
      request().end(function (err, res) {
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
    o.send(Array(1024 * 2).join('-'))
    request()
      .set('If-None-Match', '"-1498647312"')
      .expect(304, done)
  })

  it('Should not check for freshness unless 2xx or 303', function (done) {
    o.send('hi')
    o.status(400)
    o.set('ETag', 'asd')
    request()
      .set('If-None-Match', 'asd')
      .expect(400, 'hi', done)
  })

  describe('Cookies', function () {
    it('Should respect cookie options', function (done) {
      o.cookie('foo', 'bar', {
        httpOnly: true,
        maxAge: 600,
        domain: 'example.com',
        path: '/path'
      })
      request().end(function (err, res) {
        if (err) return done(err)
        res.headers.should.have.property('set-cookie')
          .eql(['foo=bar; Max-Age=600; Domain=example.com; Path=/path; HttpOnly'])
        done()
      })
    })

    it('Should default path to /', function (done) {
      o.cookie('foo', 'bar')
      request().end(function (err, res) {
        if (err) return done(err)
        res.headers.should.have.property('set-cookie').eql(['foo=bar; Path=/'])
        done()
      })
    })

    it('Should support setting of multiple cookies', function (done) {
      o.cookie('hello', 'world').cookie('foo', 'bar')
      request().end(function (err, res) {
        if (err) return done(err)
        res.headers.should.have.property('set-cookie').eql([
          'hello=world; Path=/',
          'foo=bar; Path=/'
        ])
        done()
      })
    })
  })
})
