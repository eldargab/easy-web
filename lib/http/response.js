var mime = require('mime')

module.exports = Response

/*
 * Progressive setup for <send> function
 *
 * It's not prototype for ServerResponse
 */

function Response () {
  this.headers = {}
  this.statusCode = 200
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

Response.prototype.template = function (tpl) {
  this.tpl = tpl
  return this
}

Response.prototype.end = function (cb) {
  cb(null, this)
}

Response.prototype.pipeHeaders = function (res) {
  for (var key in this.headers) {
    res.setHeader(key, ''+this.headers[key])
  }
}

