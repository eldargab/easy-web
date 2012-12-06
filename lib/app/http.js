var http = require('../http')

var proto = module.exports = require('easy-app')()

proto.def('send', function (req, res, json_replacer, json_spaces) {
  return function (o, cb) {
    if (isJson(o)) {
      !o.type() && o.type('json')
      try {
        o.body = JSON.stringify(o.body, json_replacer, json_spaces)
      } catch (e) {
        if (cb) return cb(e)
        throw e
      }
    }
    http.send(req, res, o, cb)
  }
})
.set('json_replacer', null)
.set('json_spaces', 2)

function isJson (o) {
  var body = o && o.body
  return typeof body == 'object'
    && body != null
    && !Buffer.isBuffer(body)
    && typeof body.pipe != 'function'
}
