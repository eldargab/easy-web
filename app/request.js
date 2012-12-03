var http = require('http')
var parseUrl = require('url').parse
var qs = require('qs')

var proto = module.exports = Object.create(http.IncomingMessage.prototype)

function getter (name, fn) {
  Object.defineProperty(proto, name, {
    get: fn
  })
}

proto.get = proto.header = function (name) {
  switch (name = name.toLowerCase()) {
    case 'referer':
    case 'referrer':
      return this.headers.referrer
        || this.headers.referer
    default:
      return this.headers[name]
  }
}

getter('parsedUrl', function () {
  if (this._parsedUrl) return this._parsedUrl
  return this._parsedUrl = parseUrl(this.url)
})

getter('query', function () {
  if (this._query) return this._query
  return this._query = this.parsedUrl.search
    ? qs.parse(this.parsedUrl.search)
    : {}
})

getter('path', function () {
  return this.parsedUrl.pathname
})

proto.param = function (name) {
  return this.params && this.params[name] || this.query[name]
}
