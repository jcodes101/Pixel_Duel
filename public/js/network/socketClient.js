const socket = window.io();

function emitWithAck(event, payload) {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error("Not connected to the game server."));
      return;
    }
    socket.emit(event, payload, response => {
      if (response?.error) reject(new Error(response.error));
      else resolve(response);
    });
  });
}

export function joinRoom(code, configuration) {
  return emitWithAck("join", {
    code,
    characterId: configuration.characterId,
    cosmetics: configuration.cosmetics
  });
}

export function configureCharacter(configuration) {
  return emitWithAck("configure", configuration);
}

export function submitMove(move) {
  socket.emit("move", move);
}

export function requestRematch() {
  socket.emit("rematch");
}

export function onState(callback) {
  socket.on("state", callback);
  return () => socket.off("state", callback);
}

export function onOpponentLeft(callback) {
  socket.on("opponentLeft", callback);
  return () => socket.off("opponentLeft", callback);
}

export function onConnectionChange(callback) {
  callback(socket.connected);
  socket.on("connect", () => callback(true));
  socket.on("disconnect", () => callback(false));
}
