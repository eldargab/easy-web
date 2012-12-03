var should = require('should')
var supertest = require('supertest')
var http = require('..')

var App = http.module.run()

App.createServer = function () {
  var app = this

  return function server (req, res) {
    app.run()
      .set('req', req)
      .set('res', res)
      .eval('respond', function (err) {
        if (err) throw err
      })
  }
}

describe('http.module', function () {
  describe('.send()', function () {
    var server, o, app

    function request () {
      return supertest(server).get('/')
    }

    beforeEach(function () {
      o = new http.Send
      app = App
        .run()
        .def('respond', function (send, o) {
          send(o)
        })
        .set('o', o)
      server = app.createServer()
    })

    describe('If nothing passed...', function () {
      it('Should just respond', function (done) {
        app.set('o', null)
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
        request()
          .expect('Content-Type', 'application/octet-stream', done)
      })

      it('Should be overridable', function (done) {
        o.type('text')
        request()
          .expect('Content-Type', 'text/plain', done)
      })
    })

    it('Should send ETag for large bodies', function (done) {
      o.send(Array(1024 * 2).join('-'))
      request()
        .expect('ETag', '"-1498647312"', done)
    })

    describe('When .statusCode is 304', function () {
      it('Should strip Content-* headers and body', function (done) {
        o.status(304).send('hi')
        request().end(function (err, res) {
          if (err) return done(err)
          res.should.not.have.property('content-length')
          res.should.not.have.property('content-type')
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
  })

  describe('.json()', function () {
    var server, o, app

    function request () {
      return supertest(server).get('/')
    }

    beforeEach(function () {
      o = new http.Send
      app = App
        .run()
        .def('respond', function (json, o) {
          json(o)
        })
        .set('o', o)
      server = app.createServer()
    })

    it('Should respond with json', function (done) {
      o.send({ hello: 'world' })
      request().end(function (err, res) {
        if (err) return done(err)
        res.headers.should.have.property('content-type').equal('application/json')
        JSON.parse(res.text).should.eql({
          hello: 'world'
        })
        done()
      })
    })
  })
})
