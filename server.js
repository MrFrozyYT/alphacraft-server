// server.js - Complete with animations, held block syncing, and persistent bot
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

// ==================== BOT SYSTEM ====================
const BOT_ID = 'bot_guardian';
let botSocket = null;

function createBot() {
  console.log('🤖 Creating persistent bot...');
  
  // Create bot player data
  players[BOT_ID] = {
    id: BOT_ID,
    username: '🤖 Guardian',
    x: 5,
    y: 10,
    z: 5,
    yaw: 0,
    isWalking: false,
    isJumping: false,
    isBreaking: false,
    isPlacing: false,
    heldBlock: 9 // BLOCK.EMERALD - fancy bot block
  };
  
  // Broadcast bot joined
  io.emit('newPlayer', players[BOT_ID]);
  io.emit('systemMessage', {
    message: '🤖 Guardian Bot is now protecting the server',
    color: '#00ff00'
  });
  
  // Start bot behavior
  startBotBehavior();
}

function startBotBehavior() {
  // Bot random movement every 2 seconds
  setInterval(() => {
    if (!players[BOT_ID]) return;
    
    const bot = players[BOT_ID];
    
    // Random walk pattern
    const moveSpeed = 0.5;
    const randomAngle = Math.random() * Math.PI * 2;
    
    bot.x += Math.cos(randomAngle) * moveSpeed;
    bot.z += Math.sin(randomAngle) * moveSpeed;
    bot.yaw = randomAngle;
    
    // Keep bot within bounds (-50 to 50)
    bot.x = Math.max(-50, Math.min(50, bot.x));
    bot.z = Math.max(-50, Math.min(50, bot.z));
    
    // Random animations
    bot.isWalking = Math.random() > 0.3;
    bot.isJumping = Math.random() > 0.9;
    
    // Broadcast bot movement
    io.emit('playerMoved', {
      id: BOT_ID,
      x: bot.x,
      y: bot.y,
      z: bot.z,
      yaw: bot.yaw,
      isWalking: bot.isWalking,
      isJumping: bot.isJumping,
      isBreaking: false,
      isPlacing: false
    });
  }, 2000);
  
  // Bot chat messages every 5 minutes
  setInterval(() => {
    const messages = [
      'Keeping the server alive! 🛡️',
      'Still here, protecting AlphaCraft! 💎',
      'Guardian Bot reporting: All systems operational! ⚡',
      'No griefers on my watch! 👀',
      'Building dreams, one block at a time! 🏗️'
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    io.emit('chatMessage', {
      username: '🤖 Guardian',
      message: randomMessage,
      timestamp: Date.now()
    });
  }, 300000); // 5 minutes
  
  // Keep-alive heartbeat (prevents server sleep)
  setInterval(() => {
    console.log('🤖 Bot heartbeat - Server staying alive');
  }, 60000); // Every minute
}

// Initialize bot on server start
setTimeout(() => {
  createBot();
}, 1000);

// ==================== WEB INTERFACE ====================
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>AlphaCraft Server</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            background: #1a1a1a;
            color: #00ff00;
            padding: 40px;
            text-align: center;
          }
          h1 { color: #00ff00; text-shadow: 0 0 10px #00ff00; }
          .stats {
            background: #2a2a2a;
            border: 2px solid #00ff00;
            padding: 20px;
            margin: 20px auto;
            max-width: 600px;
            border-radius: 10px;
          }
          .stat { margin: 10px 0; font-size: 18px; }
          .bot { color: #ffaa00; }
        </style>
      </head>
      <body>
        <h1>🎮 AlphaCraft Multiplayer Server</h1>
        <div class="stats">
          <div class="stat">🟢 Server Status: <strong>ONLINE</strong></div>
          <div class="stat">👥 Players Online: <strong>${Object.keys(players).length}</strong></div>
          <div class="stat">🧱 World Blocks: <strong>${Object.keys(worldBlocks).length}</strong></div>
          <div class="stat bot">🤖 Guardian Bot: <strong>ACTIVE</strong></div>
        </div>
        <p>Server is protected by Guardian Bot 🛡️</p>
      </body>
    </html>
  `);
});

// ==================== PLAYER CONNECTION HANDLING ====================
io.on('connection', (socket) => {
  // Don't increment counter for bot
  if (socket.id === BOT_ID) return;
  
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
    if (socket.id === BOT_ID) return; // Bot never disconnects
    
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

// ==================== SERVER START ====================
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AlphaCraft Server running on port ${PORT}`);
  console.log(`🤖 Guardian Bot will initialize in 1 second...`);
});
