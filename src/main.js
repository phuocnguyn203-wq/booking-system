import "dotenv/config";
import createApp from './app.js'
import createConfig from './config.js'
import { closeDatabase, query } from './database/index.js'

const config = createConfig(process.env)
const app = createApp({ config, query })
const server = app.listen(config.port, () => {
  console.log(`Booking API listening on port ${config.port}`)
})

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`)

  server.close(async error => {
    if (error) {
      console.error(error)
      process.exitCode = 1
    }

    try {
      await closeDatabase()
    } catch (databaseError) {
      console.error(databaseError)
      process.exitCode = 1
    }
  })
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))
