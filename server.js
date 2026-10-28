const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { createRoomManager } = require("./src/server/roomManager");
const { registerSocketHandlers } = require("./src/server/socketHandlers");

function createGameServer(options = {}) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, options.socketIoOptions);
  const roomManager = createRoomManager({
    ...options.roomManagerOptions,
    emitToSocket: (socketId, event, payload) => io.to(socketId).emit(event, payload)
  });

  app.get("/", (_, response) => {
    response.sendFile(path.join(__dirname, "index.html"));
  });
  registerSocketHandlers(io, roomManager);

  return { app, server, io, roomManager };
}

if (require.main === module) {
  const { server } = createGameServer();
  const port = process.env.PORT || 3000;
  server.listen(port, "0.0.0.0", () => {
    console.log(`Pixel Duel running on port localhost:${port}`);
  });
}

module.exports = { createGameServer };
