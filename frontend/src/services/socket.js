import { io } from 'socket.io-client';

const SOCKET_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '/';

let socket;

export const initSocket = (token) => {
    if (socket) return socket;

    socket = io(SOCKET_URL, {
        auth: {
            token
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });

    socket.on('connect', () => {
        console.log('🔌 Connected to WebSocket Server');
    });

    socket.on('connect_error', (err) => {
        console.warn('🔌 WebSocket connection error:', err.message);
    });

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
