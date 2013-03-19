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
})