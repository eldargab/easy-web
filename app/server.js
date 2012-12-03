var Request = require('./request')

module.exports = function Server (app, router) {

  function server (req, res) {
    req.__proto__ = Request

    var instance = app.run()
      .layer('request')
      .set('request', req)
      .set('response', res)

    try {
      var task = router.dispatch(req.path, req)
      dispatch(task, instance)
    } catch (e) {
      instance.handleException(e)
    }
  }

  server.listen = function () {
    var server = require('http').createServer(this)
    return server.listen.apply(server, arguments)
  }

  return server
}

function dispatch (task, app) {
  function cb (err, action) {
    if (err) return app.handleException(err)
    if (!action) return
    dispatch(action, app)
  }

  try {
    if (typeof task == 'string') {
      app.eval(task, cb)
    } else {
      app.eval(task.action, function (err, action) {
        if (err) return cb(err)
        try {
          task.args.push(cb)
          action.apply(null, task.args)
        } catch (e) {
          cb(e)
        }
      })
    }
  } catch (e) {
    app.handleException(e)
  }
}
