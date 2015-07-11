'use strict'

const should = require('should')
const supertest = require('supertest')
const web = require('../lib')

describe('Integration tests', function() {
  let app

  beforeEach(function() {
    app = web.main()
  })

  function test(fn) {
    app.def('main', function(handler) {
      fn(supertest(handler))
    })
    app.run()
  }

  it('Hello world', function(done) {
    app.get('/', function() {
      return {body: 'Привет'}
    })
    test(function(req) {
      req
      .get('/')
      .expect('Content-Type', 'text/plain; charset=UTF-8')
      .expect('Content-Length', 12)
      .expect(200, 'Привет', done)
    })
  })

  it('404 Not found', function(done) {
    test(function(req) {
      req.get('/').expect(404, done)
    })
  })

  it('JSON response', function(done) {
    app.get('/', function() {
      return {body: {hello: 'world'}}
    })
    test(function(req) {
      req
      .get('/')
      .expect('Content-Type', 'application/json; charset=UTF-8')
      .expect(200, {hello: 'world'}, done)
    })
  })

  it('JSON request', function(done) {
    app.post('/', function(jsonBody) {
      return {body: jsonBody}
    })
    test(function(req) {
      req
      .post('/')
      .send({a: 1, b: 2})
      .expect(200, {a: 1, b: 2}, done)
    })
  })
})
