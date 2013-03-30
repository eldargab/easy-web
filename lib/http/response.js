var mime = require('mime')
var send = require('http-send')
var STATUS_CODES = require('http').STATUS_CODES

module.exports = Response

function Response(req, res, app) {
  this.req = req
  this.res = res
  this.app = app
}

Response.prototype.status = function(code) {
  this.statusCode = code
  return this
}

Response.prototype.set = function(name, val) {
  this.headers = this.headers || {}
  this.headers[name.toLowerCase()] = String(val)
  return this
}

Response.prototype.get = function(name) {
  return this.headers && this.headers[name.toLowerCase()]
}

Response.prototype.type = function(type) {
  if (arguments.length > 0) {
    this.set('Content-Type', ~type.indexOf('/') ? type : mime.lookup(type))
    return this
  } else {
    return this.get('Content-Type')
  }
}

Response.prototype.send = function(buf) {
  this.body = buf
  return this
}

Response.prototype.redirect = function(url) {
  if (url == 'back') {
    url = this.req.headers.referrer || this.req.headers.referer || '/'
  }
  this.set('Location', url)
  if (!this.statusCode) this.statusCode = 302
  return this
}

Response.prototype.end = function(cb) {
  this._json()
  this._redirectText()
  this._end(cb)
}

Response.prototype._end = function(cb) {
  this.res.statusCode = this.statusCode
  for (var key in this.headers) {
    this.res.setHeader(key, this.headers[key])
  }
  send(this.req, this.res, this.body, cb)
}

Response.prototype._json = function() {
  if (!this.isJson()) return
  if (!this.type()) this.type('json')
  this.body = JSON.stringify(this.body, null, this.jsonSpaces)
}

Response.prototype.jsonSpaces = process.env.NODE_ENV == 'production' ? 0 : 2

Response.prototype.isJson = function() {
  return this.body
    && typeof this.body == 'object'
    && !Buffer.isBuffer(this.body)
    && !this.body.pipe
}

Response.prototype._redirectText = function() {
  var code = this.statusCode
  if (code > 300 && code < 400) {
    if (this.body) return
    this.body = code + ' ' + STATUS_CODES[code]
      + '. Redirecting to ' + this.get('Location')
    this.type('text')
  }
}
