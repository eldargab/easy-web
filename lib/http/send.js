var fresh = require('fresh')
var sink = require('min-stream-node').streamToSink
var noop = function() {}

module.exports = function send(req, res, status, headers, body, cb) {
  var head = req.method == 'HEAD'
    , status = status || 200
    , stream
    , string
    , len = 0

  headers = headers || {}

  status = status >= 200 && status < 300 && fresh(req.headers, headers)
    ? 304
    : status

  // strip irrelevant headers
  if (status == 204 || status == 304) {
    delete headers['content-type']
    delete headers['content-length']
    delete headers['transfer-encoding']
    body = null
  } else {
    if (body) {
      switch(typeof body) {
        case 'string':
          len = Buffer.byteLength(body)
          string = true
          break
        case 'function':
          stream = body
          body = null
          len = null
          break
        default:
          len = body.length
      }
    }

    var type = headers['content-type']

    if (/^text/.test(type) && !/; *charset/.test(type)) {
      headers['content-type'] += '; charset=UTF-8'
    }

    if (!type) {
      headers['content-type'] = string
        ? 'text/plain; charset=UTF-8'
        : 'application/octet-stream'
    }

    if (len != null && !headers['content-length']) {
      headers['content-length'] = len+''
    }
  }

  res.writeHead(status, headers)

  if (head) {
    res.end()
  } else if (stream) {
    sink(res)(stream)(cb || noop)
  } else {
    res.end(body)
  }
}
