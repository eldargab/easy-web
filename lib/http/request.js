const App = require('easy-app')
const Stream = require('easy-streaming')
const Url = require('url')
const util = require('./util')
const error = util.error
const assert = util.assert

const req = module.exports = new App

req.def('url', function(req) {
  return Url.parse(req.url)
})

req.def('path', function(url) {
  return url.pathname
})

req.def('headers', function(req) {
  return req.headers
})

req.def('contentLength', function(headers) {
  let hdr = headers['content-length']
  if (!hdr) return
  let len = parseInt(hdr)
  assert(len >= 0, 400)
  return len
})

req.def('streamBody', function(req) {
  return req.body
})

req.set('maxBody', 1024 * 1024)

req.level('buffer', ['buffer_encoding'])

req.def('buffer', function(maxBody, streamBody, contentLength, buffer_encoding) {
  let limit = contentLength == null ? maxBody : contentLength
  assert(maxBody >= limit, 413)
  try {
    return Stream.buffer(streamBody, {encoding: buffer_encoding, limit: limit})
  } catch(e) {
    if (e.limit) throw contentLength == limit ? error(400) : error(413)
    throw e
  }
})

req.def('binaryBody', function(buffer) {
  return buffer({buffer_encoding: null})
})

req.def('stringBody', function(buffer) {
  return buffer({buffer_encoding: 'utf8'})
})

req.def('jsonBody', function(stringBody, headers) {
  let json = /^application\/json/.test(headers['content-type'])
  assert(json, 415)
  try {
    return JSON.parse(stringBody)
  } catch(e) {
    throw error(400)
  }
})
