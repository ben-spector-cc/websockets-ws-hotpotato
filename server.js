///////////////////////////////////////////////
///////////// IMPORTS + VARIABLES /////////////
///////////////////////////////////////////////

const CONSTANTS = require('./utils/constants.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// Constants
const { PORT, MAX_TIME, CLIENT, SERVER } = CONSTANTS;

// Application Variables;
let nextPlayerIndex = 0;

///////////////////////////////////////////////
///////////// HTTP SERVER LOGIC ///////////////
///////////////////////////////////////////////

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

///////////////////////////////////////////////
////////////////// WS LOGIC ///////////////////
///////////////////////////////////////////////

// TODO: Create the WebSocket Server (ws) using the HTTP server
const wsServerOptions = { server };
const wsServer = new WebSocket.Server(wsServerOptions);

// TODO: Create the websocket server connection handler
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
        passThePotatoTo(payload.newPotatoHolderIndex);
        break;
      case CLIENT.MESSAGE.NEW_USER:
        handleNewUser(socket);
        break;
      default:
        break;
    }
  });
});

///////////////////////////////////////////////
////////////// HELPER FUNCTIONS ///////////////
///////////////////////////////////////////////

// TODO: Implement the broadcast pattern
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

function passThePotatoTo(newPotatoHolderIndex) {
  // TODO: Tell everyone who the potato was passed to
  broadcast({
    type: SERVER.BROADCAST.NEW_POTATO_HOLDER,
    payload: { newPotatoHolderIndex }
  });
}

function handleNewUser(socket) {
  if (nextPlayerIndex < 4) {
    // TODO: Assign the new user a player index (0 | 1 | 2 | 3)
    socket.send(JSON.stringify({
      type: SERVER.MESSAGE.PLAYER_ASSIGNMENT,
      payload: { clientPlayerIndex: nextPlayerIndex }
    }));
    
    // Increment the number of players in the game
    nextPlayerIndex++;
    
    // If they are the 4th player, start the game
    if (nextPlayerIndex === 4) {
      startGame();
    }
  } 
  
  else {
    // TODO: If 4 players are already in the game, sorry :(
    socket.send(JSON.stringify({
      type: SERVER.MESSAGE.GAME_FULL
    }));
  }
}

function startGame() {
  // Choose a random potato holder to start
  const randomFirstPotatoHolder = Math.floor(Math.random() * 4);
  passThePotatoTo(randomFirstPotatoHolder);

  // Start the clock
  let clockValue = MAX_TIME;
  const interval = setInterval(() => {
    if (clockValue > 0) {
      // TODO: broadcast the new clock value 
      broadcast({
        type: SERVER.BROADCAST.COUNTDOWN,
        payload: { clockValue: clockValue }
      });

      // decrement until the clocks reaches 0
      clockValue--;
    }

    // At 0: stop the clock, reset the players index, and tell everyone the game is over 
    else {
      clearInterval(interval); // stop the timer
      nextPlayerIndex = 0; // reset the players index
      
      // TODO: Tell all clients the game is over
      broadcast({ 
        type: SERVER.BROADCAST.GAME_OVER 
      });
    }
  }, 1000);
}

// Start the server listening on localhost:8080
server.listen(PORT, () => {
  console.log(`Listening on: http://localhost:${server.address().port}`);
});
