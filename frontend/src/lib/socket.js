import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const initializeSocket = (userId) => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      if (userId) {
        socket.emit('authenticate', userId);
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinProjectRoom = (projectId) => {
  if (socket) {
    socket.emit('join_project', projectId);
  }
};

export const leaveProjectRoom = (projectId) => {
  if (socket) {
    socket.emit('leave_project', projectId);
  }
};

export const emitTypingStart = (taskId, userName) => {
  if (socket) {
    socket.emit('typing_start', { taskId, userName });
  }
};

export const emitTypingStop = (taskId) => {
  if (socket) {
    socket.emit('typing_stop', { taskId });
  }
};

export const requestPresence = (userIds = []) => {
  if (socket) {
    socket.emit('presence_subscribe', userIds);
  }
};

export const onPresenceSnapshot = (handler) => {
  if (socket) {
    socket.on('presence_snapshot', handler);
  }
};

export const offPresenceSnapshot = (handler) => {
  if (socket) {
    socket.off('presence_snapshot', handler);
  }
};

export const onPresenceChanged = (handler) => {
  if (socket) {
    socket.on('presence_changed', handler);
  }
};

export const offPresenceChanged = (handler) => {
  if (socket) {
    socket.off('presence_changed', handler);
  }
};

export const onNotification = (handler) => {
  if (socket) {
    socket.on('notification', handler);
  }
};

export const offNotification = (handler) => {
  if (socket) {
    socket.off('notification', handler);
  }
};
