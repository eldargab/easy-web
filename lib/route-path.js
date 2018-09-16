'use strict'

const escape = require('escape-regexp')


module.exports = RoutePath


function RoutePath(path) {
  if (path != '/' && path[path.length - 1] == '/') throw new Error("Non-root path can't end with '/'")
  if (path.indexOf('*') >= 0) {
    if (path.indexOf('*') + 1 != path.length || !path.endsWith('/*')) {
      throw new Error("'*' can be used only at the end of path as a last segment")
    }
  }

  let params = this.params = []

  let regex = '^' + path.split('/').map(function(seg, i, segments) {
    if (seg == '*') {
      params.push('*')
      return '(.*)'
    }

    let m = /^{(\w+)}$/.exec(seg)
    if (m) {
      params.push(m[1])
      return '([^\\/]+)'
    }

    return escape(encodeURIComponent(seg))
  }).join('/')

  if (path != '/' && path != '/*') regex += '\\/?'
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
