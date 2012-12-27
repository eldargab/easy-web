var should = require('should')
var methods = require('methods')
var Router = require('..')

function Req (meth, path) {
  return {
    path: path,
    method: meth.toUpperCase(meth)
  }
}

function Get (path) {
  return Req('get', path)
}

describe('router', function () {
  var router

  beforeEach(function () {
    router = new Router
  })

  function dispatch (p) {
    return router.dispatch(p, Get(p))
  }

  describe('.dispatch(path, req)', function () {
    it('Should return a task of the first matching route', function () {
      router.routes(function () {
        this.get('/', 'first')
        this.get('/', 'second')
      })
      dispatch('/').should.equal('first')
    })

    it('Should return 404 if no route matched', function () {
      dispatch('/').should.equal('404')
    })

    it('Route for GET should match HEAD request', function () {
      router.get('/', 'index')
      router.dispatch('/', Req('head', '/')).should.equal('index')
    })
  })

  describe('.app(name, routes)', function () {
    it('Should prefix all tasks with <name_>', function () {
      router.app('hello', function () {
        this.get('/world', 'world')
      })
      router.get('/foo', 'foo')

      dispatch('/world').should.equal('hello_world')
      dispatch('/foo').should.equal('foo')
    })
  })

  describe('.at(prefix, [app], routes)', function () {
    describe('If path starts with <prefix> ...', function () {
      it('Should match rest of the path against <routes>', function () {
        router.at('/foo/bar', function () {
          this.get('/', 'index')
          this.get('/baz', 'baz')
        })
        dispatch('/foo/bar/').should.equal('index')
        dispatch('/foo/bar/baz').should.equal('baz')
      })

      it('Should not match against all other routes', function () {
        router.at('/foo', function () { })
        router.get('/foo/bar')
        dispatch('/foo/bar').should.equal('404')
      })

      it('Should normalize slashes', function () {
        router.at('/foo', function () {
          this.get('/', 'foo')
        })
        router.at('/bar/', function () {
          this.get('/', 'bar')
        })
        dispatch('/foo').should.equal('foo')
        dispatch('/foo/').should.equal('foo')
        dispatch('/bar').should.equal('bar')
        dispatch('/bar/').should.equal('bar')
      })
    })

    it('Should support <app> shortcut', function () {
      router.at('/super', 'app', function () {
        this.get('/', 'index')
      })
      dispatch('/super').should.equal('app_index')
    })
  })

  describe('path patterns', function () {
    function test (pattern, path, cb) {
      it(pattern + ' <- ' + path, function () {
        router.route('get', pattern, 'task')
        var req = Get(path)
        var task = router.dispatch(path, req)
        task.should.equal('task')
        cb && cb(req, path, pattern)
      })
    }

    test('/', '/')
    test('/hello/world', '/hello/world')
    test('/:app/:task/', '/super/task/', function (req) {
      req.params.app.should.equal('super')
      req.params.task.should.equal('task')
    })
  })
})
