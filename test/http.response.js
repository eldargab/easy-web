var should = require('should')
var supertest = require('supertest')
var Response = require('../lib/http/response')

describe('http Response', function() {
  var res

  function request(cb) {
    return supertest(function(rq, rs) {
      res.req = rq
      res.res = rs
      if (cb) cb()
      res.end()
    }).get('/')
  }

  beforeEach(function() {
    res = new Response
  })

  describe('.status(code)', function() {
    it('Should set .statusCode', function(done) {
      res.status(404)
      res.statusCode.should.equal(404)
      request().expect(404, done)
    })
  })

  describe('.send(body)', function() {
    describe('Given a json', function() {
      it('Should send json', function(done) {
        res.send({foo: 'bar'})
        request()
          .expect('Content-Type', 'application/json')
          .expect(200, {foo: 'bar'}, done)
      })

      it('Should not override content type', function(done) {
        res.type('text/plain')
        res.send({foo: 'bar'})
        request()
          .expect('Content-Type', 'text/plain')
          .expect(200, function(err, res) {
            if (err) return done(err)
            JSON.parse(res.text).should.eql({foo: 'bar'})
            done()
          })
      })
    })

    describe('Given a string', function() {
      it('Should send string', function(done) {
        res.send('foo')
        request().expect('foo', done)
      })
    })

    describe('Given a buffer', function() {
      it('Should send buffer', function(done) {
        res.send(new Buffer('Раз два'))
        request().expect('Раз два', done)
      })
    })

    describe('Given a stream', function() {
      it('Should send stream', function(done) {
        res.send(require('fs').createReadStream(__filename))
        request().expect(200, /Should send stream/,done)
      })
    })
  })

  describe('.redirect(url)', function() {
    it('Should default status code to 302', function(done) {
      res.redirect('http://site.com')
      request().expect(302, done)
    })

    it('Should set location header', function(done) {
      res.redirect('http://site.com')
      request().expect('Location', 'http://site.com', done)
    })

    it('Should send descriptive message', function(done) {
      res.redirect('http://site.com')
      request()
        .expect('Content-Type', 'text/plain')
        .expect('302 Moved Temporarily. Redirecting to http://site.com', done)
    })

    it('Should not override status code', function(done) {
      res.redirect('http://site.com').status(301)
      request().expect(301, done)
    })

    it('Should not override body', function(done) {
      res.send('hello').redirect('//hello')
      request().expect('hello', done)
    })

    describe('Given url == "back"', function() {
      it('Should redirect to Referrer', function(done) {
        request(function() {
          res.redirect('back')
        })
        .set('Referrer', 'http://example.com')
        .expect('Location', 'http://example.com', done)
      })

      it('Should redirect to `/` if referrer is not present', function(done) {
        request(function() {
          res.redirect('back')
        })
        .expect('Location', '/', done)
      })
    })
  })
})
