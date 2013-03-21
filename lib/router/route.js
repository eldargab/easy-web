var path2regex = require('path-to-regexp')

module.exports = Route

function Route (meth, path, task, opts) {
  this.opts = opts || {}
  this.meth = meth
  this.task = task
  this.compile(path)
  this.cb = this.opts.cb
}

Route.prototype.compile = function (p) {
  this.keys = []
  this.regex = path2regex(p, this.keys)
}

Route.prototype.match = function (p, req) {
  if (this.meth != req.method
    && !(this.meth == 'GET' && req.method == 'HEAD')
    && this.meth != 'ALL') return false

  var m = this.regex.exec(p)
  if (!m) return false

  var params = {}

  for (var i = 1; i < m.length; i++) {
    params[this.keys[i]] = m[i] && decodeURIComponent(m[i])
  }

  var matched = this.cb && this.cb(p, req, params)
  if (matched === false) return false

  req.params = params

  return this.task
}
