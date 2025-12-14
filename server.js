// server.js - Enhanced with usernames and chat
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const players = {};
const worldBlocks = {};
let playerCount = 0;

app.get('/', (req, res) => {
  res.send('AlphaCraft Multiplayer Server Running! Players: ' + Object.keys(players).length);
});

io.on('connection', (socket) => {
  playerCount++;
  const username = 'Player' + playerCount;
  
  console.log('Player connected:', socket.id, username);
  
  players[socket.id] = {
    id: socket.id,
    username: username,
    x: 0,
    y: 10,
    z: 0,
    yaw: 0
  };
  
  socket.emit('assignUsername', username);
  socket.emit('currentPlayers', players);
  socket.emit('worldBlocks', worldBlocks);
  socket.broadcast.emit('newPlayer', players[socket.id]);
  
  socket.on('playerMovement', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].z = data.z;
      players[socket.id].yaw = data.yaw;
      
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        x: data.x,
        y: data.y,
        z: data.z,
        yaw: data.yaw
      });
    }
  });
  
  socket.on('chatMessage', (message) => {
    const username = players[socket.id]?.username || 'Unknown';
    io.emit('chatMessage', {
      username: username,
      message: message,
      timestamp: Date.now()
    });
  });
  
  socket.on('blockPlaced', (data) => {
    const key = `${data.x}_${data.y}_${data.z}`;
    worldBlocks[key] = {
      x: data.x,
      y: data.y,
      z: data.z,
      type: data.type
    };
    io.emit('blockPlaced', data);
  });
  
  socket.on('blockBroken', (data) => {
    const key = `${data.x}_${data.y}_${data.z}`;
    delete worldBlocks[key];
    io.emit('blockBroken', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
