import { Request, Response } from 'express'
import * as friendshipService from '@services/friendship.service'
import { FriendStatus } from '@prisma/client'
import { sendToUser } from '@/lib/ws'

export const getFriendships = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const { status } = req.query

    if (status) {
      const friendships = await friendshipService.getFriendshipsByStatus(
        userId,
        status as FriendStatus
      )
      return res.status(200).json(friendships)
    }

    const friendships = await friendshipService.getFriendships(userId)
    res.status(200).json(friendships)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const sendFriendRequest = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const { friendId } = req.body
    const friendship = await friendshipService.sendFriendRequest(
      userId,
      friendId
    )
    res.status(201).json(friendship)

    // Notify the recipient
    sendToUser(friendId, {
      type: 'friendship:requested',
      payload: { friendship }
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const updateFriendshipStatus = async (req: Request, res: Response) => {
  try {
    const { userId, friendId } = req.params
    const { status } = req.body
    const friendship = await friendshipService.updateFriendshipStatus(
      userId,
      friendId,
      status as FriendStatus
    )
    res.status(200).json(friendship)

    // Notify both parties of the status change
    sendToUser(userId, {
      type: 'friendship:updated',
      payload: { friendship }
    })
    sendToUser(friendId, {
      type: 'friendship:updated',
      payload: { friendship }
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const deleteFriendship = async (req: Request, res: Response) => {
  try {
    const { userId, friendId } = req.params
    await friendshipService.deleteFriendship(userId, friendId)
    res.status(204).send()

    // Notify both parties
    sendToUser(userId, {
      type: 'friendship:deleted',
      payload: { userId, friendId }
    })
    sendToUser(friendId, {
      type: 'friendship:deleted',
      payload: { userId, friendId }
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
