var should = require('should')
var Router = require('..').Router

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

    it('Should accept custom route function', function () {
      router.route(function (p, req) {
        if (p == '/hello' && req.method == 'POST') return 'done'
      })
      dispatch('post', '/hello').should.equal('done')
    })

    it('Should support regular route definition', function () {
      router.route('get', '/hello', 'world')
      dispatch('/hello').should.equal('world')
    })
  })

  describe('.at(prefix, ns)', function () {
    it('Should return a route', function () {
      router.at('/foo', 'bar').should.have.property('match').a('function')
    })

    describe('route', function () {
      it('Should match only if path starts with `prefix`', function () {
        var route = router.at('/hello/world')
        route.match('/hello/world/app', {}).should.equal('404')
        route.match('/foo', {}).should.be.false
      })

      it('Should dispatch matched request to a parent router', function () {
        router.route('get', '/world', 'world')
        router.at('/hello').match('/hello/world', {method: 'GET'})
          .should.equal('world')
      })

      it('Should prefix task returned by a parent router with `ns`', function () {
        router.route('get', '/world', 'world')
        router.at('/hello', 'hello').match('/hello/world', {method: 'GET'})
          .should.equal('hello_world')
      })

      it('Should not prefix 404 task', function () {
        router.at('/hello', 'hello').match('/hello/world', {method: 'GET'})
          .should.equal('404')
      })

      it('Should work with paths containing non-ASCII chars', function () {
        router.at('/раз/два').match(encodeURI('/раз/два'), {method: 'GET'})
          .should.equal('404')
      })
    })
  })
})
