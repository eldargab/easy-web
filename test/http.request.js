var should = require('should')
var supertest = require('supertest')
var Request = require('../lib/http/request')
var Response = require('../lib/http/response')

function request(cb) {
  return supertest(function(req, res) {
    cb(new Request(req), new Response(req, res))
  }).post('/')
}

describe('http.request', function() {
  describe('.body()', function() {
    describe('Given no arguments', function() {
      it('Should return min-stream source', function(done) {
        request(function(req, res) {
          res.send(req.body()).end()
        })
        .send('echo')
        .expect(200, 'echo', done)
      })
    })

    describe('Given encoding', function() {
      it('Should decode body according to passed encoding', function(done) {
        var test = request(function(req, res) {
          req.body('base64', function(err, body) {
            body.should.equal('AQI=')
            res.end()
          })
        })
        test.write(new Buffer([1, 2]))
        test.expect(200, done)
      })
    })

    describe('Given no encoding', function() {
      it('Should default encoding to UTF-8', function(done) {
        request(function(req, res) {
          req.body(function(err, body) {
            body.should.equal('раз два три')
            res.end()
          })
        })
        .send('раз два три')
        .expect(200, done)
      })
    })

    describe('Given a binary encoding (bin)', function() {
      it('Should return a raw buffer', function(done) {
        var test = request(function(req, res) {
          req.body('bin', function(err, body) {
            Buffer.isBuffer(body).should.be.true
            body[0].should.equal(1)
            body[1].should.equal(2)
            res.end()
          })
        })
        test.write(new Buffer([1, 2]))
        test.expect(200, done)
      })
    })

    describe('Given a limit', function() {
      describe('Should reject large bodies', function() {
        it('Explicit Content-Length case', function(done) {
          request(function(req, res) {
            req.body(10, function(err, body) {
              should.not.exist(body)
              err.message.should.equal('Request body is too large.')
              err.limit.should.equal(10)
              res.status(413).end()
            })
          })
          .send('This is a very large body!')
          .expect(413, done)
        })

        it('No Content-Length case', function(done) {
          var test = request(function(req, res) {
            req.headers.should.not.have.property('content-length')
            req.body(10, function(err, body) {
              should.not.exist(body)
              err.message.should.equal('Request body is too large.')
              err.limit.should.equal(10)
              res.status(413).end()
            })
          })
          test.type('text')
          test.write('chunk')
          setTimeout(function() {
            test.write('Yet another chunk')
            test.expect(413, done)
          })
        })
      })

      it('Should accept small bodies', function(done) {
        request(function(req, res) {
          req.body(6, function(err, body) {
            body.should.equal('small')
            res.end()
          })
        })
        .send('small')
        .expect(200, done)
      })
    })

    it('Should set .bodyConsumed flag', function(done) {
      request(function(req, res) {
        req.bodyConsumed.should.be.false
        req.body(function() {
          req.bodyConsumed.should.be.true
          res.end()
        })
        req.bodyConsumed.should.be.true
      })
      .send('hi')
      .expect(200, done)
    })

    it('Should reject attempt to consume body second time', function(done) {
      request(function(req, res) {
        req.body()
        ;(function() {
          req.body()
        }).should.throw('Body already consumed')
        res.end()
      })
      .send('hi')
      .expect(200, done)
    })
  })

  describe('.cookies', function() {
    it('Should return parsed cookies', function(done) {
      request(function(req, res) {
        req.cookies.should.eql({
          foo: 'bar',
          baz: 'qux'
        })
        res.end()
      })
      .set('cookie', 'foo=bar;baz=qux')
      .expect(200, done)
    })

    it('When no cookies where sent should default to {}', function(done) {
      request(function(req, res) {
        req.cookies.should.eql({})
        res.end()
      })
      .expect(200, done)
    })
  })

  describe('.xhr', function() {
    it('Should return "true" if request is XMLHttpRequest', function(done) {
      request(function(req, res) {
        req.xhr.should.be.true
        res.end()
      })
      .set('X-Requested-With', 'XMLHttpRequest')
      .expect(200, done)
    })

    it('Should return "false" otherwise', function(done) {
      request(function(req, res) {
        req.xhr.should.be.false
        res.end()
      })
      .expect(200, done)
    })
  })
})
