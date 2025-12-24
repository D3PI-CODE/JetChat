import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

// Lightweight hook that manages a single socket instance and exposes a ref.
// It does NOT attach event handlers; callers should attach listeners to
// `socketRef.current` so they can pass local state setters/callbacks.
export default function useChatSocket({ url = 'http://localhost:5002', token, userID, email } = {}) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (socketRef.current) return;
    const socket = io(url, { autoConnect: false });
    socket.auth = { token, userID, email };
    socket.connect();

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id, 'auth:', socket.auth);
    });
    socket.on('disconnect', (reason) => {
      console.warn('Socket disconnected:', reason);
    });
    socket.on('connect_error', (err) => { console.error('Socket connect_error:', err); });
    socket.on('connect_timeout', (t) => { console.warn('Socket connect_timeout:', t); });
    socket.on('error', (err) => { console.error('Socket error:', err); });

    socketRef.current = socket;

    return () => {
      try { socket.disconnect(); } catch (e) {
        console.error('Socket disconnect error:', e && e.message);
      }
      socketRef.current = null;
    };
  }, [url, token, userID, email]);

  return socketRef;
}
