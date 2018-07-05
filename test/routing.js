'use strict'

const should = require('should')
const Web = require('../lib/web')
const Router = require('../lib/router')


describe('Routing', function() {
  let app

  beforeEach(function() {
    app = new Web
  })

  function match(path, name, params) {
    let route = new Router(app.routes).match(path)
    if (name) {
      should.exist(route)
      route.should.have.property('name').equal(name)
      route.should.have.property('params').eql(params)
    } else {
      should.not.exist(route)
    }
  }

  it('test matching', function() {
    app.route('GET', '/', 'root')
    app.route('GET', '/{foo}', 'foo')
    app.route('GET', '/foo/bar', 'bar')
    app.route('GET', '/foo/baz', 'baz')
    app.route('GET', '/{a}/{b}', 'ab')

    match('/foo/bar', 'bar', {})
    match('/foo/bar/', 'bar', {})
    match('/foo/qux', 'ab', {a: 'foo', b: 'qux'})
    match('/', 'root', {})
    match('/foo', 'foo', {foo: 'foo'})
  })

  it('test sub-app routing', function() {
    let sub = new Web

    sub.route('GET', '/', 'root')
    sub.route('GET', '/foo', 'foo')
    sub.route('GET', '/{bar}', 'bar')

    app.at('/sub', 'sub_ns', sub)
    app.route('GET', '/subfoo', 'subfoo')
    app.route('GET', '/sub/foo', 'foo')

    match('/sub/qux', 'sub_ns_bar', {bar: 'qux'})
    match('/sub', 'sub_ns_root', {})
    match('/sub/', 'sub_ns_root', {})
    match('/sub/foo', 'sub_ns_foo', {})
    match('/subfoo', 'subfoo', {})
  })
})
