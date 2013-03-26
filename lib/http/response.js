var mime = require('mime')
var send = require('http-send')

module.exports = Response

function Response (req, res) {
  this.req = req
  this.res = res
}

Response.prototype.status = function (code) {
  this.statusCode = code
  return this
}

Response.prototype.set = function (name, val) {
  this.headers = this.headers || {}
  this.headers[name.toLowerCase()] = String(val)
  return this
}

Response.prototype.get = function (name) {
  return this.headers && this.headers[name.toLowerCase()]
}

Response.prototype.type = function (type) {
  if (arguments.length > 0) {
    this.set('Content-Type', ~type.indexOf('/') ? type : mime.lookup(type))
    return this
  } else {
    return this.get('Content-Type')
  }
}

Response.prototype.send = function (buf) {
  this.body = buf
  return this
}

Response.prototype.end = function (cb) {
  this.res.statusCode = this.statusCode || 200
  for (var key in this.headers) {
    this.res.setHeader(key, this.headers[key])
  }
  send(this.req, this.res, this.body, cb)
}

function mix (t, src) {
  for (var key in src) {
    t[key] = src[key]
  }
  return t
}
