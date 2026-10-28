const EVENTS = Object.freeze({
  JOIN: "join",
  CONFIGURE: "configure",
  MAP_VOTE: "mapVote",
  MOVE: "move",
  REMATCH: "rematch",
  LEAVE: "leave",
  STATE: "state",
  OPPONENT_LEFT: "opponentLeft"
});

export function createSocketSession(socket) {
  const stateListeners = new Set();
  const opponentLeftListeners = new Set();
  const connectionListeners = new Set();
  const interruptionListeners = new Set();
  let roomActive = false;
  let activeRoomCode = null;
  let joiningRoom = false;
  let intentionallyLeaving = false;
  let finishInterruptedLeave = null;
  let connectionState = socket.connected ? "connected" : "connecting";

  function emitWithAck(event, payload) {
    return new Promise((resolve, reject) => {
      if (!socket.connected) {
        reject(new Error("Not connected to the game server."));
        return;
      }
      const timeout = setTimeout(() => reject(new Error("The game server did not confirm that action.")), 8000);
      socket.emit(event, payload, response => {
        clearTimeout(timeout);
        if (response?.error) reject(new Error(response.error));
        else resolve(response || { ok: true });
      });
    });
  }

  function setConnectionState(next) {
    if (connectionState === next) return;
    connectionState = next;
    connectionListeners.forEach(listener => listener(next));
  }

  socket.on(EVENTS.STATE, snapshot => {
    if (!roomActive || joiningRoom || snapshot?.code !== activeRoomCode) return;
    stateListeners.forEach(listener => listener(snapshot));
  });
  socket.on(EVENTS.OPPONENT_LEFT, payload => {
    if (!roomActive || (payload?.code && payload.code !== activeRoomCode)) return;
    roomActive = false;
    activeRoomCode = null;
    opponentLeftListeners.forEach(listener => listener(payload));
  });
  socket.on("connect", () => setConnectionState("connected"));
  socket.on("disconnect", () => {
    const hadRoom = roomActive;
    roomActive = false;
    activeRoomCode = null;
    setConnectionState(socket.active ? "reconnecting" : "disconnected");
    if (intentionallyLeaving) {
      finishInterruptedLeave?.();
      return;
    }
    if (hadRoom && !intentionallyLeaving) {
      interruptionListeners.forEach(listener => listener());
    }
  });
  socket.io?.on("reconnect_attempt", () => setConnectionState("reconnecting"));
  socket.io?.on("reconnect", () => setConnectionState("connected"));
  socket.io?.on("reconnect_failed", () => setConnectionState("disconnected"));
  socket.io?.on("error", () => setConnectionState("reconnecting"));

  function subscribe(set, callback) {
    set.add(callback);
    return () => set.delete(callback);
  }

  return {
    joinRoom(code, configuration) {
      roomActive = false;
      joiningRoom = true;
      activeRoomCode = null;
      intentionallyLeaving = false;
      return emitWithAck(EVENTS.JOIN, {
        code,
        characterId: configuration.characterId,
        variantId: configuration.variantId
      }).then(response => {
        joiningRoom = false;
        activeRoomCode = response.code;
        roomActive = true;
        return response;
      }).catch(error => {
        joiningRoom = false;
        roomActive = false;
        activeRoomCode = null;
        throw error;
      });
    },
    configureCharacter(configuration) {
      return emitWithAck(EVENTS.CONFIGURE, configuration);
    },
    submitMapVote(mapId) {
      return emitWithAck(EVENTS.MAP_VOTE, mapId);
    },
    submitMove(move) {
      return emitWithAck(EVENTS.MOVE, move);
    },
    requestRematch() {
      return emitWithAck(EVENTS.REMATCH);
    },
    leaveRoom() {
      intentionallyLeaving = true;
      roomActive = false;
      activeRoomCode = null;
      if (!socket.connected) {
        intentionallyLeaving = false;
        return Promise.resolve({ ok: true, acknowledged: false });
      }
      return new Promise((resolve, reject) => {
        let settled = false;
        const finish = callback => value => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          finishInterruptedLeave = null;
          callback(value);
        };
        const succeed = finish(resolve);
        const fail = finish(reject);
        const timeout = setTimeout(() => fail(new Error("The game server did not confirm that action.")), 8000);
        finishInterruptedLeave = () => succeed({ ok: true, acknowledged: false });
        socket.emit(EVENTS.LEAVE, response => {
          if (response?.error) fail(new Error(response.error));
          else succeed(response || { ok: true });
        });
      }).finally(() => {
        intentionallyLeaving = false;
        finishInterruptedLeave = null;
      });
    },
    onState(callback) { return subscribe(stateListeners, callback); },
    onOpponentLeft(callback) { return subscribe(opponentLeftListeners, callback); },
    onConnectionChange(callback) {
      connectionListeners.add(callback);
      callback(connectionState);
      return () => connectionListeners.delete(callback);
    },
    onRoomInterrupted(callback) { return subscribe(interruptionListeners, callback); },
    get connectionState() { return connectionState; },
    get roomActive() { return roomActive; }
  };
}
