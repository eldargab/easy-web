var should = require('should')
var proto = require('../lib/http/request')

describe('http.request', function() {
  var req

  beforeEach(function() {
    req = Object.create(proto)
    req.headers = {}
  })

  describe('.cookies', function() {
    it('Should return parsed cookies', function() {
      req.headers.cookie = 'foo=bar;baz=qux'
      req.cookies.should.eql({
        foo: 'bar',
        baz: 'qux'
      })
    })
    it('When no cookies where sent should default to {}', function() {
      req.cookies.should.eql({})
    })
  })
})
