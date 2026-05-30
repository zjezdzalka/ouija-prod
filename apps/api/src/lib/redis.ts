import { createClient } from 'redis'

const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    reconnectStrategy: (retries) => Math.min(retries * 500, 5000)
  },
  password: process.env.REDIS_PASSWORD
})

redis.on('error', (err: Error) =>
  console.error(new Date().toISOString(), 'Redis Client Error:', err.message)
)

// Connect in the background — do not block server startup or crash if Redis is unavailable
redis
  .connect()
  .catch((err: Error) =>
    console.error('Redis initial connection failed:', err.message)
  )

export { redis }
