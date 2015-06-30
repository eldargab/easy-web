exports.error = function(status, opts) {
  let err = new Error(typeof opts == 'string' ? opts : CODES[status])
  err.http = true
  err.status = status
  for(let key in opts) {
    err[key] = opts[k]
  }
  return err
}

exports.assert = function(truth, status, opts) {
  if (!truth) throw error(status, opts)
}
