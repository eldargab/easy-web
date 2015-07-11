'use strict'

let escape = require('escape-regexp')

module.exports = Route

function Route(meth, path, name) {
  this.method = meth
  this.name = name
  this.compile(path)
}

Route.prototype.compile = function(p) {
  let keys = this.keys = []

  p = p.replace(/\{(\w+)\}/g, function(_, name) {
    keys.push(name)
    return '{var}'
  })

  let segs = this.segs = p.split('{var}').map(function(seg) {
    return encodeURI(seg)
  })

  let regex = '^'

  for (let i = 0; i < segs.length; i++) {
    regex += escape(segs[i])
    if (keys[i]) regex += '([^\\/]+)'
  }

  regex += '\\/?'
  regex += '$'

  this.regex = new RegExp(regex)
}

Route.prototype.testMethod = function(method) {
  if (this.method == method) return true
  if (this.method == 'ALL') return true
  if (this.method == 'GET' && method == 'HEAD') return true
  return false
}

Route.prototype.match = function(p, req) {
  if (!this.testMethod(req.method)) return null

  let m = this.regex.exec(p)
  if (!m) return

  let params = {}

  for (let i = 1; i < m.length; i++) {
    if (m[i]) {
      params[this.keys[i - 1]] = decodeURIComponent(m[i])
    }
  }

  return {name: this.name, params: params}
}

Route.prototype.url = function(name, params) {
  if (this.name != name) return
  let url = ''
  for (let i = 0; i < this.segs.length; i++) {
    url += this.segs[i]
    let key = this.keys[i]
    if (key) url += encodeURIComponent(params[key])
  }
  return url
}
