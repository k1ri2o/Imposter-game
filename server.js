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
        roles: {}
      };
    }

    const player = {
      id: socket.id,
      name: `Player ${rooms[roomId].players.length + 1}`
    };

    rooms[roomId].players.push(player);
    socket.emit('player-name', player.name);
    
    io.to(roomId).emit('players-update', rooms[roomId].players.map(p => p.name));

    if (rooms[roomId].players.length === 3) {
      startGame(roomId);
    } else {
      io.to(roomId).emit('game-status', {
        status: 'waiting',
        message: `Waiting for ${3 - rooms[roomId].players.length} more player(s)...`
      });
    }
  });

  socket.on('start-game', (roomId) => {
    if (rooms[roomId] && rooms[roomId].players.length === 3) {
      startGame(roomId);
    }
  });

  socket.on('restart-game', (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId].gameState = 'waiting';
      rooms[roomId].number = null;
      rooms[roomId].roles = {};
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
  if (!room || room.players.length !== 3) return;

  // Generate random number between 1-100
  room.number = Math.floor(Math.random() * 100) + 1;
  room.gameState = 'playing';

  // Randomly select imposter
  const imposterIndex = Math.floor(Math.random() * 3);
  const imposterId = room.players[imposterIndex].id;

  // Assign roles
  room.players.forEach((player, index) => {
    if (player.id === imposterId) {
      room.roles[player.id] = 'imposter';
    } else {
      room.roles[player.id] = 'knower';
    }
  });

  // Send roles and number to each player
  room.players.forEach((player) => {
    const role = room.roles[player.id];
    const playerSocket = io.sockets.sockets.get(player.id);
    if (playerSocket) {
      if (role === 'knower') {
        playerSocket.emit('game-start', {
          role: 'knower',
          number: room.number,
          message: `You know the number! It's ${room.number}. Find the imposter!`
        });
      } else {
        playerSocket.emit('game-start', {
          role: 'imposter',
          number: null,
          message: 'You are the IMPOSTER! You don\'t know the number. Blend in and don\'t get caught!'
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

