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
  describe('.receiveBody([encoding], [limit], cb)', function() {
    describe('Given encoding', function() {
      it('Should decode body according to passed encoding', function(done) {
        var test = request(function(req, res) {
          req.receiveBody('base64', function(err, body) {
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
          req.receiveBody(function(err, body) {
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
          req.receiveBody('bin', function(err, body) {
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
            req.receiveBody(10, function(err, body) {
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
            req.receiveBody(10, function(err, body) {
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
          req.receiveBody(6, function(err, body) {
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
        req.receiveBody(function() {
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
        req.bodyConsumed = true
        req.receiveBody(function(err) {
          err.message.should.equal('Body already consumed.')
          res.end()
        })
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
})
