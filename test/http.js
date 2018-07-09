'use strict'

const should = require('should')
const supertest = require('supertest')
const Web = require('../lib/web')
const fileResource = require('../lib/http-file-resource')
const fs = require('fs')


describe('Http', function() {
  let app

  beforeEach(function() {
    app = new Web

    app.def('request', function(requestHandler) {
      return supertest(function(req, res) {
        requestHandler(req, res).get(function(err) {
          if (err) throw err
        })
      })
    })

    app.expect = function(val, done) {
      this.run('test').get(function(err, ret) {
        if (err) return done(err)
        ret.should.equal(val)
        done()
      })
    }
  })


  it('hello world', function(done) {
    app.route('GET', '/', 'hello')
    app.def('hello', function(send) {
      return send(200, 'text/plain', 'Hello')
    })

    app.def('test', function(request) {
      return request.get('/')
        .expect(200, 'Hello')
        .expect('Content-Type', 'text/plain; charset=UTF-8')
        .expect('Content-Length', "5")
        .then(() => 1)
    })

    app.expect(1, done)
  })


  it('should return 404 when no route matched', function(done) {
    app.def('test', function(request) {
      return request.get('/').expect(404).then(() => 1)
    })
    app.expect(1, done)
  })


  it('should return 405 on wrong method', function(done) {
    app.route('GET', '/', 'foo')
    app.def('foo', function() {
      throw new Error('Should not be called!')
    })

    app.def('test', function(request) {
      return request.post('/').send('hello')
        .expect(405)
        .expect('Allow', 'GET, HEAD')
        .then(() => 1)
    })

    app.expect(1, done)
  })


  it('should return 500 on unhandled error', function(done) {
    app.route('GET', '/', 'exception')
    app.def('exception', function() {
      throw new Error("Internal server error")
    })

    app.def('logServerError', () => () => null)

    app.def('test', function(request) {
      return request.get('/').expect(500).then(() => 1)
    })
    app.expect(1, done)
  });


  it('should send route`s return value as JSON', function(done) {
    app.route('GET', '/', 'json')
    app.def('json', function() {
      return {a: 1, b: 2}
    })
    app.def('test', function(request) {
      return request.get('/')
        .expect(200)
        .expect('Content-Type', 'application/json; charset=UTF-8')
        .expect({a: 1, b: 2})
        .then(() => 1)
    })
    app.expect(1, done)
  })


  describe('sendFile()', function() {
    it('basic usage', function(done) {
      app.route('GET', '/', 'file')
      app.def('file', function(sendFile) {
        return sendFile(400, __filename)
      })

      app.def('test', function(request) {
        return request.get('/')
          .expect(400)
          .expect('Content-Type', 'application/javascript')
          .expect(/describe\('sendFile/)
          .then(() => 1)
      })

      app.expect(1, done)
    })
  })
  
  
  describe('file resource', function() {
    let stat = fs.statSync(__filename)
    let content = fs.readFileSync(__filename, 'UTF-8')
    let etag = `"${stat.size.toString(16)}-${stat.mtime.getTime().toString(16)}"`

    beforeEach(function() {
      app.install('file', fileResource)

      app.set('file_file', __filename)

      app.route('GET', '/', 'file_sending')
    })


    it('basic request', function(done) {
      app.def('test', function(request) {
        return request.get('/')
          .expect(200)
          .expect('Accept-Ranges', 'bytes')
          .expect('Content-Type', 'application/javascript')
          .expect('Content-Length', ''+stat.size)
          .expect('Last-Modified', stat.mtime.toUTCString())
          .expect('ETag', etag)
          .expect(content)
          .then(() => 1)
      })

      app.expect(1, done)
    })


    describe('conditional requests', function() {
      describe('If-None-Match', function() {
        it('304 if fresh', function(done) {
          app.def('test', function(request) {
            return request.get('/')
              .set('If-None-Match', etag)
              .expect(304)
              .then(() => 1)
          })
          app.expect(1, done)
        })

        it('200 if stale', function(done) {
          app.def('test', function(request) {
            return request.get('/')
              .set('If-None-Match', '"foo bar baz"')
              .expect(200, content)
              .then(() => 1)
          })
          app.expect(1, done)
        })
      })


      describe('If-Modified-Since', function() {
        it('304 if fresh', function(done) {
          app.def('test', function(request) {
            return request.get('/')
              .set('If-Modified-Since', stat.mtime.toISOString())
              .expect(304)
              .then(() => request.get('/')
                .set('If-Modified-Since', new Date(stat.mtime.getTime() + 1000000).toISOString())
                .expect(304)
              ).then(() => 1)
          })
          app.expect(1, done)
        })

        it('200 if stale', function(done) {
          app.def('test', function(request) {
            return request.get('/')
              .set('If-Modified-Since', new Date(stat.mtime.getTime() - 1000000).toISOString())
              .expect(200, content)
              .then(() => 1)
          })
          app.expect(1, done)
        })
      })
    })


    describe('range requests', function() {
      it('basic', function(done) {
        app.def('test', function(request) {
          return request.get('/')
            .set('Range', 'bytes=0-50')
            .expect(206)
            .expect('Content-Length', "51")
            .expect('Content-Type', 'application/javascript')
            .expect(content.slice(0, 51))
            .then(() => 1)
        })
        app.expect(1, done)
      })
    })
  })
})
