var fresh = require('fresh')

module.exports = function send(req, res, status, headers, body, cb) {
  var head = req.method == 'HEAD'
    , status = status || 200
    , stream
    , len = 0

  if (cb) {
    res.on('finish', cb)
    res.on('close', cb)
  }

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

    var type = headers['content-type']

    if (/^text/.test(type) && !/; *charset/.test(type)) {
      headers['content-type'] += '; charset=UTF-8'
    }

    if (!type) {
      headers['content-type'] = 'application/octet-stream'
    }

    if (len != null && !headers['content-length']) {
      headers['content-length'] = len+''
    }
  }

  res.writeHead(status, headers)

  if (head) {
    res.end()
  } else if (stream) {
    stream.on('error', function() {
      res.destroy()
    })
    stream.pipe(res)
  } else {
    res.end(body)
  }
}
