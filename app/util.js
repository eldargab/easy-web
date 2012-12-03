var Send = require('../http').Send

exports.Action = Action

function Action (name, args) {
  this.action = name
  this.args = args || []
}

exports.action = function (name) {
  return function () {
    return new Action(name, Array.prototype.slice.call(arguments))
  }
}


exports.send = SendAction('http.send')

exports.json = SendAction('http.json')

function SendAction (name) {
  return function (status, type, buf, cb) {
    if (typeof status != 'number') {
      cb = buf
      buf = type
      type = status
      status = null
    }

    if (typeof buf == 'function' || buf == null) {
      cb = buf
      buf = type
      type = null
    }

    var send = new Send

    type && send.type(type)
    status && send.status(status)
    send.send(buf)

    var action = new Action(name, [send])

    if (!cb) return action

    cb(null, action)
  }
}
