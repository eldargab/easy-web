const go = require('go-async')
const ct = require('content-type')


exports.ifMatch = function ifMatch(req, etag) {
  let match = req.headers['if-match']
  return match ? testEtag(match, etag) : true
}


exports.ifNoneMatch = function ifNoneMatch(req, etag) {
  let match = req.headers['if-none-match']
  return match ? !testEtag(match, etag) : true
}


exports.ifUnmodifiedSince = function ifUnmodifiedSince(req, mtime) {
  let hdr = req.headers['if-unmodified-since']
  if (!hdr) return true
  if (!mtime) return false
  let since = parseHttpDate(hdr)
  return isNaN(since) ? false : mtime <= since
}


exports.ifModifiedSince = function ifModifiedSince(req, mtime) {
  if (!mtime) return true
  let hdr = req.headers['if-modified-since']
  if (!hdr) return true
  let since = parseHttpDate(hdr)
  return isNaN(since) ? true : mtime > since
}


exports.isFresh = function(req, etag, mtime) {
  let cacheControl = req.headers['cache-control']
  if (cacheControl && /(?:^|,)\s*?no-cache\s*?(?:,|$)/.test(cacheControl)) return false
  return !exports.ifNoneMatch(req, etag) || !exports.ifModifiedSince(req, mtime)
}


exports.ifRange = function(req, etag, mtime) {
  let hdr = req.headers['if-range']
  if (!hdr) return true
  if (hdr.indexOf('"') >= 0) {
    return testEtag(hdr, etag)
  } else {
    let since = parseHttpDate(hdr)
    return isNaN(since) || !mtime ? false : mtime <= since
  }
}


function testEtag(match, etag) {
  if (match === '*') return true
  if (etag == null) return false

  let tokens = parseTokenList(match)

  for (let i = 0; i < tokens.length; i++) {
    let tok = tokens[i]
    if (tok === etag) return true
    if (tok === 'W/' + etag) return true
    if ('W/' + tok === etag) return true
  }

  return false
}


/**
 * Parse a HTTP token list.
 */
function parseTokenList(str) {
  let end = 0
  let list = []
  let start = 0

  // gather tokens
  for (let i = 0, len = str.length; i < len; i++) {
    switch (str.charCodeAt(i)) {
      case 0x20: /*   */
        if (start === end) {
          start = end = i + 1
        }
        break
      case 0x2c: /* , */
        list.push(str.substring(start, end))
        start = end = i + 1
        break
      default:
        end = i + 1
        break
    }
  }

  // final token
  list.push(str.substring(start, end))

  return list
}


function parseHttpDate(str) {
  return Date.parse(str)
}


exports.pipe = function pipe(readable, writable, options) {
  options = options || {}

  let future = new go.Future

  function cleanup() {
    writable.removeListener('error', onError)
    readable.removeListener('error', onError)
    readable.removeListener('end', onEnd)
    if (options.consume) {
      readable.destroy()
    }
  }

  function onError(err) {
    cleanup()
    future.done(err)
  }

  function onEnd() {
    cleanup()
    process.nextTick(() => future.done()) // prevent potential completion before writable.end() call
  }

  writable.on('error', onError)
  readable.on('error', onError)
  readable.on('end', onEnd)
  readable.pipe(writable, {end: !!options.end})

  return future
}


exports.setHeaders = function(res, headers) {
  for (let name in headers) {
    res.setHeader(name, headers[name])
  }
}


exports.setCharset = function setCharset(type, charset) {
  if (!type || !charset) {
    return type;
  }
  let parsed = ct.parse(type);
  parsed.parameters.charset = charset;
  return ct.format(parsed);
}


exports.removeAllHeaders = function(res) {
  for (let name in res.headers) {
    res.removeHeader(name)
  }
}