const App = require('easy-app')
const parseUrl = require('url').parse
const ct = require('content-type')
const qs = require('querystring')
const go = require('go-async')
const iconv = require('iconv-lite')
const statuses = require('statuses')
const encodeUrl = require('encodeurl')
const fs = require('fs')
const util = require('./util')
const mime = require('mime-types')


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
    res.statusCode = statuses(status)

    if (statuses.empty[status]) {
      res.removeHeader('Content-Type');
      res.removeHeader('Content-Length');
      res.removeHeader('Transfer-Encoding');
      res.end()
      return
    }

    let stream = false

    switch (typeof body) {
      case 'string':
        res.setHeader('Content-Length', Buffer.byteLength(body))
        contentType = util.setCharset(contentType, 'UTF-8')
        break
      case 'function':
        stream = true
        break
      default:
        if (Buffer.isBuffer(body)) {
          res.setHeader('Content-Length', body.length)
        } else if (body != null) {
          throw new TypeError('Wrong body type')
        }
    }

    if (contentType) {
      res.setHeader('Content-Type', contentType)
    }

    if (req.method == 'HEAD') {
      res.end()
    } else if (stream) {
      return body((readable, {consume}) => util.pipe(readable, res, {end: true, consume}))
    } else {
      res.end(body)
    }
  }
})


app.def('sendFile', function(req, res, send) {
  return function* sendFile(status, contentType, path) {
    if (arguments.length < 3) {
      path = contentType
      contentType = mime.lookup(path) || 'application/octet-stream'
    }

    let stat = yield go.thunk(cb => fs.stat(path, cb))
    if (!stat.isFile()) throw new Error(`'${path}' is not a file`)

    res.setHeader('Content-Length', stat.size)

    return send(status, contentType, function(sink) {
      let stream = fs.createReadStream(path)
      return sink(stream, {consume: true})
    })
  }
})


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
  return function sendJson(status, contentType, obj) {
    if (arguments.length < 3) {
      obj = contentType
      contentType = 'application/json'
    }
    let json = JSON.stringify(obj, null, jsonSpaces)
    return send(status, contentType, json)
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


app.def('requestProcessing', function*(evaluate, req, res, error, sendHttpException, onServerError, route$, sendResult$) {
  try {
    let route = yield route$()
    if (!route) return sendHttpException(error(404))

    if (route.methods.indexOf(req.method) < 0) {
      res.setHeader('Allow', route.methods.join(', '))
      return sendHttpException(error(405))
    }

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


app.def('onServerError', function(logServerError, send, res) {
  return function onServerError(e) {
    logServerError(e)
    if (res.headersSent) {
      res.destroy()
    } else {
      return send(500, 'text/plain', e.stack || e.toString())
    }
  }
})


app.def('logServerError', function() {
  return err => console.error(err)
})


app.def('sendResult', function(sendJson) {
  return function sendResult(res) {
    return sendJson(200, res)
  }
})