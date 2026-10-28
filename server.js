
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const rooms = new Map();
const MOVES = ["Attack", "Defend", "Heal", "Special"];

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
  const [a, b] = room.players;
  const moves = [a.move, b.move];
  const damage = [0, 0];
  const heal = [0, 0];

  for (let i = 0; i < 2; i++) {
    const me = room.players[i], other = room.players[1 - i];
    if (me.move === "Heal") heal[i] = Math.min(10, 100 - me.hp);
    if (me.move === "Attack")
      damage[1 - i] += other.move === "Defend" ? 5 : 15;
    if (me.move === "Special") damage[1 - i] += 30;
  }

  // Variance applies to positive damage only.
  for (let i = 0; i < 2; i++) {
    if (damage[i]) damage[i] = Math.max(1, damage[i] + Math.floor(Math.random() * 7) - 3);
    room.players[i].hp = Math.max(0,
      Math.min(100, room.players[i].hp + heal[i]) - damage[i]);
  }

  for (const p of room.players) {
    if (p.move === "Special") p.cooldown = 3;
    else p.cooldown = Math.max(0, p.cooldown - 1);
  }

  const outcome = `P1 ${moves[0]} / P2 ${moves[1]} | Damage: ${damage[0]}, ${damage[1]} | Heal: ${heal[0]}, ${heal[1]}`;
  room.log.push(`Round ${room.round}: ${outcome}`);
  const result = { moves, damage, heal, outcome };

  publish(room, result);

  setTimeout(() => {
    if (rooms.get(room.code) !== room || room.phase !== "RESOLVING") return;
    if (a.hp <= 0 || b.hp <= 0) {
      room.phase = "GAME_OVER";
      result.winner = a.hp <= 0 && b.hp <= 0 ? -1 : a.hp > 0 ? 0 : 1;
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
    if (!room || room.phase !== "SELECT" || !MOVES.includes(move)) return;
    const p = room.players.find(p => p.id === socket.id);
    if (!p || p.locked || (move === "Special" && p.cooldown > 0)) return;
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
