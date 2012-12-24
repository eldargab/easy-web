var should = require('should')
var Request = require('../request')

describe('Request', function () {
  var req

  beforeEach(function () {
    req = Object.create(Request)
    req.headers = {}
  })

  describe('.cookies', function () {
    it('Should return parsed cookies', function () {
      req.headers.cookie = 'foo=bar;baz=qux'
      req.cookies.should.eql({
        foo: 'bar',
        baz: 'qux'
      })
    })
    it('When no cookies where sent should default to {}', function () {
      req.cookies.should.eql({})
    })
  })
})
