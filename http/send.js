var mime = require('mime')

module.exports = Send

/*
 * Progressive setup for http "send" services
 */

function Send () {
  this.headers = {}
  this.statusCode = 200
}

Send.prototype.status = function (code) {
  this.statusCode = code
  return this
}

Send.prototype.set = function (name, val) {
  this.headers[name.toLowerCase()] = val
  return this
}

Send.prototype.get = function (name) {
  return this.headers[name.toLowerCase()]
}

Send.prototype.type = function (type) {
  this.set('Content-Type', ~type.indexOf('/') ? type : mime.lookup(type))
  return this
}

Send.prototype.send = function (buf) {
  this.body = buf
  return this
}

Send.prototype.pipeHeaders = function (res) {
  for (var key in this.headers) {
    res.setHeader(key, this.headers[key])
  }
}
