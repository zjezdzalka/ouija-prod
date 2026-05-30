import { Request, Response } from 'express'
import * as userService from '@services/user.service'

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { id, email, nickname, q } = req.query

    if (id) return res.json(await userService.getUserById(id as string))
    if (email)
      return res.json(await userService.getUserByEmail(email as string))
    if (nickname)
      return res.json(await userService.getUserByNickname(nickname as string))
    if (q) return res.json(await userService.searchUsers(q as string))

    const users = await userService.getUsers()
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const createUser = async (req: Request, res: Response) => {
  try {
    const data: { email: string; password: string; nickname: string } = req.body
    const user = await userService.createUser(data)
    res.status(201).json(user)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const data: Partial<{ nickname: string; password: string }> = req.body
    const user = await userService.updateUser(id, data)
    res.status(200).json(user)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await userService.deleteUser(id)
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
