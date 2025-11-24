
const { Server } = require("socket.io");
const http = require("http");

// Create basic HTTP server that responds to health checks
const server = http.createServer((req, res) => {
  // Set CORS headers for basic HTTP requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Request-Method', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('FlapAI Multiplayer Server Running');
  } else {
    res.writeHead(404);
    res.end();
  }
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  // Allow both polling and websocket
  transports: ['polling', 'websocket'] 
});

const rooms = {};

// Game Constants from client for sync
const PIPE_SPAWN_RATE = 120;
const POWERUP_SPAWN_RATE = 300;
const TICK_RATE = 60; // 60 FPS server tick

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("join_room", ({ roomId, username }) => {
    socket.join(roomId);
    
    if (!rooms[roomId]) {
      rooms[roomId] = {
        id: roomId,
        players: {},
        gameState: 'WAITING',
        frameCount: 0,
        pipes: [],
        interval: null
      };
    }

    const room = rooms[roomId];
    
    // Add player
    room.players[socket.id] = {
      id: socket.id,
      username,
      isDead: false,
      y: 0,
      rotation: 0,
      scale: 1
    };

    // Broadcast updated player list
    io.to(roomId).emit("room_update", {
      players: Object.values(room.players),
      gameState: room.gameState
    });
  });

  socket.on("start_game", ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.gameState === 'WAITING') {
      room.gameState = 'COUNTDOWN';
      io.to(roomId).emit("game_countdown", { count: 3 });
      
      // Simple countdown logic
      let count = 3;
      const cdInterval = setInterval(() => {
        count--;
        if (count > 0) {
          io.to(roomId).emit("game_countdown", { count });
        } else {
          clearInterval(cdInterval);
          startGameLoop(roomId);
        }
      }, 1000);
    }
  });

  socket.on("player_update", ({ roomId, y, rotation, scale }) => {
    const room = rooms[roomId];
    if (room && room.players[socket.id]) {
      room.players[socket.id].y = y;
      room.players[socket.id].rotation = rotation;
      room.players[socket.id].scale = scale;
      
      // Broadcast to others (excluding sender)
      socket.to(roomId).emit("remote_player_update", {
        id: socket.id,
        y,
        rotation,
        scale
      });
    }
  });

  socket.on("player_died", ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.players[socket.id]) {
      room.players[socket.id].isDead = true;
      io.to(roomId).emit("player_died", { id: socket.id });
      
      // Check win condition
      const players = Object.values(room.players);
      const alivePlayers = players.filter(p => !p.isDead);
      
      if (players.length > 1 && alivePlayers.length <= 1) {
        const winner = alivePlayers[0] || players[players.length - 1]; // Fallback if everyone crashes same frame
        finishGame(roomId, winner);
      } else if (players.length === 1 && alivePlayers.length === 0) {
        // Single player multiplayer run
        finishGame(roomId, null);
      }
    }
  });

  socket.on("disconnecting", () => {
    const roomsArray = Array.from(socket.rooms);
    roomsArray.forEach(roomId => {
      if (rooms[roomId]) {
        const room = rooms[roomId];
        delete room.players[socket.id];
        
        if (Object.keys(room.players).length === 0) {
          if (room.interval) clearInterval(room.interval);
          delete rooms[roomId];
        } else {
          io.to(roomId).emit("room_update", {
            players: Object.values(room.players),
            gameState: room.gameState
          });
        }
      }
    });
  });
});

function startGameLoop(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  room.gameState = 'PLAYING';
  room.frameCount = 0;
  io.to(roomId).emit("game_start");

  room.interval = setInterval(() => {
    if (!rooms[roomId]) return clearInterval(room.interval);

    room.frameCount++;

    // Generate Pipe
    if (room.frameCount % PIPE_SPAWN_RATE === 0) {
      const minPipeHeight = 50;
      const maxTopPipeHeight = 400; 
      const topHeight = Math.floor(Math.random() * (maxTopPipeHeight - minPipeHeight + 1)) + minPipeHeight;
      const isGlass = Math.random() < 0.2;

      io.to(roomId).emit("spawn_pipe", {
        topHeight,
        type: isGlass ? 'glass' : 'normal'
      });
    }

    // Generate Powerup
    if (room.frameCount % POWERUP_SPAWN_RATE === 0) {
      const type = Math.random() > 0.5 ? 'shrink' : 'grow';
      const yPct = 0.2 + Math.random() * 0.6; 
      
      io.to(roomId).emit("spawn_powerup", {
        type,
        yPct
      });
    }

  }, 1000 / TICK_RATE);
}

function finishGame(roomId, winner) {
  const room = rooms[roomId];
  if (room) {
    if (room.interval) clearInterval(room.interval);
    room.gameState = 'GAME_OVER';
    io.to(roomId).emit("multiplayer_game_over", {
      winnerId: winner ? winner.id : null,
      winnerName: winner ? winner.username : "Nobody"
    });
  }
}

const PORT = 3000;
// Listen on 0.0.0.0 to accept connections from all network interfaces (important for Docker/Container/LAN)
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Socket.IO server running on port ${PORT}`);
  console.log(`Test locally at http://localhost:${PORT}`);
});
