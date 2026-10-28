import test from "node:test";
import assert from "node:assert/strict";
import { createSocketSession } from "../public/js/network/socketSession.mjs";

class FakeManager {
  handlers = new Map();
  on(event, callback) {
    const callbacks = this.handlers.get(event) || new Set();
    callbacks.add(callback);
    this.handlers.set(event, callbacks);
  }
  trigger(event) {
    this.handlers.get(event)?.forEach(callback => callback());
  }
}

class FakeSocket {
  connected = true;
  active = true;
  io = new FakeManager();
  handlers = new Map();
  emitted = [];
  on(event, callback) {
    const callbacks = this.handlers.get(event) || new Set();
    callbacks.add(callback);
    this.handlers.set(event, callbacks);
  }
  listenerCount(event) { return this.handlers.get(event)?.size || 0; }
  trigger(event, payload) {
    this.handlers.get(event)?.forEach(callback => callback(payload));
  }
  emit(event, ...args) {
    this.emitted.push(event);
    const acknowledgement = args.at(-1);
    if (typeof acknowledgement === "function") {
      if (event === "join") acknowledgement({ code: args[0].code || "TEST" });
      else acknowledgement({ ok: true });
    }
  }
}

test("room leave filters stale snapshots and enables a fresh room join", async () => {
  const socket = new FakeSocket();
  const session = createSocketSession(socket);
  const states = [];
  session.onState(state => states.push(state));

  await session.joinRoom("ABCD", { characterId: "ninja", variantId: "kunoichi" });
  socket.trigger("state", { code: "ABCD", phase: "WAITING" });
  assert.equal(states.length, 1);
  assert.deepEqual(await session.leaveRoom(), { ok: true });
  socket.trigger("state", { code: "ABCD", phase: "SELECT" });
  assert.equal(states.length, 1);
  await session.joinRoom("EFGH", { characterId: "knight", variantId: "knight-2" });
  socket.trigger("state", { phase: "WAITING", code: "ABCD" });
  assert.equal(states.length, 1);
  socket.trigger("state", { phase: "WAITING", code: "EFGH" });
  assert.equal(states.length, 2);
  assert.deepEqual(socket.emitted, ["join", "leave", "join"]);
});

test("subscriptions share one socket listener and duplicate callback registrations collapse", async () => {
  const socket = new FakeSocket();
  const session = createSocketSession(socket);
  const snapshots = [];
  const handler = state => snapshots.push(state);
  const unsubscribe = session.onState(handler);
  session.onState(handler);
  assert.equal(socket.listenerCount("state"), 1);

  await session.joinRoom("ROOM", { characterId: "ninja", variantId: "kunoichi" });
  socket.trigger("state", { phase: "WAITING", code: "ROOM" });
  assert.equal(snapshots.length, 1);
  unsubscribe();
  socket.trigger("state", { phase: "WAITING", code: "ROOM" });
  assert.equal(snapshots.length, 1);
});

test("connection interruption ends the client room without trusting reconnect state", async () => {
  const socket = new FakeSocket();
  const session = createSocketSession(socket);
  const connections = [];
  let interrupted = 0;
  session.onConnectionChange(state => connections.push(state));
  session.onRoomInterrupted(() => interrupted++);
  await session.joinRoom("ROOM", { characterId: "ninja", variantId: "kunoichi" });

  socket.connected = false;
  socket.active = true;
  socket.trigger("disconnect");
  assert.equal(interrupted, 1);
  assert.equal(session.roomActive, false);
  socket.connected = true;
  socket.trigger("connect");
  socket.trigger("state", { phase: "SELECT", code: "ROOM" });
  assert.deepEqual(connections, ["connected", "reconnecting", "connected"]);
  assert.equal(session.roomActive, false);
});

test("disconnect during an intentional leave returns locally without a false interruption", async () => {
  const socket = new FakeSocket();
  const emit = socket.emit.bind(socket);
  socket.emit = (event, ...args) => {
    if (event === "leave") {
      socket.emitted.push(event);
      return;
    }
    emit(event, ...args);
  };
  const session = createSocketSession(socket);
  let interrupted = 0;
  session.onRoomInterrupted(() => interrupted++);
  await session.joinRoom("ROOM", { characterId: "ninja", variantId: "kunoichi" });
  const leaving = session.leaveRoom();
  socket.connected = false;
  socket.active = true;
  socket.trigger("disconnect");
  assert.deepEqual(await leaving, { ok: true, acknowledged: false });
  assert.equal(interrupted, 0);
  assert.equal(session.roomActive, false);
});
