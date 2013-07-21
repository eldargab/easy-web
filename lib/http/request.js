var parseUrl = require('url').parse
var cookie = require('cookie')
var source = require('min-stream-node').streamToSource
var StringDecoder = require('string_decoder').StringDecoder

module.exports = Request

function Request(req) {
  this.req = req
  this.method = req.method
  this.url = req.url
  this.headers = req.headers
  this.params = {}
  this.bodyConsumed = false
}

function getter(name, fn) {
  Object.defineProperty(Request.prototype, name, {
    get: fn
  })
}

Request.prototype.get = function(name) {
  switch (name = name.toLowerCase()) {
    case 'referer':
    case 'referrer':
      return this.headers.referrer
        || this.headers.referer
    default:
      return this.headers[name]
  }
}

getter('parsedUrl', function() {
  if (this._parsedUrl) return this._parsedUrl
  return this._parsedUrl = parseUrl(this.url)
})

getter('path', function() {
  return this.parsedUrl.pathname
})

getter('query', function() {
  return this.parsedUrl.query
})

getter('cookies', function() {
  if (this._cookies) return this._cookies
  return this._cookies = this.headers.cookie
    ? cookie.parse(this.headers.cookie)
    : {}
})

getter('xhr', function() {
  var val = this.headers['x-requested-with'] || ''
  return val.toLowerCase() == 'xmlhttprequest'
})

getter('hasBody', function() {
  return 'content-length' in this.headers
    || 'transfer-encoding' in this.headers
})

Request.prototype.body = function(encoding, limit, cb) {
  if (this.bodyConsumed) throw new Error('Body already consumed')
  this.bodyConsumed = true

  if (arguments.length == 0) return source(this.req)

  if (typeof encoding != 'string') {
    cb = limit
    limit = encoding
    encoding = 'utf8'
  }

  if (typeof limit == 'function') {
    cb = limit
    limit = Infinity
  }

  var len = parseInt(this.headers['content-length'], 10)
  if (len > limit) return limitError(limit, cb)

  var chunks
    , decoder
    , push
    , end
    , received = 0
    , binary = encoding == 'bin'
    , req = this.req

  if (binary) {
    chunks = []

    push = function(chunk) {
      chunks.push(chunk)
    }

    end = function() {
     return Buffer.concat(chunks, received)
    }
  } else {
    decoder = new StringDecoder(encoding)
    chunks = ''

    push = function(chunk) {
      chunks += decoder.write(chunk)
    }

    end = function() {
      return chunks + decoder.end()
    }
  }

  function onend() {
    cleanup()
    cb(null, end())
  }

  function onreadable() {
    var chunk = req.read()
    if (!chunk) return
    received += chunk.length
    if (received > limit) {
      cleanup()
      limitError(limit, cb)
      return
    }
    push(chunk)
  }

  function cleanup() {
    req.removeListener('end', onend)
    req.removeListener('readable', onreadable)
  }

  req
  .on('end', onend)
  .on('readable', onreadable)
  .read(0) // start reading
}

function limitError(limit, cb) {
  var err = new Error('Request body is too large.')
  err.limit = limit
  cb(err)
}
