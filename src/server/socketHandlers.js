const { EVENTS } = require("./protocol");

function acknowledge(reply, response) {
  if (typeof reply === "function") reply(response);
}

function findAcknowledgement(args) {
  return typeof args[args.length - 1] === "function" ? args[args.length - 1] : null;
}

function registerSocketHandlers(io, roomManager) {
  io.on("connection", socket => {
    socket.on(EVENTS.JOIN, (rawCode, reply) => {
      const result = roomManager.join(socket, rawCode);
      if (result.error) {
        acknowledge(reply, { error: result.error });
        return;
      }

      socket.join(result.code);
      acknowledge(reply, { code: result.code });
      roomManager.publishRoom(result.code);
    });

    socket.on(EVENTS.CONFIGURE, (configuration, reply) => {
      acknowledge(reply, roomManager.configurePlayer(socket, configuration));
    });

    socket.on(EVENTS.MOVE, (move, reply) => {
      acknowledge(reply, roomManager.submitMove(socket, move));
    });

    socket.on(EVENTS.REMATCH, (...args) => {
      acknowledge(findAcknowledgement(args), roomManager.requestRematch(socket));
    });

    socket.on("disconnect", () => {
      const result = roomManager.disconnect(socket);
      if (!result || !result.opponentId) return;

      const opponent = io.sockets.sockets.get(result.opponentId);
      if (opponent) {
        opponent.leave(result.code);
        opponent.data.room = null;
      }
    });
  });
}

module.exports = { registerSocketHandlers };
