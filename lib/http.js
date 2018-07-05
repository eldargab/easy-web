const App = require('easy-app')
const parseUrl = require('url').parse
const ct = require('content-type')
const qs = require('querystring')
const go = require('go-async')
const iconv = require('iconv-lite')
const statuses = require('statuses')
const encodeUrl = require('encodeurl')


const app = module.exports = new App


app.def('url', req => parseUrl(req.url))


app.def('path', url => url.pathname)


app.def('query', url => qs.parse(url.query))


app.def('contentLength', function(req, error) {
  let hdr = req.headers['content-length']
  if (!hdr) return null
  let len = parseInt(hdr)
  if (!(len >= 0)) throw error(400, 'Bad Content-Length header')
  return len
})


app.def('contentType', function(req, error) {
  let hdr = req.headers['content-type']
  if (hdr == null) return null
  try {
    return ct.parse(hdr)
  } catch(e) {
    throw error(400, 'Bad Content-Type header')
  }
})


app.def('mime', contentType => contentType && contentType.type)


app.def('charset', function(contentType) {
  let charset = contentType && contentType.parameters.charset
  return charset || 'UTF-8'
})


app.set('maxBufferedContentLength', 1024 * 1024)


app.def('consumeBody', function(req, contentLength, maxBufferedContentLength, error) {
  return function consumeBody(push) {
    let limit = contentLength == null ? maxBufferedContentLength : contentLength
    if (limit > maxBufferedContentLength) throw error(413)

    let future = new go.Future
    let received = 0

    req.on('data', function(data) {
      if (future.ready) return
      received += data.length
      if (received > limit) return future.done(error(400, 'Request body exceeded Content-Length'))
      push(data)
    })

    req.on('end', function() {
      if (contentLength == null || received == contentLength) {
        future.done()
      }  else {
        future.done(error(400, 'Request body did not match Content-Length'))
      }
    })

    req.on('error', function(err) {
      future.done(err)
    })

    req.on('close', function() {
      future.done(new Error('Connection closed'))
    })

    return future
  }
})


app.def('binaryBody', function*(consumeBody) {
  let chunks = []
  yield consumeBody(chunk => chunks.push(chunk))
  return Buffer.concat(chunks)
})


app.def('stringBody', function*(charset, consumeBody, error) {
  if (!iconv.encodingExists(charset)) throw error(415, 'Unknown encoding')
  let decoder = iconv.getDecoder(charset)
  let buf = ''
  yield consumeBody(function(chunk) {
    buf += decoder.write(chunk)
  })
  buf += decoder.end()
  return buf
})


app.def('jsonBody', function(stringBody, error) {
  try {
    return JSON.parse(stringBody)
  } catch(e) {
    throw error(400, 'Request body is not a valid json')
  }
})


app.def('send', function(req, res) {
  return function send(status, contentType, body) {
    statuses(status)

    if (statuses.empty[status]) {
      res.removeHeader('Content-Type');
      res.removeHeader('Content-Length');
      res.removeHeader('Transfer-Encoding');
      res.end()
      return
    }

    res.statusCode = status

    let stream = false

    if (typeof body == 'string') {
      res.setHeader('Content-Length', Buffer.byteLength(body))
      contentType = setCharset(contentType, 'UTF-8')
    } else if (Buffer.isBuffer(body)) {
      res.setHeader('Content-Length', body.length)
    } else if (body && typeof body.pipe == 'function') {
      stream = true
    } else {
      throw new TypeError('Wrong body type')
    }

    if (contentType) {
      res.setHeader('Content-Type', contentType)
    }

    if (req.method == 'HEAD') {
      res.end()
    } else if (stream) {
      return pipe(body, res)
    } else {
      res.end(body)
    }
  }
})


function pipe(readable, res) {
  let future = new go.Future

  function cleanup() {
    res.removeListener('error', onerror)
    readable.removeListener('error', onerror)
    readable.removeListener('end', onend)
  }

  function onerror(err) {
    cleanup()
    future.done(err)
  }

  function onend() {
    cleanup()
    future.done()
  }

  res.on('error', onerror)
  readable.on('error', onerror)
  readable.on('end', onend)
  readable.pipe(res)

  return future
}


function setCharset(type, charset) {
  if (!type || !charset) {
    return type;
  }
  let parsed = ct.parse(type);
  parsed.parameters.charset = charset;
  return ct.format(parsed);
}


app.def('referrer', req => req.headers['referer'] || req.headers['referrer'])


app.def('redirect', function (referrer, res, send) {
  return function redirect(status, url) {
    if (url == 'back') {
      url = referrer
    }
    url = encodeUrl(url || '/')
    res.setHeader('Location', url)
    return send(status, 'text/plain', 'Redirecting to ' + url)
  }
})


app.set('jsonSpaces', 2)


app.def('sendJson', function (jsonSpaces, send) {
  return function sendJson(status, obj) {
    let json = JSON.stringify(obj, null, jsonSpaces)
    return send(status, 'application/json', json)
  }
})


app.def('route', function(router, path) {
  return router.match(path)
})


app.def('params', route => (route && route.params) || {})


app.def('generateUrl', function(router) {
  return function generateUrl(name, params, query) {
    let url = router.path(name, params)
    if (query) url += '?' + qs.stringify(query)
    return url
  }
})


app.def('error', function() {
  return function error(status, msg) {
    let err = new Error(msg)
    err.statusCode = status
    return err
  }
})


app.def('requestProcessing', function*(evaluate, error, res, sendHttpException, onServerError, route$, path$, sendResult$) {
  try {
    let route = yield route$()
    if (!route) throw error(404, 'Resource ' + (yield path$()) + ' not found')
    let result = yield evaluate(route.name)
    if (!res.headersSent) {
      let sendResult = yield sendResult$()
      yield sendResult(result)
    }
  } catch(e) {
    if (e.statusCode && !res.headersSent) {
      yield sendHttpException(e)
    } else {
      yield onServerError(e)
    }
  }
})


app.def('sendHttpException', function(send) {
  return function sendHttpException(e) {
    let status = e.statusCode
    let msg = e.message || statuses.STATUS_CODES[status]
    return send(status, 'text/plain', msg)
  }
})


app.def('onServerError', function(send, res) {
  return function onServerError(e) {
    console.error(e)
    if (res.headersSent) {
      res.destroy()
    } else {
      return send(500, 'text/plain', e.stack || e.toString())
    }
  }
})


app.def('sendResult', function(sendJson) {
  return function sendResult(res) {
    return sendJson(200, res)
  }
})