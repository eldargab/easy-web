var should = require('should')
var Route = require('..').Route

function route (path, task, meth) {
  var opts = arguments[arguments.length - 1]
  if (typeof opts == 'object') {
    arguments[arguments.length - 1] = null
  } else {
    opts = null
  }

  meth = meth || 'GET'
  task = task || 'yes'
  return new Route(meth, path, task, opts)
}

describe('route', function () {
  var req

  beforeEach(function () {
    req = {method: 'GET'}
  })

  describe('methods', function () {
    it('Route for POST should match only POST request', function () {
      req.method = 'POST'
      route('/', 'foo', 'GET').match('/', req).should.be.false
      route('/', 'foo', 'POST').match('/', req).should.equal('foo')
    })

    it('Route for GET should match HEAD request', function () {
      req.method = 'HEAD'
      route('/', 'foo', 'GET').match('/', req).should.equal('foo')
    })

    it('Route for ALL should match request with any method', function () {
      var r = route('/', 'foo', 'ALL')
      r.match('/', {method: 'POST'}).should.equal('foo')
      r.match('/', {method: 'GET'}).should.equal('foo')
    })
  })

  describe('Trailing slashes', function () {
    it('/foo should match /foo/', function () {
      route('/foo').match('/foo/', req).should.equal('yes')
    })

    it('/foo/ should match /foo/', function () {
      route('/foo/').match('/foo/', req).should.equal('yes')
    })

    it('/foo/ should NOT match /foo', function () {
      route('/foo/').match('/foo', req).should.be.false
    })
  })

  describe('params', function () {
    it('Should support params', function () {
      route('/{a}/{b}').match('/hello/world', req).should.equal('yes')
      req.params.should.have.property('a').equal('hello')
      req.params.should.have.property('b').equal('world')
    })

    it('Should decode params', function () {
      route('/{a}').match('/foo%20bar', req).should.equal('yes')
      req.params.a.should.equal('foo bar')
    })

    it('Should mix default params', function () {
      route('/', {
        p: {
          a: 'a',
          b: 'b'
        }
      }).match('/', req).should.equal('yes')
      req.params.should.have.property('a').equal('a')
      req.params.should.have.property('b').equal('b')
    })
  })
})
