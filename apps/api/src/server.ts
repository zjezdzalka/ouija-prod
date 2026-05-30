import 'dotenv/config'
console.log('CHECKING DB URL:', process.env.DATABASE_URL)
console.log('CHECKING reset-pass:', process.env.AUTH_ENABLE_PASSWORD_RESET)
console.log('CHECKING email-ver:', process.env.AUTH_REQUIRE_EMAIL_VERIFICATION)

import { createServer } from 'http'
import { app } from '@/app'
import { attachWebSocketServer } from '@/lib/ws'

const PORT = process.env.PORT ?? 3001

const httpServer = createServer(app)
attachWebSocketServer(httpServer)

httpServer.listen(PORT, () => {
  console.log(`app is running on http://localhost:${PORT}`)
  console.log(
    `WebSocket available at ws://localhost:${PORT}/ws?userId=<userId>`
  )
})
