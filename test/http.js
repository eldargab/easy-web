'use strict'

const should = require('should')
const supertest = require('supertest')
const Web = require('../lib/web')


describe('Http', function() {
  let app

  beforeEach(function() {
    app = new Web

    app.def('request', function(requestHandler) {
      return supertest(function(req, res) {
        requestHandler(req, res).get(function(err) {
          if (err) throw err
        })
      })
    })

    app.expect = function(val, done) {
      this.run('test').get(function(err, ret) {
        if (err) return done(err)
        ret.should.equal(val)
        done()
      })
    }
  })


  it('hello world', function(done) {
    app.route('GET', '/', 'hello')
    app.def('hello', function(send) {
      return send(200, 'text/plain', 'Hello')
    })

    app.def('test', function(request) {
      return request.get('/')
        .expect(200, 'Hello')
        .expect('Content-Type', 'text/plain; charset=UTF-8')
        .expect('Content-Length', "5")
        .then(() => 1)
    })

    app.expect(1, done)
  })


  it('should return 404 when no route matched', function(done) {
    app.def('test', function(request) {
      return request.get('/').expect(404).then(() => 1)
    })
    app.expect(1, done)
  })


  it('should return 500 on unhandled error', function(done) {
    app.route('GET', '/', 'exception')
    app.def('exception', function() {
      throw new Error("This error will be probably printed to STDERR, but that's ok!")
    })

    app.def('test', function(request) {
      return request.get('/').expect(500).then(() => 1)
    })
    app.expect(1, done)
  });


  it('should send route`s return value as JSON', function(done) {
    app.route('GET', '/', 'json')
    app.def('json', function() {
      return {a: 1, b: 2}
    })
    app.def('test', function(request) {
      return request.get('/')
        .expect(200)
        .expect('Content-Type', 'application/json; charset=UTF-8')
        .expect({a: 1, b: 2})
        .then(() => 1)
    })
    app.expect(1, done)
  })
})
