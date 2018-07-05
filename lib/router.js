'use strict'


module.exports = Router


function Router(routes) {
  this.groups = []
  let group = {prefix: '', routes: []}
  routes.forEach(r => {
    if (r.prefix != group.prefix) {
      if (group.routes.length > 0) this.groups.push(group)
      group = {prefix: r.prefix, routes: []}
    }
    group.routes.push(r)
  })
  if (group.routes.length > 0) this.groups.push(group)

  this.names = {}
  routes.forEach(r => {
    if (!this.names[r.name]) this.names[r.name] = r
  })
}


Router.prototype.match = function(path) {
  for (let i = 0; i < this.groups.length; i++) {
    let g = this.groups[i]
    if (!path.startsWith(g.prefix)) continue
    if (path.length > g.prefix.length && path[g.prefix.length] != '/') continue
    let p = path.slice(g.prefix.length) || '/'

    for (let j = 0; j < g.routes.length; j++) {
      let route = g.routes[j]
      let params = route.path.match(p)
      if (params != null) return {
        name: route.name,
        params: params,
        methods: route.methods
      }
    }
  }
  return null
}


Router.prototype.path = function(name, params) {
  let route = this.names[name]
  if (!route) throw new Error(`Route for '${name}' not found`)
  return route.prefix + route.path.path(params)
}
