'use strict'

const should = require('should')
const web = require('../lib')

describe('Routing', function() {
  let app, router, route

  beforeEach(function() {
    app = new web.App
    router = new web.Router(app.routes)
  })

  function dispatch(method, path) {
    router.routes = app.routes
    return route = router.dispatch(path, {method: method})
  }

  it('Route', function() {
    app.get('/', 'a')
    app.get('/foo/bar', 'b')
    app.post('/foo/bar', 'c')
    app.get('/foo/{bar}/{baz}', 'd')

    dispatch('GET', '/').should.have.property('name').equal('a')
    dispatch('GET', '/foo/bar').should.have.property('name').equal('b')
    dispatch('GET', '/foo/bar/').should.have.property('name').equal('b')
    dispatch('POST', '/foo/bar').should.have.property('name').equal('c')
    dispatch('GET', '/foo/bar/baz').should.have.property('name').equal('d')
    route.params.should.eql({bar: 'bar', baz: 'baz'})
  })

  describe('Zone', function() {
    it('When entered, should match even if nothing matches within zone', function() {
      app.at('/foo', function(app) {
        app.get('/', 'a')
      })
      app.get('/foo/bar', 'b')
      dispatch('GET', '/foo/bar').should.not.have.property('name')
    })

    it('Should prefix names with given namespace', function() {
      app.at('/foo', 'foo', function(app) {
        app.get('/bar', 'bar')
      })
      dispatch('GET', '/foo/bar').should.have.property('name').equal('foo_bar')
    })

    it('zone /bar should not match /barbaz', function() {
      app.at('/bar', function(app) {
        app.get('/', 'a')
      })
      app.get('/barbaz', 'b')
      dispatch('GET', '/barbaz').should.have.property('name').equal('b')
    })
  })
})
