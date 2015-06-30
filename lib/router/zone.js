module.exports = Zone

function Zone(path, ns, router) {
  this.path = encodeURI(path)
  this.ns = ns
  this.router = router
}

Zone.prototype.match = function(path, req) {
  if (!startsWith(this.path, path)) return
  path = path.slice(this.path.length)
  let m = this.router.dispatch(path, req)
  if (!m) return {}
  if (m.route) m.route = add_namespace(this.ns, m.route)
  return m
}

Zone.prototype.url = function(name, params) {
  if (this.ns) {
    if (!startsWith(this.ns + '_', name)) return
    name = name.slice(this.ns.length + 1)
  }
  let url = this.router.getUrlFor(name, params)
  if (url) return this.path + url
}

function startsWith(prefix, str) {
  for (let i = 0; i < prefix.length; i++) {
    if (prefix[i] != str[i]) return false
  }
  return true
}

function add_namespace(ns, name) {
  return ns ? ns + '_' + name : name
}
