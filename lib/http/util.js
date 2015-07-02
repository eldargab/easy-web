const CODES = require('http').STATUS_CODES

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
  return send(status, 'HTTP ' + status + '\n\n' + (message || CODES[status]))
}

exports.send = send

function send(status, str) {
  let body = new Buffer(str)
  let res = {status: status, headers: {}, body: body}
  res.headers['content-type'] = 'text/plain; charset=UTF8'
  res.headers['content-length'] = ''+body.length
  return res
}
