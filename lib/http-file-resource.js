const resource = require('./http-resource')
const util = require('./util')
const fs = require('fs')
const mime = require('mime-types')
const go = require('go-async')


const app = module.exports = resource.copy()


app.set('ranges', true)


app.def('file', function() {
  throw new Error('Not defined')
})


app.def('stat', function*(file) {
  let stat = yield go.thunk(cb => fs.stat(file, cb))
  if (!stat.isFile()) throw new Error(`'${file}' is not a regular file`)
  return stat
})


app.def('length', stat => stat.size)


app.set('etagEnabled', true)
app.def('etag', function(etagEnabled, stat) {
  if (!etagEnabled) return null
  let mtime = stat.mtime.getTime().toString(16)
  let size = stat.size.toString(16)
  return '"' + size + '-' + mtime + '"'
})


app.set('mtimeEnabled', true)
app.def('mtime', function(mtimeEnabled, stat) {
  return mtimeEnabled ? stat.mtime : null
})


app.defs.customization.pre.unshift('contentTypeSetup')
app.def('contentTypeSetup', function(res, file) {
  if (!res.getHeader('Content-Type')) {
    let type = mime.lookup(file) || 'application/octet-stream'
    res.setHeader('Content-Type', type)
  }
})


app.def('write', function(file) {
  return function write(out, range) {
    return util.pipe(fs.createReadStream(file, range), out, {consume: true})
  }
})