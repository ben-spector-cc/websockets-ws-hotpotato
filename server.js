///////////////////////////////////////////////
///////////// IMPORTS + VARIABLES /////////////
///////////////////////////////////////////////

const CONSTANTS = require('./utils/constants.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// Constants
const { PORT, MAX_TIME, MAX_PLAYER_COUNT, CLIENT, SERVER } = CONSTANTS;

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

// TODO: Start the WebSocket server using the pre-made HTTP server


// TODO: Respond to connections and handle incoming socket messages


///////////////////////////////////////////////
////////////// HELPER FUNCTIONS ///////////////
///////////////////////////////////////////////

// TODO: Implement the broadcast function



const randomPlayerIndex = () => Math.floor(Math.random() * MAX_PLAYER_COUNT);

function startTimer() {
  // Start the clock
  let clockValue = MAX_TIME;
  const interval = setInterval(() => {
    // broadcast the new clock value and decrement until the clocks reaches 0
    if (clockValue > 0) {
      // TODO: decrement the clock value by 1 and broadcast the new value

    }

    // At 0: stop the clock, reset the players index, and tell everyone the game is over
    else {
      // TODO: broadcast the game is over
      clearInterval(interval); // stop the timer
      nextPlayerIndex = 0; // reset the players index
    }
  }, 1000);
}

// Start the server listening on localhost:8080
server.listen(PORT, () => {
  console.log(`Listening on: https://localhost:${server.address().port}`);
});
