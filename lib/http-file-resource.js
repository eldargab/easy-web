const resource = require('./http-resource')
const util = require('./util')
const fs = require('fs')
const mime = require('mime-types')


const app = module.exports = resource.copy()


app.def('path', function() {
  throw new Error('Not defined')
})


app.set('options', {})


app.def('stat', path => go.thunk(cb => fs.stat(path, cb)))


app.def('length', stat => stat.size)


app.def('ranges', options => options.ranges !== false)


app.def('etag', function(options, stat) {
  if (options.etag === false) return null
  let mtime = stat.mtime.getTime().toString(16)
  let size = stat.size.toString(16)
  return '"' + size + '-' + mtime + '"'
})


app.def('mtime', function(options, stat) {
  return options.mtime === false ? null : stat.mtime
})


app.def('customize', function(res, path, options) {
  util.setHeaders(res, options.headers)
  if (!res.getHeader('Content-Type')) {
    let type = mime.lookup(path) || 'application/octet-stream'
    res.setHeader('Content-Type', type)
  }
})


app.def('write', function(path) {
  return function write(out, range) {
    let stream = fs.createReadStream(path, range)
    return util.pipe(stream, out, {consume: true})
  }
})