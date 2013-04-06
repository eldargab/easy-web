var parseUrl = require('url').parse
var qs = require('qs')
var cookie = require('cookie')
var StringDecoder = require('string_decoder').StringDecoder

module.exports = Request

function Request(req) {
  this.req = req
  this.method = req.method
  this.url = req.url
  this.headers = req.headers
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
  if (this._query) return this._query
  return this._query = this.parsedUrl.search
    ? qs.parse(this.parsedUrl.search)
    : {}
})

Request.prototype.param = function(name) {
  return this.params && this.params[name] || this.query[name]
}

getter('cookies', function() {
  if (this._cookies) return this._cookies
  return this._cookies = this.headers.cookie
    ? cookie.parse(this.headers.cookie)
    : {}
})

getter('hasBody', function() {
  return 'content-length' in this.headers
    || 'transfer-encoding' in this.headers
})

Request.prototype.receiveBody = function(encoding, limit, cb) {
  if (typeof encoding != 'string') {
    cb = limit
    limit = encoding
    encoding = 'utf8'
  }

  if (typeof limit == 'function') {
    cb = limit
    limit = Infinity
  }

  if (this.bodyConsumed) return cb(new Error('Body already consumed.'))
  if (!this.hasBody) return cb()

  var len = parseInt(this.headers['content-length'], 10)
  if (len > limit) return limitError(limit, cb)

  this.bodyConsumed = true

  var chunks
    , decoder
    , push
    , end
    , recieved = 0
    , binary = encoding == 'bin'
    , req = this.req

  if (binary) {
    chunks = []

    push = function(chunk) {
      chunks.push(chunk)
    }

    end = function() {
     return Buffer.concat(chunks, recieved)
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

  function onreadable() {
    var chunk = req.read()
    if (!chunk) return
    recieved += chunk.length
    if (recieved > limit) {
      cleanup()
      return limitError(limit, cb)
    }
    push(chunk)
  }

  function onend() {
    cleanup()
    cb(null, end())
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

Request.prototype.pipe = function(stream, opts) {
  if (this.bodyConsumed) throw new Error('Body already consumed.')
  this.bodyConsumed = true
  return this.req.pipe(stream, opts)
}
