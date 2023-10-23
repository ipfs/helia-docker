import debug from 'debug'
import express from 'express'
import promBundle from 'express-prom-bundle'
import session from 'express-session'
import { HOST, PORT } from './constants.js'
import { HeliaServer, type IRouteEntry } from './heliaServer.js'

const logger = debug('helia-http-gateway')
const promMetricsMiddleware = promBundle({ includeMethod: true })

const heliaServer = new HeliaServer(logger)
await heliaServer.isReady

// Add the prometheus middleware
const app = express()
app.use(promMetricsMiddleware)
app.use(session({
  genid: heliaServer.sessionId,
  secret: 'very secret value'
}))

// Add the routes
app.get('/', (req, res) => {
  res.send('Helia Docker, to fetch a page, call `/ipns/<path>` or `/ipfs/<cid>`')
})
// eslint-disable-next-line @typescript-eslint/no-misused-promises
heliaServer.routes.map(({ type, path, handler }: IRouteEntry) => app[type](path, handler))

app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://${HOST}:${PORT}`)
})
