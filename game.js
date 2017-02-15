

var express = require('express');
var path = require('path');
var app = express();
app.use(express.static(path.join(__dirname, 'public')));
var port = process.env.PORT || 8000;

var server = require('http').createServer(app)

var util = require("util"),
    socket = require("socket.io").listen(server, {origins:'sniper.satvik.co:*'}),
    Player = require("./player").player;

var socket,
  players;


function init() {
  players = [];

  // socket.configure(function() {
  //   socket.set("transports", ["websocket"]);
  //   socket.set("log level", 2);
  // });

  setEventHandlers();

  server.listen(port);
};

var setEventHandlers = function() {
    socket.sockets.on("connection", onSocketConnection);
};

function onSocketConnection(client) {
    util.log("New player has connected: "+client.id);
    client.on("disconnect", onClientDisconnect);
    client.on("new player", onNewPlayer);
    client.on("move player", onMovePlayer);
    client.on("hit player", onHitPlayer);
};

function onClientDisconnect() {
    util.log("Player has disconnected: "+this.id);

    var removePlayer = playerById(this.id);

    if (!removePlayer) {
        util.log("(disconnect) Player not found: "+this.id);
        return;
    };

    players.splice(players.indexOf(removePlayer), 1);
    this.broadcast.emit("remove player", {id: this.id});
};

function onNewPlayer(data) {
  var newPlayer = new Player(data.x, data.y, data.z);
  newPlayer.id = this.id;

  this.broadcast.emit("new player", {id: newPlayer.id, x: newPlayer.getX(), y: newPlayer.getY(), z: newPlayer.getZ()});

  var i, existingPlayer;
  for (i = 0; i < players.length; i++) {
      existingPlayer = players[i];
      this.emit("new player", {id: existingPlayer.id, x: existingPlayer.getX(), y: existingPlayer.getY(), z: existingPlayer.getZ()});
  };

  players.push(newPlayer);
};

function onHitPlayer(data){
  var hitPlayer = playerById(data.id)

  if(!hitPlayer){
    console.log("(hit) player not found: "+data.id)
  }

  // TODO: Affect health here and anything else when hit by a bullet, and give data


  this.broadcast.emit("hit player", {id: hitPlayer.id})
}

function onMovePlayer(data) {
  var movePlayer = playerById(data.id);

  if (!movePlayer) {
      console.log("(move) Player not found: "+data.id);
      return;
  };

  movePlayer.setX(data.x);
  movePlayer.setY(data.y);
  movePlayer.setZ(data.z);

  this.broadcast.emit("move player", {id: movePlayer.id, x: movePlayer.getX(), y: movePlayer.getY(), z: movePlayer.getZ()});
};

function playerById(id) {
    var i;
    for (i = 0; i < players.length; i++) {
        if (players[i].id == id)
            return players[i];
    };

    return false;
};

init();
