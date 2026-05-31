import { hashPassword, verifyPassword } from '@utils/hash'

describe('Password hashing', () => {
  describe('Int to string', () => {
    it('hashes and verifies "123"', async () => {
      const hash = await hashPassword((123).toString())
      expect(await verifyPassword((123).toString(), hash)).toBe(true)
    })
    it('hashes and verifies "12"', async () => {
      const hash = await hashPassword((12).toString())
      expect(await verifyPassword((12).toString(), hash)).toBe(true)
    })
    it('hashes and verifies "1"', async () => {
      const hash = await hashPassword((1).toString())
      expect(await verifyPassword((1).toString(), hash)).toBe(true)
    })
    it('hashes and verifies "67"', async () => {
      const hash = await hashPassword((67).toString())
      expect(await verifyPassword((67).toString(), hash)).toBe(true)
    })
  })

  describe('String', () => {
    it('hashes and verifies "meow"', async () => {
      const hash = await hashPassword('meow')
      expect(await verifyPassword('meow', hash)).toBe(true)
    })
    it('hashes and verifies "123"', async () => {
      const hash = await hashPassword('123')
      expect(await verifyPassword('123', hash)).toBe(true)
    })
    it('hashes and verifies "whyamidoingthis"', async () => {
      const hash = await hashPassword('whyamidoingthis')
      expect(await verifyPassword('whyamidoingthis', hash)).toBe(true)
    })
    it('hashes and verifies "super_secret_password"', async () => {
      const hash = await hashPassword('super_secret_password')
      expect(await verifyPassword('super_secret_password', hash)).toBe(true)
    })
    it('hashes and verifies "whataboutpisquaredfactorial"', async () => {
      const hash = await hashPassword('whataboutpisquaredfactorial')
      expect(await verifyPassword('whataboutpisquaredfactorial', hash)).toBe(true)
    })
  })

  describe('Wrong password', () => {
    it('rejects an incorrect password', async () => {
      const hash = await hashPassword('correct')
      expect(await verifyPassword('wrong', hash)).toBe(false)
    })
    it('produces a different hash each time (random salt)', async () => {
      const hash1 = await hashPassword('same')
      const hash2 = await hashPassword('same')
      expect(hash1).not.toBe(hash2)
    })
  })
})