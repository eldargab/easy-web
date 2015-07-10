'use strict'

const CODES = require('http').STATUS_CODES
const Stream = require('easy-streaming')

exports.error = function(status, opts) {
  if (!CODES[status]) throw new Error('Unknown status code ' + status)

  let msg = typeof opts == 'string'
    ? opts
    : opts && opts.message

  let err = new Error(msg || CODES[status])

  for(let key in opts) {
    err[key] = opts[k]
  }
  err.http = true
  err.status = status
  err.msg = msg
  return err
}

exports.assert = function(truth, status, opts) {
  if (!truth) throw error(status, opts)
}

exports.statusPage = function(status, message) {
  let body = 'HTTP ' + status + ' ' + CODES[status]
  if (message) body += '\n\n' + message
  return exports.stringResponse(status, 'text/plain', body)
}

exports.stringResponse = function(status, contentType, str) {
  let body = new Buffer(str)
  let res = {status: status, headers: {}, body: body}
  res.headers['content-type'] =  contentType + '; charset=UTF8'
  res.headers['content-length'] = ''+body.length
  return res
}

exports.isStream = function(obj) {
  return obj && typeof obj.read == 'function'
}

exports.isJson = function(obj) {
  return obj && typeof obj == 'object' && !Buffer.isBuffer(obj) && !exports.isStream(obj)
}

exports.send = function(res, native) {
  native.writeHead(res.status, res.headers)
  if (exports.isStream(res.body)) {
    Stream.sink(res, native)
  } else {
    native.end(res.body)
  }
}
