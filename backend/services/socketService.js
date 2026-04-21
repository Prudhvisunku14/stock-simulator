// services/socketService.js
// BUG FIX: JWT decoded payload uses `userId` (not `id`) — was causing silent auth failures

const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

let io;
const userSockets = new Map(); // userId -> [socketId1, socketId2, ...]

const init = (server) => {
    io = socketIo(server, {
        cors: {
            origin: [
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                process.env.FRONTEND_URL || 'http://localhost:3000'
            ],
            methods: ['GET', 'POST', 'PATCH'],
            credentials: true
        }
    });

    // JWT auth middleware for socket connections
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return next(new Error('Authentication error: Invalid token'));
            }
            // FIX: JWT payload uses `userId`, not `id`
            socket.userId = decoded.userId;
            next();
        });
    });

    io.on('connection', (socket) => {
        const userId = socket.userId;
        console.log(`🔌 User connected: ${userId} (socket: ${socket.id})`);

        if (!userSockets.has(userId)) {
            userSockets.set(userId, []);
        }
        userSockets.get(userId).push(socket.id);

        socket.on('disconnect', () => {
            console.log(`🔌 User disconnected: ${userId} (socket: ${socket.id})`);
            const sockets = userSockets.get(userId);
            if (sockets) {
                const index = sockets.indexOf(socket.id);
                if (index > -1) sockets.splice(index, 1);
                if (sockets.length === 0) userSockets.delete(userId);
            }
        });

        // Ping/pong for connection health
        socket.on('ping', () => socket.emit('pong'));
    });

    console.log('✅ Socket.io initialized');
    return io;
};

const getIo = () => {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
};

const sendToUser = (userId, event, data) => {
    if (!io) return false;
    const socketIds = userSockets.get(userId);
    if (socketIds && socketIds.length > 0) {
        socketIds.forEach(socketId => {
            io.to(socketId).emit(event, data);
        });
        console.log(`📡 Pushed ${event} to user ${userId} (${socketIds.length} socket(s))`);
        return true;
    }
    return false; // User not connected
};

const broadcast = (event, data) => {
    if (io) io.emit(event, data);
};

const getConnectedUsers = () => [...userSockets.keys()];

module.exports = { init, getIo, sendToUser, broadcast, getConnectedUsers };
