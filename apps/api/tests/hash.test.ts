import { sha256 } from '@utils/hash'

describe('Checks multiple SHA-256 hashes', () => {
  describe('Int to string', () => {
    it('', () => {
      expect(sha256((123).toString())).toBe(
        'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
      )
    })
    it('', () => {
      expect(sha256((12).toString())).toBe(
        '6b51d431df5d7f141cbececcf79edf3dd861c3b4069f0b11661a3eefacbba918'
      )
    })
    it('', () => {
      expect(sha256((1).toString())).toBe(
        '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b'
      )
    })
    it('', () => {
      expect(sha256((67).toString())).toBe(
        '49d180ecf56132819571bf39d9b7b342522a2ac6d23c1418d3338251bfe469c8'
      )
    })
  })

  describe('String', () => {
    it('', () => {
      expect(sha256('meow')).toBe(
        '404cdd7bc109c432f8cc2443b45bcfe95980f5107215c645236e577929ac3e52'
      )
    })
    it('', () => {
      expect(sha256('123')).toBe(
        'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
      )
    })
    it('', () => {
      expect(sha256('whyamidoingthis')).toBe(
        '404b877ab00056649b4505eb8d2fefadf83884ec229ed1edcbecd3dd34cae0e5'
      )
    })
    it('', () => {
      expect(sha256('super_secret_password')).toBe(
        'ac36e8d26bd00b068bf0c3558eac748402d14f469f908eb7ff92b0ead9700dda'
      )
    })
    it('', () => {
      expect(sha256('whataboutpisquaredfactorial')).toBe(
        '8c04e7820b88cbe87accfece496726a7a0b5fccbd3da9f478790b2c3ecc2b035'
      )
    })
  })
})
