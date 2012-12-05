var mime = require('mime')
var fresh = require('fresh')
var crc = require('buffer-crc32').signed

/*
 * Progressive setup for http "send" services
 */

exports.Send = Send

function Send () {
  this.headers = {}
  this.statusCode = 200
}

Send.prototype.status = function (code) {
  this.statusCode = code
  return this
}

Send.prototype.set = function (name, val) {
  this.headers[name.toLowerCase()] = String(val)
  return this
}

Send.prototype.get = function (name) {
  return this.headers[name.toLowerCase()]
}

Send.prototype.type = function (type) {
  if (arguments.length > 0) {
    this.set('Content-Type', ~type.indexOf('/') ? type : mime.lookup(type))
    return this
  } else {
    return this.get('Content-Type')
  }
}

Send.prototype.send = function (buf) {
  this.body = buf
  return this
}

Send.prototype.pipeHeaders = function (res) {
  for (var key in this.headers) {
    res.setHeader(key, this.headers[key])
  }
}

/*
 * send function itself
 */

exports.fn = function send (req, res, o, cb) {
  var head = req.method == 'HEAD'

  if (!o) {
    res.end()
    return
  }

  var len
    , type
    , body = o.body
    , stream
    , status = res.statusCode = o.statusCode || 200

  o.pipeHeaders(res)

  if (typeof body == 'string') {
    type = 'text/html'
    len = Buffer.byteLength(o.body)
  } else {
    type = 'application/octet-stream'
    len = body && body.length
    stream = !!body && !!body.pipe
  }

  if (!res.getHeader('Content-Type')) {
    res.setHeader('Content-Type', type)
  }

  if (len != null && !res.getHeader('Content-Length')) {
    res.setHeader('Content-Length', String(len))
  }

  // ETag support
  if (len > 1024 && !res.getHeader('ETag') && !stream) {
    if (!Buffer.isBuffer(body)) body = new Buffer(body)
    res.setHeader('ETag', '"' + crc(body) + '"')
  }

  res.statusCode = status >= 200 && status < 300 && fresh(req.headers, res._headers)
    ? 304
    : status

  // strip irrelevant headers
  if (204 == res.statusCode || 304 == res.statusCode) {
    res.removeHeader('Content-Type')
    res.removeHeader('Content-Length')
    body = ''
    stream = false
  }

  if (stream) {
    if (head) {
      if (!res.getHeader('Content-Length')) {
        var err = new Error('Cant pipe response for HEAD')
        if (cb) return cb(err)
        throw err
      }
      res.end()
    } else {
      body.pipe(res)
    }
  } else {
    res.end(head ? null : body)
  }
}
