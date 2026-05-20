const { Server } = require("socket.io");
const logger = require("./utils/logger");

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Client joins a stream room to receive that stream's updates
    socket.on("join:stream", (streamId) => {
      socket.join(`stream:${streamId}`);
      logger.debug(`Socket ${socket.id} joined stream:${streamId}`);
      socket.emit("joined", { streamId });
    });

    socket.on("leave:stream", (streamId) => {
      socket.leave(`stream:${streamId}`);
    });

    socket.on("disconnect", () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info("✅ Socket.IO initialised");
  return io;
}

// Emit live stats to all clients in a stream room
function emitStats(streamId, stats) {
  if (!io) return;
  io.to(`stream:${streamId}`).emit("stats:update", stats);
}

// Emit a trending moment alert
function emitMoment(streamId, moment) {
  if (!io) return;
  io.to(`stream:${streamId}`).emit("moment:detected", moment);
}

// Emit a threshold alert
function emitAlert(streamId, alert) {
  if (!io) return;
  io.to(`stream:${streamId}`).emit("alert:new", alert);
}

// Broadcast to ALL connected clients (e.g. system-wide alerts)
function broadcast(event, data) {
  if (!io) return;
  io.emit(event, data);
}

function getIO() {
  return io;
}

module.exports = { initSocket, emitStats, emitMoment, emitAlert, broadcast, getIO };
