
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { canUseMove, getWinner, resolveCombat } = require("./src/server/combat");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const rooms = new Map();

app.get("/", (_, res) => res.sendFile(path.join(__dirname, "index.html")));

function code() {
  let c;
  do {
    c = Array.from({ length: 4 }, () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)]
    ).join("");
  } while (rooms.has(c));
  return c;
}

function player(id) {
  return { id, hp: 100, move: null, locked: false, cooldown: 0 };
}

function reset(room) {
  room.round = 1;
  room.phase = "SELECT";
  room.log = [];
  room.players.forEach(p => Object.assign(p, player(p.id)));
  room.rematches = new Set();
}

function publish(room, result = null) {
  room.players.forEach((p, index) => {
    io.to(p.id).emit("state", {
      code: room.code,
      round: room.round,
      phase: room.phase,
      you: index,
      players: room.players.map(x => ({
        hp: x.hp, locked: x.locked, cooldown: x.cooldown
      })),
      result,
      log: room.log,
      rematchVotes: room.rematches.size
    });
  });
}

function resolve(room) {
  room.phase = "RESOLVING";
  const result = resolveCombat(room.players);

  room.log.push(`Round ${room.round}: ${result.outcome}`);
  publish(room, result);

  setTimeout(() => {
    if (rooms.get(room.code) !== room || room.phase !== "RESOLVING") return;
    const winner = getWinner(room.players);
    if (winner !== null) {
      room.phase = "GAME_OVER";
      result.winner = winner;
    } else {
      room.round++;
      room.phase = "SELECT";
      room.players.forEach(p => {
        p.move = null;
        p.locked = false;
      });
    }
    publish(room, result);
  }, 1200);
}

io.on("connection", socket => {
  socket.on("join", (raw, reply) => {
    if (socket.data.room) return reply({ error: "Already in a room." });
    let c = String(raw || "").trim().toUpperCase();
    if (!c) c = code();
    if (!/^[A-Z]{4}$/.test(c)) return reply({ error: "Enter a 4-letter code." });

    let room = rooms.get(c);
    if (!room) {
      room = { code: c, players: [], phase: "WAITING", round: 1,
        log: [], rematches: new Set() };
      rooms.set(c, room);
    }
    if (room.players.length >= 2 || room.phase !== "WAITING")
      return reply({ error: "Room unavailable or full." });

    room.players.push(player(socket.id));
    socket.join(c);
    socket.data.room = c;
    reply({ code: c });
    if (room.players.length === 2) reset(room);
    publish(room);
  });

  socket.on("move", move => {
    const room = rooms.get(socket.data.room);
    if (!room || room.phase !== "SELECT") return;
    const p = room.players.find(p => p.id === socket.id);
    if (!p || p.locked || !canUseMove(p, move)) return;
    p.move = move;
    p.locked = true;
    publish(room);
    if (room.players.every(p => p.locked)) resolve(room);
  });

  socket.on("rematch", () => {
    const room = rooms.get(socket.data.room);
    if (!room || room.phase !== "GAME_OVER") return;
    room.rematches.add(socket.id);
    if (room.rematches.size === 2) reset(room);
    publish(room);
  });

  socket.on("disconnect", () => {
    const room = rooms.get(socket.data.room);
    if (!room) return;
    rooms.delete(room.code);
    room.players.forEach(p => {
      if (p.id !== socket.id) {
        io.to(p.id).emit("opponentLeft");
        const other = io.sockets.sockets.get(p.id);
        if (other) {
          other.leave(room.code);
          other.data.room = null;
        }
      }
    });
  });
});

server.listen(process.env.PORT || 3000, "0.0.0.0",
  () => console.log(`Pixel Duel running on port localhost:${process.env.PORT || 3000}`));
