// server.js - Deploy this to Render.com
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

// Health check endpoint for Render
app.get('/', (req, res) => {
  res.send('AlphaCraft Multiplayer Server Running! Players: ' + Object.keys(players).length);
});

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  players[socket.id] = {
    id: socket.id,
    x: 0,
    y: 10,
    z: 0,
    yaw: 0
  };
  
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

/* 
==========================================
CREATE package.json FILE:
==========================================
{
  "name": "alphacraft-server",
  "version": "1.0.0",
  "description": "Multiplayer server for AlphaCraft",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.1"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}

==========================================
DEPLOY TO RENDER.COM (FREE):
==========================================

1. Create a GitHub repo with these 2 files:
   - server.js (this file)
   - package.json (above)

2. Go to https://render.com
   - Sign up (FREE)
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   
3. Configure:
   - Name: alphacraft-server
   - Environment: Node
   - Build Command: npm install
   - Start Command: npm start
   - Plan: FREE
   
4. Click "Create Web Service"

5. Your server URL will be:
   https://alphacraft-server.onrender.com

==========================================
FREE ALTERNATIVES:
==========================================

Railway.app - $5 free credit monthly
Cyclic.sh - 100% free
Fly.io - Free tier available

*/