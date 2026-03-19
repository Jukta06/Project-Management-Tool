const userSockets = new Map(); // Map user IDs to socket ID set
const socketUsers = new Map(); // Map socket ID to user ID
const userLastSeen = new Map(); // Map user IDs to last seen ISO timestamp

const normalizeUserId = (userId) => Number(userId);

const getPresenceStatus = (userId) => {
  const normalizedUserId = normalizeUserId(userId);
  const sockets = userSockets.get(normalizedUserId);
  const isOnline = Boolean(sockets && sockets.size > 0);

  return {
    userId: normalizedUserId,
    isOnline,
    lastSeen: isOnline ? null : (userLastSeen.get(normalizedUserId) || null)
  };
};

export const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`✅ New WebSocket connection: ${socket.id}`);

    // User authentication and room joining
    socket.on('authenticate', (userId) => {
      const normalizedUserId = normalizeUserId(userId);
      if (!Number.isInteger(normalizedUserId)) return;

      const existingSockets = userSockets.get(normalizedUserId) || new Set();
      const wasOffline = existingSockets.size === 0;

      existingSockets.add(socket.id);
      userSockets.set(normalizedUserId, existingSockets);
      socketUsers.set(socket.id, normalizedUserId);

      socket.userId = normalizedUserId;
      socket.join(String(normalizedUserId)); // Join personal room for notifications

      if (wasOffline) {
        io.emit('presence_changed', {
          userId: normalizedUserId,
          isOnline: true,
          lastSeen: null
        });
      }

      console.log(`User ${normalizedUserId} authenticated and joined personal room`);
    });

    socket.on('presence_subscribe', (userIds = []) => {
      const normalizedIds = [...new Set(
        (Array.isArray(userIds) ? userIds : [])
          .map((id) => normalizeUserId(id))
          .filter((id) => Number.isInteger(id))
      )];

      const presence = normalizedIds.map((userId) => getPresenceStatus(userId));
      socket.emit('presence_snapshot', presence);
    });

    // Join project room
    socket.on('join_project', (projectId) => {
      socket.join(projectId);
      console.log(`Socket ${socket.id} joined project room: ${projectId}`);
    });

    // Leave project room
    socket.on('leave_project', (projectId) => {
      socket.leave(projectId);
      console.log(`Socket ${socket.id} left project room: ${projectId}`);
    });

    // Real-time task updates
    socket.on('task_update', (data) => {
      socket.to(data.projectId).emit('task_updated', data.task);
    });

    // Real-time comment updates
    socket.on('comment_added', (data) => {
      socket.to(data.projectId).emit('new_comment', data.comment);
    });

    // User typing indicator
    socket.on('typing_start', (data) => {
      socket.to(data.taskId).emit('user_typing', {
        userId: socket.userId,
        userName: data.userName,
        taskId: data.taskId
      });
    });

    socket.on('typing_stop', (data) => {
      socket.to(data.taskId).emit('user_stopped_typing', {
        userId: socket.userId,
        taskId: data.taskId
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const userId = socketUsers.get(socket.id);
      if (Number.isInteger(userId)) {
        const existingSockets = userSockets.get(userId);
        if (existingSockets) {
          existingSockets.delete(socket.id);
          if (existingSockets.size === 0) {
            userSockets.delete(userId);
            const lastSeen = new Date().toISOString();
            userLastSeen.set(userId, lastSeen);
            io.emit('presence_changed', {
              userId,
              isOnline: false,
              lastSeen
            });
          }
        }

        socketUsers.delete(socket.id);
        console.log(`User ${userId} disconnected`);
      }
      console.log(`❌ WebSocket disconnected: ${socket.id}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};

export const emitToUser = (io, userId, event, data) => {
  const normalizedUserId = normalizeUserId(userId);
  const sockets = userSockets.get(normalizedUserId);
  if (sockets && sockets.size > 0) {
    sockets.forEach((socketId) => {
      io.to(socketId).emit(event, data);
    });
  }
};

export const emitToProject = (io, projectId, event, data) => {
  io.to(projectId).emit(event, data);
};
