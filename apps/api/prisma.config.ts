import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  migrations: {
    // Replace 'ts-node' with 'node' if you are running a compiled JS file
    seed: 'tsx ./prisma/dev/dev-sql.ts'
  },
  datasource: {
    url: process.env.DATABASE_URL
  }
})
