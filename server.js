const CONSTANTS = require('./utils/constants.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// Constants
const { PORT, MAX_TIME, CLIENT, SERVER } = CONSTANTS;

// Application Variables;
let players = 0;

// Create the HTTP server
const server = http.createServer((req, res) => {
  // get the file path from req.url, or '/public/index.html' if req.url is '/'
  const filePath = ( req.url === '/' ) ? '/public/index.html' : req.url;

  // determine the contentType by the file extension
  const extname = path.extname(filePath);
  let contentType = 'text/html';
  if (extname === '.js') contentType = 'text/javascript';
  else if (extname === '.css') contentType = 'text/css';

  // pipe the proper file to the res object
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(`${__dirname}/${filePath}`, 'utf8').pipe(res);
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
    type: SERVER.BROADCAST.GAME_START
  });

  // Choose a random potato holder to start
  broadcast({
    type: SERVER.BROADCAST.NEW_POTATO_HOLDER,
    payload: { newPotatoHolderNumber: Math.floor(Math.random() * 4) }
  });
  
  // Start the clock
  let clockValue = MAX_TIME;
  const interval = setInterval(() => {
    // At 0, tell everyone the game is over, stop the clock, and reset the players array
    if (clockValue === 0) {
      broadcast({ 
        type: SERVER.BROADCAST.GAME_OVER 
      });
      clearInterval(interval); // stop the timer
      players = 0; // reset the players array. clients can refresh to start a new game
      return;
    }
    
    // otherwise, broadcast the new clock value and decrement
    broadcast({
      type: SERVER.BROADCAST.COUNTDOWN,
      payload: { clockValue: clockValue-- }
    });
  }, 1000);
}

// a new socket will be created for each individual client
wsServer.on('connection', (socket) => {

  // Print that a new connection has been made. Uncomment during development.
  // console.log('new connection!');

  // Anytime the connected client emits a 'message'...
  socket.on('message', (data) => {
    
    // parse the incoming data. We expect a type and an optional payload
    const { type, payload } = JSON.parse(data);

    // Print the message and payload to the server console. Uncomment during development.
    // console.log(type, payload);

    switch (type) {
      case CLIENT.MESSAGE.PASS_POTATO:
        // Tell everyone who the potato was passed to
        broadcast({
          type: SERVER.BROADCAST.NEW_POTATO_HOLDER,
          payload: { newPotatoHolderNumber: payload.newPotatoHolderNumber }
        });
        break;
      case CLIENT.MESSAGE.NEW_USER:
        // If 4 players are already in the game, sorry :(
        if (players >= 4) {
          socket.send(JSON.stringify({
            type: SERVER.MESSAGE.GAME_FULL
          }));
          return;
        }

        // Assign the new user a player number (0 - 4)
        socket.send(JSON.stringify({
          type: SERVER.MESSAGE.PLAYER_ASSIGNMENT,
          payload: { playerNumber: players }
        }));
        
        // Add the new player name to the players list
        players++;

        // If they are the 4th player, start the game
        if (players === 4) {
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
