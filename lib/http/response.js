'use strict'

const App = require('easy-app')
const fresh = require('fresh')

const res = module.exports = new App

res.def('make', function(req, res, serialize$) {
  let headers = res.headers = res.headers || {}

  yield serialize$

  res.status = res.status || 200

  if (req.method == 'HEAD' || req.method == 'GET') {
    if (res.status >= 200 && res.status < 300 && fresh(req.headers, headers)) {
      res.status = 304
    }
  }

  if (res.status == 204 || res.status == 304) {
    delete headers['content-type']
    delete headers['content-length']
    delete headers['transfer-encoding']
    res.body = null
  } else {
    if (Buffer.isBuffer(res.body)) {
      headers['content-length'] = headers['content-length'] || ''+res.body.length
    }
    let type = headers['content-type']
    if (/^text/.test(type) && !/charset/.test(type)) {
      type += '; charset=UTF-8' // so that if something is screwed up, it is screwed up on all machines
    }
    headers['content-type'] = type || 'application/octet-stream'
  }

  if (req.method == 'HEAD') res.body = null

  return res
})

res.def('serialize', function*(res, json$) {
  if (!res.body) return
  if (Buffer.isBuffer(res.body)) return
  if (typeof res.body.read == 'function') return // Stream
  if (typeof res.body == 'object') yield json$
  if (typeof res.body != 'string')
    throw new Error('Unexpected body type: ' + typeof res.body)
  let type = res.headers['content-type']
  if (!type) {
    res.headers['content-type'] = 'text/plain; charset=UTF-8'
  } else if (!/charset/.test(type)) { // TODO: just enforce right encoding?
    res.headers['content-type'] = type + '; charset=UTF-8'
  }
  res.body = new Buffer(res.body)
})

res.def('json', function(res, json_spaces) {
  res.headers['content-type'] = 'application/json'
  res.body = JSON.stringify(res.body, null, json_spaces)
})

res.set('json_spaces', 2)
