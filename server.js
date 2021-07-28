const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

// Constants
const PORT = process.env.PORT || 8080;
const MAX_TIME = 30;
const CLIENT_MESSAGE = {
  NEW_USER: 'NEW_USER',
  PASS_POTATO: 'PASS_POTATO',
};
const SERVER_MESSAGE = {
  PLAYER_ASSIGNMENT: 'PLAYER_ASSIGNMENT',
  GAME_FULL: 'GAME_FULL',
};
const SERVER_BROADCAST = {
  COUNTDOWN: 'COUNTDOWN',
  NEW_POTATO_HOLDER: 'NEW_POTATO_HOLDER',
  GAME_OVER: 'GAME_OVER',
  GAME_START: 'GAME_START',
}

// Application Variables;
let players = [];

// Create the HTTP server
const server = http.createServer((req, res) => {
  if (req.url === '/styles.css') {
    res.writeHead(200, { 'Content-Type': 'text/css' }); // http header
    fs.createReadStream('public/styles.css', 'utf8').pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' }); // http header
    fs.createReadStream('public/index.html', 'utf8').pipe(res);
  }
});

// Create the WebSocket Server (ws) using the HTTP server
const wsServerOptions = { server };
const wsServer = new WebSocket.Server(wsServerOptions);

// include a socket if you want to leave it out, otherwise broadcast to every open socket
function broadcast(data, socketToOmit) {
  // All connected sockets can be found at wsServer.clients
  wsServer.clients.forEach((client) => {
    // Send to all clients in the open readyState, excluding the socketToOmit if provided
    if (client.readyState === WebSocket.OPEN && client !== socketToOmit) {
      client.send(JSON.stringify(data));
    }
  });
}

function startGame() {
  // Tell everyone the game is starting along with the names of the players
  broadcast({ 
    type: SERVER_BROADCAST.GAME_START, 
    payload: { players } 
  });

  // Choose a random potato holder to start
  broadcast({
    type: SERVER_BROADCAST.NEW_POTATO_HOLDER,
    payload: { newPotatoHolderNumber: Math.floor(Math.random() * 4) }
  });
  
  // Start the clock
  let clockValue = MAX_TIME;
  const interval = setInterval(() => {
    // At 0, tell everyone the game is over, stop the clock, and reset the players array
    if (clockValue === 0) {
      broadcast({ 
        type: SERVER_BROADCAST.GAME_OVER 
      });
      clearInterval(interval);
      players = [];
      return;
    }
    
    // otherwise, broadcast the new clock value
    broadcast({
      type: SERVER_BROADCAST.COUNTDOWN,
      payload: { clockValue: clockValue-- }
    });
  }, 1000);
}

// a new socket will be created for each individual client
wsServer.on('connection', (socket) => {
  console.log('new connection!');

  socket.on('message', (data) => {
    // parse the incoming data. We expect a type and an optional payload
    const { type, payload } = JSON.parse(data);

    console.log(type, payload);

    switch (type) {
      case CLIENT_MESSAGE.PASS_POTATO:
        // Tell everyone who the potato was passed to
        broadcast({
          type: SERVER_BROADCAST.NEW_POTATO_HOLDER,
          payload: { newPotatoHolderNumber: payload.newPotatoHolderNumber }
        });
        break;
      case CLIENT_MESSAGE.NEW_USER:
        // If 4 players are already in the game, sorry :(
        if (players.length >= 4) {
          socket.send(JSON.stringify({
            type: SERVER_MESSAGE.GAME_FULL
          }));
          return;
        }

        // Assign the new user a player number (0 - 4)
        socket.send(JSON.stringify({
          type: SERVER_MESSAGE.PLAYER_ASSIGNMENT,
          payload: { playerNumber: players.length }
        }));
        
        // Add the new player name to the players list
        players.push(payload.playerName)

        // If they are the 4th player, start the game
        if (players.length === 4) {
          startGame();
        }
        break;
      default:
        break;
    }
  });
});

// Start the server listening on localhost:8080
server.listen(PORT, () => {
  console.log(`Listening on: http://localhost:${server.address().port}`);
});
