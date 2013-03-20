var should = require('should')
var Router = require('..')

function Req (meth, path) {
  return {
    path: path,
    method: meth.toUpperCase(meth)
  }
}

describe('Router', function () {
  var router

  beforeEach(function () {
    router = new Router
  })

  function dispatch (meth, p) {
    if (arguments.length == 1) {
      p = meth
      meth = 'get'
    }
    return router.dispatch(p, Req(meth, p))
  }

  describe('.dispatch(path, req)', function () {
    it('Should return the task of the first matching route', function () {
      router.route('get', '/', 'first')
      router.route('get', '/', 'second')
      dispatch('/').should.equal('first')
    })

    it('Should return 404 if no route matched', function () {
      dispatch('/').should.equal('404')
    })
  })

  describe('.route(meth, path, task)', function () {
    it('Should accept custom route object', function () {
      router.route({
        match: function (p, req) {
          if (p == '/hello' && req.method == 'POST') return 'done'
        }
      })
      dispatch('post', '/hello').should.equal('done')
    })

    it('Should respect passed method', function () {
      router.route('get', '/', 'get')
      router.route('post', '/', 'post')
      dispatch('post', '/').should.equal('post')
    })

    it('* should match all methods', function () {
      router.route('*', '/', 'foo')
      dispatch('options', '/').should.equal('foo')
    })
  })

  describe('.match(path, req)', function () {
    it('Should match only if path starts with router\'s prefix', function () {
      router.prefix = '/hello/world'
      router.match('/hello/world/app', {}).should.equal('404')
      router.match('/foo', {}).should.be.false
    })

    it('Should dispatch matched request to itself', function () {
      router.prefix = '/hello'
      router.route('get', '/world', 'world')
      router.match('/hello/world', {method: 'GET'}).should.equal('world')
    })
  })
})
