var escape = require('escape-regexp')

module.exports = Route

function Route (meth, path, task, opts) {
  opts = opts || {}
  this.meth = meth
  this.task = task
  this.cb = opts.cb
  this.params = opts.p
  this.compile(path)
}

Route.prototype.compile = function (p) {
  var keys = this.keys = []

  p = p.replace(/\{(\w+)\}/g, function (_, name) {
    keys.push(name)
    return '{var}'
  })

  var segs = this.segs = p.split('{var}').map(function (seg) {
    return encodeURI(seg)
  })

  var regex = '^'

  for (var i = 0; i < segs.length; i++) {
    regex += escape(segs[i])
    if (keys[i]) regex += '([^\\/]+)'
  }

  regex += '\\/?$'

  this.regex = new RegExp(regex)
}

Route.prototype.match = function (p, req) {
  if (this.meth != req.method
    && !(this.meth == 'GET' && req.method == 'HEAD')
    && this.meth != 'ALL') return false

  var m = this.regex.exec(p)
  if (!m) return false

  req.params = mix({}, this.params)

  for (var i = 1; i < m.length; i++) {
    if (m[i]) {
      req.params[this.keys[i - 1]] = decodeURIComponent(m[i])
    }
  }

  var matched = this.cb && this.cb(req, p)
  if (matched === false) {
    req.params = null
    return false
  }

  return this.task
}

Route.prototype.url = function (task, params) {
  if (task != this.task) return
  params = mix(mix({}, this.params), params)
  var url = ''
  for (var i = 0; i < this.segs.length; i++) {
    url += this.segs[i]
    var key = this.keys[i]
    if (key) url += encodeURIComponent(params[key])
  }
  return url
}

function mix (t, src) {
  for (var key in src) {
    t[key] = src[key]
  }
  return t
}
