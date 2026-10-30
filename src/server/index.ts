// ============================================================================
// ECHOES OF CHAOS — Server Entry Point
// ============================================================================
// Express serves static client build in production.
// Socket.IO handles all real-time multiplayer communication.
// Health check at /api/health for deployment monitoring.
// ============================================================================

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ClientToServerEvents, ServerToClientEvents } from '../shared/types.js';
import { setupSocketHandlers } from './socket/handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================
// Express App
// ========================================

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

// Health check endpoint (for deployment monitoring)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    game: 'Echoes of Chaos',
    timestamp: Date.now(),
    uptime: process.uptime(),
  });
});

// ========================================
// Socket.IO Server
// ========================================

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin:
      process.env.NODE_ENV === 'production'
        ? false
        : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
  maxHttpBufferSize: 1e6, // 1MB max payload
});

// Setup game & multiplayer socket handlers
const { gameEngine, timerService } = setupSocketHandlers(io);

// ========================================
// Serve Static Client in Production
// ========================================

if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '../client');
  app.use(express.static(clientPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

// ========================================
// Start Server
// ========================================

const PORT = parseInt(process.env.PORT || '3001', 10);
httpServer.listen(PORT, () => {
  console.log('');
  console.log('  🎮  ECHOES OF CHAOS');
  console.log('  ─────────────────────────────');
  console.log(`  ✦  Server running on port ${PORT}`);
  console.log(`  ✦  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  ✦  Health: http://localhost:${PORT}/api/health`);
  console.log('');
});

export { io, httpServer, gameEngine, timerService };
