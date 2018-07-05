'use strict'

const escape = require('escape-regexp')


module.exports = RoutePath


function RoutePath(path) {
  if (path != '/' && path[path.length - 1] == '/') throw new Error("Non-root path can't end with '/'")

  let params = this.params = []

  path = path.replace(/\{(\w+)\}/g, function(_, name) {
    params.push(name)
    return '{var}'
  })

  let segs = this.segs = path.split('{var}').map(function(seg) {
    return encodeURI(seg)
  })

  let regex = '^'

  for (let i = 0; i < segs.length; i++) {
    regex += escape(segs[i])
    if (params[i]) regex += '([^\\/]+)'
  }

  if (path != '/') regex += '\\/?'
  regex += '$'

  this.regex = new RegExp(regex)
}


RoutePath.prototype.match = function(path) {
  let m = this.regex.exec(path)
  if (!m) return null

  let params = {}

  for (let i = 1; i < m.length; i++) {
    params[this.params[i - 1]] = decodeURIComponent(m[i])
  }

  return params
}


RoutePath.prototype.path = function(params) {
  let path = ''
  for (let i = 0; i < this.segs.length; i++) {
    path += this.segs[i]
    let key = this.params[i]
    if (key) path += encodeURIComponent(params[key])
  }
  return path
}
