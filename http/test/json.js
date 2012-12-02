var should = require('should')
var supertest = require('supertest')
var http = require('..')

var App = http.module.run()

App.def('respond', function (json, o) {
  json(o)
})

App.createServer = function () {
  var app = this

  return function server (req, res) {
    app.run()
      .set('req', req)
      .set('res', res)
      .eval('respond', function (err) {
        if (err) throw err
      })
  }
}

describe('http.json', function () {
  var server, o, app

  function request () {
    return supertest(server).get('/')
  }

  beforeEach(function () {
    o = new http.Send
    app = App
      .run()
      .set('o', o)
    server = app.createServer()
  })

  it('Should respond with json', function (done) {
    o.send({ hello: 'world' })
    request().end(function (err, res) {
      if (err) return done(err)
      res.headers.should.have.property('content-type').equal('application/json')
      JSON.parse(res.text).should.eql({
        hello: 'world'
      })
      done()
    })
  })

})

