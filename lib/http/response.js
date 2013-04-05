var mime = require('mime')
var fresh = require('fresh')

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
  var head = this.req.method == 'HEAD'
    , res = this.res
    , status = this.statusCode || 200
    , body = this.body
    , stream
    , len = 0

  if (cb) {
    res.on('finish', cb)
    res.on('close', cb)
  }

  status = status >= 200 && status < 300 && fresh(this.req.headers, this.headers)
    ? 304
    : status

  // strip irrelevant headers
  if (status == 204 || status == 304) {
    this.unset('Content-Type')
    this.unset('Content-Length')
    this.unset('Transfer-Encoding')
    body && body.destroy && body.destroy()
    body = null
  } else {
    if (body) {
      if (typeof body == 'string') {
        len = Buffer.byteLength(body)
      } else if (body.pipe) {
        stream = body
        body = null
        len = null
      } else {
        len = body.length
      }
    }

    if (!this.headers['content-type'])
      this.headers['content-type'] = 'application/octet-stream'

    if (!this.headers['content-length'] && len != null)
      this.headers['content-length'] = len+''
  }

  res.writeHead(status, this.headers)

  if (head) {
    res.end()
  } else if (stream) {
    if (stream._readableState && stream._readableState.pipesCount > 0) {
      throw new Error('The stream already has consumers. Can\'t pipe to http response.')
    }
    stream.on('error', function() {
      res.destroy()
    })
    res.on('close', function () {
      stream.destroy()
    })
    stream.pipe(res)
    stream.pipe = noMoreConsumers
  } else {
    res.end(body)
  }
}

function noMoreConsumers() {
  throw new Error('The stream is taken by http response. You can\'t add consumers anymore.')
}
