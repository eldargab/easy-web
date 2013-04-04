var mime = require('mime')
var fresh = require('fresh')
var crc = require('buffer-crc32').signed

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

Response.prototype.end = function(cb) {
  var head = this.req.method == 'HEAD'
    , res = this.res
    , status = this.statusCode || 200
    , body = this.body
    , stream
    , type

  if (cb) {
    res.on('finish', cb)
    res.on('close', cb)
  }

  if (body == null) {
    type = 'text/html'
    body = ''
  } else if (typeof body == 'string') {
    type = 'text/html'
    body = new Buffer(body)
  } else if (body.pipe) {
    type = 'application/octet-stream'
    stream = body
    body = null
  } else {
    type = 'application/octet-stream'
  }

  if (!this.headers['content-type'])
    this.headers['content-type'] = type

  if (!this.headers['content-length'] && body != null)
    this.headers['content-length'] = body.length+''

  // ETag support
  if (body && body.length > 1024 && !this.headers.etag)
    this.headers.etag = '"' + crc(body) + '"'

  status = status >= 200 && status < 300 && fresh(this.req.headers, this.headers)
    ? 304
    : status

  // strip irrelevant headers
  if (status == 204 || status == 304) {
    this.unset('Content-Type')
    this.unset('Content-Length')
    this.unset('Transfer-Encoding')
    body = stream = null
  }

  res.writeHead(status, this.headers)

  if (head) {
    res.end()
  } else if (stream) {
    res.on('close', function () {
      stream.unpipe(res)
    })
    stream.pipe(res)
  } else {
    res.end(body)
  }
}
