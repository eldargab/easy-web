var should = require('should')
var Router = require('..').Router

describe('Router', function () {
  var router, req

  beforeEach(function () {
    router = new Router
    req = {}
  })

  function route (fn) {
    router.push({
      match: typeof fn == 'function' ? fn : function () {return fn}
    })
  }

  describe('.dispatch(path, req)', function () {
    it('Should return a task of the first matching route', function () {
      route('first')
      route('second')
      router.dispatch('/', req).should.equal('first')
    })

    it('Should return 404 if no route matched', function () {
      router.dispatch('/', req).should.equal('404')
    })
  })

  describe('.at(prefix, ns)', function () {
    it('Should return a route', function () {
      router.at('/foo', 'bar').should.have.property('match').a('function')
    })

    describe('route', function () {
      it('Should match only if path starts with `prefix`', function () {
        var r = router.at('/hello/world')
        r.match('/hello/world/app', {}).should.equal('404')
        r.match('/foo', {}).should.be.false
      })

      it('Should dispatch matched request to a parent router', function () {
        route(function (p) {
          return p
        })
        router.at('/hello').match('/hello/world', req)
          .should.equal('/world')
      })

      it('Should prefix task returned by a parent router with `ns`', function () {
        route('world')
        router.at('/hello', 'hello').match('/hello/world', req)
          .should.equal('hello_world')
      })

      it('Should not prefix 404 task', function () {
        route('404')
        router.at('/hello', 'hello').match('/hello/world', req)
          .should.equal('404')
      })

      it('Should work with paths containing non-ASCII chars', function () {
        router.at('/раз/два').match(encodeURI('/раз/два'), req)
          .should.equal('404')
      })
    })
  })
})
