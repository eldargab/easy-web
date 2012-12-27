var mime = require('mime')
var cookie = require('cookie')

module.exports = Response

/*
 * Progressive setup for <send> function
 *
 * It's not prototype for ServerResponse
 */

function Response () {
  this.headers = {}
  this.statusCode = 200
  this.cookies = []
}

Response.prototype.status = function (code) {
  this.statusCode = code
  return this
}

Response.prototype.set = function (name, val) {
  this.headers[name.toLowerCase()] = String(val)
  return this
}

Response.prototype.get = function (name) {
  return this.headers[name.toLowerCase()]
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

Response.prototype.cookieDefaults = {
  path: '/'
}

Response.prototype.cookie = function (name, val, opts) {
  this.cookies.push({
    name: name,
    val: val,
    opts: mix(mix({}, this.cookieDefaults), opts)
  })
  return this
}

Response.prototype.end = function (cb) {
  cb(null, this)
}

function mix (t, src) {
  for (var key in src) {
    t[key] = src[key]
  }
  return t
}
