var mime = require('mime')
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

Response.prototype.send = function(buf) {
  this.body = buf
  return this
}

Response.prototype.end = function(cb) {
  send(this.req, this.res, this.statusCode, this.headers, this.body, cb)
}
