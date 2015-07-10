const web = require('../lib')
const app = new web.App

app.get('/', function() {
  return {body: 'Hello world'}
})

app.set('port', 8000)

app.run()
