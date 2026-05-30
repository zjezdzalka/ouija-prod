export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Ouija API',
    version: '1.0.0',
    description: 'REST API for the Ouija messaging application'
  },
  servers: [{ url: '/api' }],

  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          nickname: { type: 'string' },
          status: { type: 'string', enum: ['ONLINE', 'OFFLINE', 'AWAY'] },
          avatarUrl: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Chat: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string', nullable: true },
          type: { type: 'string', enum: ['PRIVATE', 'GROUP'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          users: {
            type: 'array',
            items: { $ref: '#/components/schemas/ChatUser' }
          }
        }
      },
      ChatUser: {
        type: 'object',
        properties: {
          chatId: { type: 'string' },
          userId: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'MEMBER'] },
          joinedAt: { type: 'string', format: 'date-time' }
        }
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          chatId: { type: 'string' },
          senderId: { type: 'string' },
          content: { type: 'string' },
          sentAt: { type: 'string', format: 'date-time' },
          editedAt: { type: 'string', format: 'date-time', nullable: true },
          attachments: {
            type: 'array',
            items: { $ref: '#/components/schemas/Attachment' }
          },
          reactions: {
            type: 'array',
            items: { $ref: '#/components/schemas/Reaction' }
          }
        }
      },
      Attachment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          messageId: { type: 'integer' },
          url: { type: 'string' },
          type: { type: 'string', enum: ['FILE', 'IMAGE', 'VIDEO', 'AUDIO'] }
        }
      },
      Reaction: {
        type: 'object',
        properties: {
          messageId: { type: 'integer' },
          userId: { type: 'string' },
          type: {
            type: 'string',
            enum: ['LIKE', 'LOVE', 'HAHA', 'SAD', 'ANGRY']
          },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Friendship: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          friendId: { type: 'string' },
          status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'BLOCKED'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      MediaFile: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          ownerId: { type: 'string' },
          filename: { type: 'string' },
          storedName: { type: 'string' },
          mimeType: { type: 'string' },
          size: { type: 'integer' },
          purpose: { type: 'string', enum: ['AVATAR', 'ATTACHMENT'] },
          url: { type: 'string' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' }
        }
      }
    }
  },

  paths: {
    // ─── Health ───────────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API health',
        responses: {
          200: {
            description: 'All services healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    databases: {
                      type: 'object',
                      properties: {
                        postgres: {
                          type: 'object',
                          properties: {
                            status: { type: 'string' },
                            error: { type: 'string', nullable: true }
                          }
                        },
                        redis: {
                          type: 'object',
                          properties: {
                            status: { type: 'string' },
                            error: { type: 'string', nullable: true }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          503: { description: 'One or more services degraded' }
        }
      }
    },

    // ─── Users ────────────────────────────────────────────────────────────────
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'Get all users',
        responses: {
          200: {
            description: 'List of users',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' }
                }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      post: {
        tags: ['Users'],
        summary: 'Create a user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'nickname'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                  nickname: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'User created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/users/{id}': {
      put: {
        tags: ['Users'],
        summary: 'Update a user',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  nickname: { type: 'string' },
                  status: {
                    type: 'string',
                    enum: ['ONLINE', 'OFFLINE', 'AWAY']
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'User updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete a user',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
        ],
        responses: {
          204: { description: 'User deleted' },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },

    // ─── Friendships ──────────────────────────────────────────────────────────
    '/users/{userId}/friends': {
      get: {
        tags: ['Friendships'],
        summary: 'Get friendships for a user',
        parameters: [
          {
            in: 'path',
            name: 'userId',
            required: true,
            schema: { type: 'string' }
          },
          {
            in: 'query',
            name: 'status',
            schema: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'BLOCKED'] }
          }
        ],
        responses: {
          200: {
            description: 'List of friendships',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Friendship' }
                }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      post: {
        tags: ['Friendships'],
        summary: 'Send a friend request',
        parameters: [
          {
            in: 'path',
            name: 'userId',
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['friendId'],
                properties: { friendId: { type: 'string' } }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Friend request sent',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Friendship' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/users/{userId}/friends/{friendId}': {
      put: {
        tags: ['Friendships'],
        summary: 'Update friendship status',
        parameters: [
          {
            in: 'path',
            name: 'userId',
            required: true,
            schema: { type: 'string' }
          },
          {
            in: 'path',
            name: 'friendId',
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['ACCEPTED', 'BLOCKED'] }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Friendship updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Friendship' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Friendships'],
        summary: 'Remove a friendship',
        parameters: [
          {
            in: 'path',
            name: 'userId',
            required: true,
            schema: { type: 'string' }
          },
          {
            in: 'path',
            name: 'friendId',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          204: { description: 'Friendship removed' },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },

    // ─── Chats ────────────────────────────────────────────────────────────────
    '/chats': {
      post: {
        tags: ['Chats'],
        summary: 'Create a chat',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'userIds'],
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string', enum: ['PRIVATE', 'GROUP'] },
                  userIds: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Chat created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Chat' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/chats/{chatId}': {
      get: {
        tags: ['Chats'],
        summary: 'Get a chat by ID',
        parameters: [
          {
            in: 'path',
            name: 'chatId',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'Chat found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Chat' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      put: {
        tags: ['Chats'],
        summary: 'Update a chat',
        parameters: [
          {
            in: 'path',
            name: 'chatId',
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string', enum: ['PRIVATE', 'GROUP'] }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Chat updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Chat' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Chats'],
        summary: 'Delete a chat',
        parameters: [
          {
            in: 'path',
            name: 'chatId',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          204: { description: 'Chat deleted' },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/users/{userId}/chats': {
      get: {
        tags: ['Chats'],
        summary: 'Get all chats for a user',
        parameters: [
          {
            in: 'path',
            name: 'userId',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'List of chats',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Chat' }
                }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/chats/{chatId}/members': {
      post: {
        tags: ['Chats'],
        summary: 'Add a member to a chat',
        parameters: [
          {
            in: 'path',
            name: 'chatId',
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId'],
                properties: {
                  userId: { type: 'string' },
                  role: { type: 'string', enum: ['ADMIN', 'MEMBER'] }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Member added',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ChatUser' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/chats/{chatId}/members/{userId}': {
      put: {
        tags: ['Chats'],
        summary: "Update a member's role",
        parameters: [
          {
            in: 'path',
            name: 'chatId',
            required: true,
            schema: { type: 'string' }
          },
          {
            in: 'path',
            name: 'userId',
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: {
                  role: { type: 'string', enum: ['ADMIN', 'MEMBER'] }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Role updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ChatUser' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Chats'],
        summary: 'Remove a member from a chat',
        parameters: [
          {
            in: 'path',
            name: 'chatId',
            required: true,
            schema: { type: 'string' }
          },
          {
            in: 'path',
            name: 'userId',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          204: { description: 'Member removed' },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },

    // ─── Messages ─────────────────────────────────────────────────────────────
    '/chats/{chatId}/messages': {
      get: {
        tags: ['Messages'],
        summary: 'Get messages for a chat',
        parameters: [
          {
            in: 'path',
            name: 'chatId',
            required: true,
            schema: { type: 'string' }
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', default: 50 }
          },
          {
            in: 'query',
            name: 'lastId',
            schema: { type: 'integer', default: 0 }
          }
        ],
        responses: {
          200: {
            description: 'List of messages',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Message' }
                }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      post: {
        tags: ['Messages'],
        summary: 'Send a message',
        parameters: [
          {
            in: 'path',
            name: 'chatId',
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'content'],
                properties: {
                  userId: { type: 'string' },
                  content: { type: 'string' },
                  attachments: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Attachment' }
                  },
                  reactions: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Reaction' }
                  }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Message created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Message' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/chats/{chatId}/messages/{messageId}': {
      put: {
        tags: ['Messages'],
        summary: 'Edit a message',
        parameters: [
          {
            in: 'path',
            name: 'chatId',
            required: true,
            schema: { type: 'string' }
          },
          {
            in: 'path',
            name: 'messageId',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  content: { type: 'string' },
                  attachments: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Attachment' }
                  },
                  reactions: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Reaction' }
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Message updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Message' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Messages'],
        summary: 'Delete a message',
        parameters: [
          {
            in: 'path',
            name: 'chatId',
            required: true,
            schema: { type: 'string' }
          },
          {
            in: 'path',
            name: 'messageId',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          204: { description: 'Message deleted' },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },

    // ─── Reactions ────────────────────────────────────────────────────────────
    '/messages/{messageId}/reactions': {
      get: {
        tags: ['Reactions'],
        summary: 'Get reactions for a message',
        parameters: [
          {
            in: 'path',
            name: 'messageId',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          200: {
            description: 'List of reactions',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Reaction' }
                }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      post: {
        tags: ['Reactions'],
        summary: 'Add a reaction',
        parameters: [
          {
            in: 'path',
            name: 'messageId',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'type'],
                properties: {
                  userId: { type: 'string' },
                  type: {
                    type: 'string',
                    enum: ['LIKE', 'LOVE', 'HAHA', 'SAD', 'ANGRY']
                  }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Reaction added',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Reaction' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/messages/{messageId}/reactions/{userId}': {
      put: {
        tags: ['Reactions'],
        summary: 'Update a reaction',
        parameters: [
          {
            in: 'path',
            name: 'messageId',
            required: true,
            schema: { type: 'integer' }
          },
          {
            in: 'path',
            name: 'userId',
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type'],
                properties: {
                  type: {
                    type: 'string',
                    enum: ['LIKE', 'LOVE', 'HAHA', 'SAD', 'ANGRY']
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Reaction updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Reaction' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Reactions'],
        summary: 'Remove a reaction',
        parameters: [
          {
            in: 'path',
            name: 'messageId',
            required: true,
            schema: { type: 'integer' }
          },
          {
            in: 'path',
            name: 'userId',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          204: { description: 'Reaction removed' },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },

    // ─── Media ────────────────────────────────────────────────────────────────
    '/media/{storedName}': {
      get: {
        tags: ['Media'],
        summary: 'Serve a file',
        parameters: [
          {
            in: 'path',
            name: 'storedName',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: { description: 'File stream' },
          404: { description: 'File not found' }
        }
      }
    },
    '/media/info/{id}': {
      get: {
        tags: ['Media'],
        summary: 'Get file metadata',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: {
            description: 'File metadata',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MediaFile' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/media/user/{userId}': {
      get: {
        tags: ['Media'],
        summary: 'Get all files for a user',
        parameters: [
          {
            in: 'path',
            name: 'userId',
            required: true,
            schema: { type: 'string' }
          },
          {
            in: 'query',
            name: 'purpose',
            schema: { type: 'string', enum: ['AVATAR', 'ATTACHMENT'] }
          }
        ],
        responses: {
          200: {
            description: 'List of files',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/MediaFile' }
                }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/media/upload': {
      post: {
        tags: ['Media'],
        summary: 'Upload one or more files',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['ownerId', 'files'],
                properties: {
                  ownerId: { type: 'string' },
                  files: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' }
                  }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Files uploaded',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/MediaFile' }
                }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/media/avatar/{userId}': {
      post: {
        tags: ['Media'],
        summary: 'Upload an avatar',
        parameters: [
          {
            in: 'path',
            name: 'userId',
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['avatar'],
                properties: { avatar: { type: 'string', format: 'binary' } }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Avatar uploaded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MediaFile' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Media'],
        summary: 'Remove avatar',
        parameters: [
          {
            in: 'path',
            name: 'userId',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: { description: 'Avatar removed' },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/media/{id}': {
      delete: {
        tags: ['Media'],
        summary: 'Delete a file',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['requesterId'],
                properties: { requesterId: { type: 'string' } }
              }
            }
          }
        },
        responses: {
          200: { description: 'File deleted' },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    }
  }
}
