const App = require('easy-app')
const parseRange = require('range-parser')
const util = require('./util')


const app = module.exports = new App


app.set('length', null)
app.set('etag', null)
app.set('mtime', null)
app.set('ranges', false)
app.def('customization', {pre: []})


app.def('sending', function*(req, res, send, length, etag, mtime, ranges, customization$, write) {
  if (!util.ifMatch(req, etag) || !util.ifUnmodifiedSince(req, mtime)) {
    return send(412)
  }

  if (util.isFresh(req, etag, mtime)) {
    return send(304)
  }

  if (ranges) {
    res.setHeader('Accept-Ranges', 'bytes')

    if (/^ *bytes=/.test(req.headers.range) && util.ifRange(req, etag, mtime)) {
      let range = parseRange(length, req.headers.range, {combine: true})

      if (range === -1) { // Unsatisfiable
        res.setHeader('Content-Range', `bytes */${length}`)
        return send(416)
      }

      if (range !== -2 && range.length === 1) {
        let {start, end} = range[0]
        let len = end - start + 1
        yield customization$()
        if (etag) res.setHeader('ETag', etag)
        if (mtime) res.setHeader('Last-Modified', mtime.toUTCString())
        res.statusCode = 206
        res.setHeader('Content-Length', len)
        res.setHeader('Content-Range', `bytes ${start}-${end}/${len}`)
        if (req.method !== 'HEAD') yield write(res, {start, end})
        res.end()
        return
      }
    }
  }

  res.statusCode = 200
  yield customization$()
  if (length != null) res.setHeader('Content-Length', length)
  if (etag) res.setHeader('ETag', etag)
  if (mtime) res.setHeader('Last-Modified', mtime.toUTCString())
  if (req.method !== 'HEAD') yield write(res)
  res.end()
})