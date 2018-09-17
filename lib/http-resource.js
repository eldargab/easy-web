const App = require('easy-app')
const parseRange = require('range-parser')
const util = require('./util')


const app = module.exports = new App


app.set('length', null)
app.set('etag', null)
app.set('mtime', null)
app.set('ranges', false)
app.def('customization', {pre: []})


app.def('write', function() {
  throw new Error("Not implemented")
})


app.def('sendResource', function*(req, res, send, sendStatus, length, etag, mtime, ranges, customization$, write) {
  if (etag != null || mtime != null) {
    if (!util.ifMatch(req, etag) || !util.ifUnmodifiedSince(req, mtime)) {
      return sendStatus(412)
    }

    if (util.isFresh(req, etag, mtime)) {
      return sendStatus(304)
    }
  }

  if (ranges) {
    res.setHeader('Accept-Ranges', 'bytes')

    if (/^ *bytes=/.test(req.headers.range) && util.ifRange(req, etag, mtime)) {
      let range = parseRange(length, req.headers.range, {combine: true})

      if (range === -1) { // Unsatisfiable
        res.setHeader('Content-Range', `bytes */${length}`)
        return sendStatus(416)
      }

      if (range !== -2 && range.length === 1) {
        let {start, end} = range[0]
        let len = end - start + 1
        yield customization$()
        if (etag) res.setHeader('ETag', etag)
        if (mtime) res.setHeader('Last-Modified', mtime.toUTCString())
        res.setHeader('Content-Length', len)
        res.setHeader('Content-Range', `bytes ${start}-${end}/${len}`)
        return send(206, function*(res) {
          yield write(res, {start, end})
          res.end()
        })
      }
    }
  }

  yield customization$()
  if (length != null) res.setHeader('Content-Length', length)
  if (etag) res.setHeader('ETag', etag)
  if (mtime) res.setHeader('Last-Modified', mtime.toUTCString())
  return send(200, function*(res) {
    yield write(res)
    res.end()
  })
})