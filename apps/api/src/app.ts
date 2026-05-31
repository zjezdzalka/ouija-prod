import express, { Express } from 'express'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './swagger'
import {
  healthRouter,
  authRouter,
  userRouter,
  msgRouter,
  friendshipRouter,
  chatRouter,
  reactionRouter,
  mediaRouter
} from '@/routers'
import cors from 'cors'
import helmet from 'helmet'
import { correlationMiddleware } from '@middleware/correlation.middleware'
import { csrfGuard } from '@middleware/csrf.middleware'

const app: Express = express()

// Trust one level of reverse-proxy headers (nginx, cloud LB).
// Without this, req.ip is always the proxy's IP and the rate limiter
// either locks everyone out together or can be bypassed via X-Forwarded-For.
app.set('trust proxy', 1)

const ALLOWED_ORIGINS = (process.env.APP_URL ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())

app.use(helmet())
app.use(correlationMiddleware)

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, mobile apps, server-to-server)
      if (!origin) return callback(null, true)
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
      callback(new Error(`CORS: origin ${origin} not allowed`))
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  })
)

app.use(express.json({ limit: '1mb' }))
app.use(csrfGuard)

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use('/api', healthRouter)
app.use('/api', authRouter)
app.use('/api', userRouter)
app.use('/api', msgRouter)
app.use('/api', friendshipRouter)
app.use('/api', chatRouter)
app.use('/api', reactionRouter)
app.use('/api/media', mediaRouter)

app.use(function (req, res) {
  res.status(404)
  if (req.accepts('json')) {
    res.json({
      error: 'not found',
      version: '1.0.0'
    })
    return
  }

  res.type('txt').send(`Cannot ${req.method} ${req.path}`)
})

export { app }
