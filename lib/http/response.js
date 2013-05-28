var mime = require('mime')
var cookie = require('cookie')
var send = require('./send')

module.exports = Response

function Response(req, res) {
  this.req = req
  this.res = res
  this.headers = {}
}

Response.prototype.status = function(code) {
  this.statusCode = code
  return this
}

Response.prototype.set = function(name, val) {
  this.headers[name.toLowerCase()] = val+''
  return this
}

Response.prototype.unset = function(name) {
  delete this.headers[name.toLowerCase()]
  return this
}

Response.prototype.get = function(name) {
  return this.headers[name.toLowerCase()]
}

Response.prototype.type = function(type) {
  if (arguments.length > 0) {
    this.headers['content-type'] = ~type.indexOf('/') ? type : mime.lookup(type)
    return this
  } else {
    return this.headers['content-type']
  }
}

Response.prototype.cookie = function(name, val, opts) {
  opts = mix({path: '/'}, opts)
  var c = cookie.serialize(name, ''+val, opts)
  var cookies = this.headers['set-cookie'] = this.headers['set-cookie'] || []
  cookies.push(c)
  return this
}

Response.prototype.clearCookie = function(name, opts) {
  opts = mix({path: '/', expires: new Date(1)}, opts)
  this.cookie(name, '', opts)
  return this
}

Response.prototype.send = function(buf) {
  this.body = buf
  return this
}

Response.prototype.end = function(cb) {
  send(this.req, this.res, this.statusCode, this.headers, this.body, cb)
}

function mix(t, src) {
  for (var key in src) {
    t[key] = src[key]
  }
  return t
}
