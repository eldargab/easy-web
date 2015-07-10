'use strict'

const App = require('easy-app')
const util = require('./util')
const CODES = require('http').STATUS_CODES

const res = module.exports = new App

res.def('response', function*(res, serialize$, postprocess$) {
  res.headers = res.headers || {}
  yield serialize$
  yield postprocess$
})

res.def('serialize', function*(res, statusPage$, json$) {
  if (res.status == 204 || res.status == 304) return

  if (!res.body) {
    yield statusPage$
  }

  if (util.isJson(res.body)) {
    yield json$
  }
})

res.def('statusPage', function(res) {
  res.status = res.status || 200
  res.body = 'HTTP ' + res.status + ' ' + CODES[res.status]
  if (res.msg) res.body += '\n\n' + res.msg
  res.headers['content-type'] = 'text/plain'
})

res.def('json', function(res, json_spaces) {
  res.headers['content-type'] = 'application/json'
  res.body = JSON.stringify(res.body, null, json_spaces)
})

res.set('json_spaces', 2)

res.def('postprocess', function(req, res) {
  let headers = res.headers = res.headers || {}

  res.status = res.status || 200

  if (res.status == 204 || res.status == 304) {
    delete headers['content-type']
    delete headers['content-length']
    delete headers['transfer-encoding']
    res.body = null
  } else {
    let type = headers['content-type']
    let string = false
    if (typeof res.body == 'string') {
      string = true
      type = type || 'text/plain'
      res.body = new Buffer(res.body)
    }
    if (Buffer.isBuffer(res.body)) {
      headers['content-length'] = ''+res.body.length
    }
    if ((string || /^text/.test(type)) && !/charset/.test(type)) {
      type += '; charset=UTF-8' // so that if something is screwed up, it is screwed up on all machines
    }
    headers['content-type'] = type || 'application/octet-stream'
  }

  if (req.method == 'HEAD') res.body = null

  return res
})
