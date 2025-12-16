// server.js - Complete with animations and held block syncing
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
  
  // Initialize player with animation state and held block
  players[socket.id] = {
    id: socket.id,
    username: username,
    x: 0,
    y: 10,
    z: 0,
    yaw: 0,
    isWalking: false,
    isJumping: false,
    isBreaking: false,
    isPlacing: false,
    heldBlock: 1 // Default to BLOCK.GRASS
  };
  
  socket.emit('assignUsername', username);
  socket.emit('currentPlayers', players);
  socket.emit('worldBlocks', worldBlocks);
  socket.broadcast.emit('newPlayer', players[socket.id]);
  
  // Broadcast join message in yellow
  io.emit('systemMessage', {
    message: `${username} joined AlphaCraft`,
    color: 'yellow'
  });
  
  // Handle player movement with animation state
  socket.on('playerMovement', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].z = data.z;
      players[socket.id].yaw = data.yaw;
      players[socket.id].isWalking = data.isWalking || false;
      players[socket.id].isJumping = data.isJumping || false;
      players[socket.id].isBreaking = data.isBreaking || false;
      players[socket.id].isPlacing = data.isPlacing || false;
      
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        x: data.x,
        y: data.y,
        z: data.z,
        yaw: data.yaw,
        isWalking: data.isWalking,
        isJumping: data.isJumping,
        isBreaking: data.isBreaking,
        isPlacing: data.isPlacing
      });
    }
  });
  
  // Handle held block changes
  socket.on('heldBlockChanged', (heldBlock) => {
    if (players[socket.id]) {
      players[socket.id].heldBlock = heldBlock;
      
      // Notify all other players
      socket.broadcast.emit('playerHeldBlockChanged', {
        id: socket.id,
        heldBlock: heldBlock
      });
    }
  });
  
  // Handle chat messages
  socket.on('chatMessage', (message) => {
    const username = players[socket.id]?.username || 'Unknown';
    io.emit('chatMessage', {
      username: username,
      message: message,
      timestamp: Date.now()
    });
  });
  
  // Handle block placement
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
  
  // Handle block breaking
  socket.on('blockBroken', (data) => {
    const key = `${data.x}_${data.y}_${data.z}`;
    delete worldBlocks[key];
    io.emit('blockBroken', data);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    const username = players[socket.id]?.username || 'Unknown';
    console.log('Player disconnected:', socket.id, username);
    
    // Broadcast leave message in red
    io.emit('systemMessage', {
      message: `${username} left AlphaCraft`,
      color: '#ff5555'
    });
    
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
