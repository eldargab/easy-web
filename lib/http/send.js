var fresh = require('fresh')
var crc = require('buffer-crc32').signed

/*
 * Send http response
 *
 * @param {ServerRequest} req
 * @param {ServerResponse} res
 * @param {Response} o
 * @param {Function} cb
 */

module.exports = function send (req, res, o, cb) {
  var head = req.method == 'HEAD'

  if (!o) {
    res.end()
    return
  }

  var type
    , body = o.body
    , stream
    , status = res.statusCode = o.statusCode || 200

  if (body == null) {
    type = 'text/html'
  } else if (typeof body == 'string') {
    type = 'text/html'
    body = new Buffer(body)
  } else if (Buffer.isBuffer(body)) {
    type = 'application/octet-stream'
  } else if (body.pipe) {
    type = 'application/octet-stream'
    stream = body
  } else  {
    try {
      type = 'application/json'
      body = JSON.stringify(body, null, 2)
      body = new Buffer(body)
    } catch (e) {
      return cb(e)
    }
  }

  o.pipeHeaders(res)

  if (!res.getHeader('Content-Type')) {
    res.setHeader('Content-Type', type)
  }

  if (!stream) {
    res.setHeader('Content-Length', String(body && body.length || 0))
  }

  // ETag support
  if (body && body.length > 1024 && !res.getHeader('ETag') && !stream) {
    res.setHeader('ETag', '"' + crc(body) + '"')
  }

  res.statusCode = status >= 200 && status < 300 && fresh(req.headers, res._headers)
    ? 304
    : status

  // strip irrelevant headers
  if (204 == res.statusCode || 304 == res.statusCode) {
    res.removeHeader('Content-Type')
    res.removeHeader('Content-Length')
    stream && stream.destroy()
    body = stream = null
  }

  if (stream) {
    if (head) {
      if (!res.getHeader('Content-Length'))
        return cb(new Error("Buffering of stream for determination of Content-Length is not supported"))
      stream.destroy()
      res.end()
    } else {
      res.on('error', function () {
        stream.destroy()
      })
      stream.pipe(res)
    }
  } else {
    res.end(head ? null : body)
  }
}
