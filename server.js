const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    
    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        gameState: 'waiting',
        number: null,
        roles: {},
        turnOrder: []
      };
    }

    // Check if player is already in the room to prevent duplicate joins
    const existingPlayer = rooms[roomId].players.find(p => p.id === socket.id);
    if (existingPlayer) {
      // Player already in room, just send current state
      socket.emit('player-name', existingPlayer.name);
      io.to(roomId).emit('players-update', rooms[roomId].players.map(p => p.name));
      return;
    }

    const player = {
      id: socket.id,
      name: `Player ${rooms[roomId].players.length + 1}`
    };

    rooms[roomId].players.push(player);
    socket.emit('player-name', player.name);
    
    io.to(roomId).emit('players-update', rooms[roomId].players.map(p => p.name));

    // Update game status - waiting for players to be ready
    io.to(roomId).emit('game-status', {
      status: 'waiting',
      message: `Waiting for players to be ready... (${rooms[roomId].players.length} player(s) joined)`
    });
  });

  socket.on('start-game', (roomId) => {
    if (rooms[roomId] && rooms[roomId].players.length >= 2) {
      startGame(roomId);
    } else {
      io.to(roomId).emit('game-status', {
        status: 'waiting',
        message: 'Need at least 2 players to start the game!'
      });
    }
  });

  socket.on('restart-game', (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId].gameState = 'waiting';
      rooms[roomId].number = null;
      rooms[roomId].roles = {};
      rooms[roomId].turnOrder = [];
      io.to(roomId).emit('game-status', {
        status: 'waiting',
        message: 'Game reset. Ready to start!'
      });
      io.to(roomId).emit('game-restarted');
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    // Remove player from all rooms
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        delete room.roles[socket.id];
        
        if (room.players.length === 0) {
          delete rooms[roomId];
        } else {
          io.to(roomId).emit('players-update', room.players.map(p => p.name));
          if (room.gameState === 'playing') {
            room.gameState = 'waiting';
            room.number = null;
            room.roles = {};
            room.turnOrder = [];
            io.to(roomId).emit('game-status', {
              status: 'waiting',
              message: 'A player left. Game reset.'
            });
            io.to(roomId).emit('game-restarted');
          }
        }
        break;
      }
    }
  });
});

function startGame(roomId) {
  const room = rooms[roomId];
  if (!room || room.players.length < 2) return;

  // Generate random number between 1-130
  room.number = Math.floor(Math.random() * 130) + 1;
  room.gameState = 'playing';

  // Randomly select imposter (only 1 imposter regardless of player count)
  const imposterIndex = Math.floor(Math.random() * room.players.length);
  const imposterId = room.players[imposterIndex].id;

  // Randomize turn order (shuffle players)
  const shuffledPlayers = [...room.players];
  for (let i = shuffledPlayers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
  }
  room.turnOrder = shuffledPlayers.map((p, index) => ({
    playerId: p.id,
    playerName: p.name,
    turnNumber: index + 1
  }));

  // Assign roles
  room.players.forEach((player, index) => {
    if (player.id === imposterId) {
      room.roles[player.id] = 'imposter';
    } else {
      room.roles[player.id] = 'knower';
    }
  });

  // Send roles, number, and turn order to each player
  room.players.forEach((player) => {
    const role = room.roles[player.id];
    const playerSocket = io.sockets.sockets.get(player.id);
    if (playerSocket) {
      // Find this player's turn position
      const turnInfo = room.turnOrder.find(t => t.playerId === player.id);
      const turnPosition = turnInfo ? turnInfo.turnNumber : 0;
      
      // Build turn order message with proper ordinal suffixes
      const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };
      const turnOrderMessage = room.turnOrder.map(t => 
        `${t.playerName} (${getOrdinal(t.turnNumber)})`
      ).join(', ');
      
      if (role === 'knower') {
        playerSocket.emit('game-start', {
          role: 'knower',
          number: room.number,
          turnPosition: turnPosition,
          turnOrder: turnOrderMessage,
          message: `You know the number! It's ${room.number}. Find the imposter!`
        });
      } else {
        playerSocket.emit('game-start', {
          role: 'imposter',
          number: null,
          turnPosition: turnPosition,
          turnOrder: turnOrderMessage,
          message: `You are the IMPOSTER! You don't know the number. Blend in and don't get caught!`
        });
      }
    }
  });

  io.to(roomId).emit('game-status', {
    status: 'playing',
    message: 'Game started! Check your role above.'
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

