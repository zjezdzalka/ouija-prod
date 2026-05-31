import { createClient } from 'redis'

const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    reconnectStrategy: (retries) => Math.min(retries * 500, 5000)
  },
  password: process.env.REDIS_PASSWORD
})

// Track whether we have ever successfully connected.  Before the first
// successful connect every auth request will fail; after it we rely on the
// client's built-in reconnectStrategy to recover from transient drops.
let redisReady = false

redis.on('ready', () => {
  redisReady = true
})

redis.on('error', (err: Error) => {
  console.error(new Date().toISOString(), 'Redis Client Error:', err.message)
  // If we have never successfully connected, the error event fires before
  // .connect() rejects and is non-fatal here — the .connect() catch below
  // handles the fatal exit.  After a successful connection, log but allow
  // the built-in reconnectStrategy to recover; individual token operations
  // will throw and their callers (auth middleware, token service) will
  // surface a 503 to the client rather than crashing the process.
  if (!redisReady) return // handled by the .connect() catch
  console.error('Redis connection lost — reconnecting (session operations will fail until restored)')
})

// Sessions are backed by Redis. If Redis is unavailable at startup,
// every authenticated request will fail — treat this as fatal.
redis
  .connect()
  .catch((err: Error) => {
    console.error('Redis initial connection failed:', err.message)
    console.error('Exiting: Redis is required for session management.')
    process.exit(1)
  })

export { redis }
