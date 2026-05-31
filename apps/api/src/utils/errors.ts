/**
 * Known application error messages that are safe to surface to clients.
 * Anything not in this set gets replaced with a generic message.
 */
const CLIENT_SAFE_MESSAGES = new Set([
  // auth
  'invalid credentials',
  'email not verified',
  'email already exists',
  'nickname already exists',
  'data is incomplete',
  'token is required',
  'invalid or expired token',
  'user not found',
  'email verification is not enabled',
  'password reset is not enabled',
  'token and newPassword are required',
  'email is required',
  // users
  'id is required',
  'query is required',
  'user already exists',
  'user does not exist',
  // chats
  'chatId is required',
  'userId is required',
  'type is required',
  'At least two users are required',
  'Group chats require a name',
  'Chat not found',
  'User not found',
  'User already in chat',
  'User is not in this chat',
  'chatId and userId are required',
  'chatId, userId and role are required',
  'No update data provided',
  // messages
  'Content and attachments cannot both be empty',
  'Record does not exist',
  // friendships
  'Cannot befriend yourself',
  'Friendship already exists',
  'Friendship not found',
  'userId and friendId are required',
  'status is required',
  'Friend not found',
  'only the recipient can accept or decline a friend request',
  // media
  'No files were uploaded',
  'No avatar file was uploaded',
  'File not found',
  // middleware
  'you are not a member of this chat',
  'admin role required',
  'you can only modify your own messages',
  'you can only update your own profile',
  'you can only delete your own account',
  'you can only update your own avatar',
  'you can only remove your own avatar',
  'forbidden: you can only list your own files',
  'forbidden: you can only perform this action for yourself',
  'admin role required to remove other members',
  'message not found',
  'authentication required',
  'invalid or expired session',
  'user no longer exists',
])

/**
 * Returns a safe error message for HTTP responses.
 * Known messages pass through; unknown ones get a generic 500 message
 * so internal details (DB errors, stack traces) never reach the client.
 */
export function safeErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error)
  return CLIENT_SAFE_MESSAGES.has(msg) ? msg : 'an unexpected error occurred'
}

/**
 * Maps a safe error message to the appropriate HTTP status code.
 */
export function errorStatus(message: string): number {
  if (message.includes('not found') || message === 'message not found') return 404
  if (
    message === 'invalid credentials' ||
    message === 'authentication required' ||
    message === 'invalid or expired session' ||
    message === 'user no longer exists'
  ) return 401
  if (
    message === 'email not verified' ||
    message === 'you are not a member of this chat' ||
    message === 'admin role required' ||
    message === 'admin role required to remove other members' ||
    message === 'you can only modify your own messages' ||
    message === 'you can only update your own profile' ||
    message === 'you can only delete your own account' ||
    message === 'you can only update your own avatar' ||
    message === 'you can only remove your own avatar' ||
    message === 'forbidden: you can only list your own files' ||
    message === 'forbidden: you can only perform this action for yourself' ||
    message === 'forbidden: you do not own this file' ||
    message === 'only the recipient can accept or decline a friend request'
  ) return 403
  if (
    message === 'email already exists' ||
    message === 'nickname already exists' ||
    message === 'user already exists' ||
    message === 'User already in chat' ||
    message === 'Friendship already exists'
  ) return 409
  return 400
}
