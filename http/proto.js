var fresh = require('fresh')
var crc = require('buffer-crc32').signed

var proto = module.exports = require('easy-app')()

proto.def('fresh', function (req, res) {
  return function () {
    return fresh(req.headers, res._headers || {})
  }
})

proto.def('send', function (req, res, fresh) {
  var head = res.method == 'HEAD'
  return function send (o) {
    if (!o) {
      res.end()
      return
    }

    var len
      , type
      , body = o.body
      , status = res.statusCode = o.statusCode || 200

    o.pipeHeaders(res)

    if (typeof body == 'string') {
      res.charset = 'utf-8'
      type = 'text/html'
      len = Buffer.byteLength(o.body)
    } else {
      type = 'application/octet-stream'
      len = body && body.length
    }

    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', type)
    }

    if (len != null) {
      res.setHeader('Content-Length', String(len))
    }

    // ETag support
    if (len > 1024 && !res.getHeader('ETag')) {
      if (!Buffer.isBuffer(body)) body = new Buffer(body)
      res.setHeader('ETag', '"' + crc(body) + '"')
    }

    res.statusCode = status >= 200 && status < 300 && fresh()
      ? 304
      : status

    // strip irrelevant headers
    if (204 == res.statusCode || 304 == res.statusCode) {
      res.removeHeader('Content-Type');
      res.removeHeader('Content-Length');
      body = '';
    }

    res.end(head ? null : body)
  }
})

proto.def('json', function (send, json_replacer, json_spaces) {
  return function json (o) {
    if (!o.get('Content-Type')) o.type('json')
    o.send(JSON.stringify(o.body, json_replacer, json_spaces))
    send(o)
  }
})
.set('json_replacer', null)
.set('json_spaces', 2)
