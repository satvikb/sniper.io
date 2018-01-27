var express = require('express');
var path = require('path');
var app = express();
app.use(express.static(path.join(__dirname, 'public')));
var port = process.env.PORT || 8000;
var THREE = require('three');
var CANNON = require('cannon');
var getPixels = require("get-pixels")
var ndarray = require("ndarray");

var MAX_PLAYERS = 12

var playerScene;
var raycaster;
var camera;
var server = require('http').createServer(app)
var fs = require('fs')

var util = require("util")
var socket = require("socket.io").listen(server, {origins:'localhost:8000:*'})

var game;
var gunManager;

var terrainHeight = 5
var terrainScale = 2

function init() {

  getPixels("extras/heightmap.jpg", function(err, pixels){
    if(err){
      console.log("Could not load heightmap")
      return;
    }


    function getPixel(x, y, pixels) {
        return pixels.get(x, y, 0);
    }

    console.log(getPixel(0, 0, pixels)+" width: "+pixels.shape[0])

    var matrix = [];
    var sizeX = pixels.shape[0],
        sizeY = pixels.shape[1];
    for (var i = 0; i < sizeX; i++) {
        matrix.push([]);
        for (var j = 0; j < sizeY; j++) {
            var r = getPixel(i, j, pixels)
            var height = r/255//avgColor(col[0], col[1], col[2])/255
            height *= terrainHeight // Multiplier
            // if(i===0 || i === sizeX-1 || j===0 || j === sizeY-1){
            //   height = 0;
            // }
            matrix[i].push(height);
        }
    }

    players = [];
    clients = []; //Includes connections not in game, e.g. in lobby

    playerScene = new THREE.Scene();
    raycaster = new THREE.Raycaster()

    game = new Game(matrix, terrainHeight, terrainScale)
    gunManager = new GunManager();

    setEventHandlers();

    server.listen(port);
  })
  console.log("init")
};

var setEventHandlers = function() {
  socket.sockets.on("connection", onSocketConnection);
};

function onSocketConnection(client) {
  util.log("Client has connected: "+client.id);

  clients.push(client.id)

  client.on("joinGame", onJoinGame)
  client.on("disconnect", onClientDisconnect);
  client.on("new player", onNewPlayer);
  client.on("input", onInputPlayer);

  client.on('connectData', function(){
    this.emit('connectData', {map: JSON.stringify(game.getMap()), world: game.getWorldData()})
  })

  client.on("shoot", playerShoot)
  client.on("reload", playerReload)

  // client.on("look player", onLookPlayer)

  // client.on("hit player", onHitPlayer);

  client.on("chatMessage", chatMessage)
};

function chatMessage(data){
  var player = playerById(data.from)

  if(player){
    if(data.msg != ""){
      //TODO Message filtering

      sendActualChatMessage({from: player.nickname, msg: data.msg})
    }
  }
}

function playerReload(data){
  var player = playerById(data.id)

  if(player){
    player.reloading = true
    var reloadSpeed = player.playerData.gun.reloadSpeed

    function reload(s){
      if(player.reloading == true){
        if(player.playerData.ammo < player.playerData.gun.maxAmmo){
          player.playerData.ammo += 1
          // s.emit("reload", {ammo: player.playerData.ammo})
          setTimeout(reload, reloadSpeed, s)
        }
      }
    }

    var timeToReloadAllBullets = (player.playerData.gun.reloadSpeed*(player.playerData.gun.maxAmmo - player.playerData.ammo))
    setTimeout(reload, reloadSpeed, this)
  }
}

function sendActualChatMessage(data){
  socket.sockets.emit("chatMessage", {from: data.from, msg: data.msg})
}

var mass = 30000, radius = 0.8, playerHeight = 2;
var ballGeometry = new THREE.SphereGeometry(radius, 16, 16);

function onJoinGame(data){
  //TODO Pick a server, test for availability, etc.
  if(gameAvailable()){
    var playerId = data.id
    var nickname = data.nickname == "" ? "player" : data.nickname
    nickname.length > 8 ? nickname.substring(0, 8) : nickname

    var gameId = 0
    //TODO: prevent username from being changed when sent to client side to be sent back here
    this.emit('joinGame', {gameId: gameId, nickname: nickname, mass: mass})
  }
}

function gameAvailable(){
  return players.length <= MAX_PLAYERS
}

function onClientDisconnect() {
  clients.splice(clients.indexOf(this.id), 1);

  var removePlayer = playerById(this.id);

  util.log("Client has disconnected: "+removePlayer.nickname+" ("+this.id+")");

  if (!removePlayer) {
    util.log("(disconnect) Player not found: "+this.id);
    return;
  };

  game.removePhysicsBody(removePlayer.body)

  players.splice(players.indexOf(removePlayer), 1);

  this.broadcast.emit("remove player", {id: this.id});
};


function onNewPlayer(data) {

  var size = new CANNON.Vec3(radius/2, radius, radius/2)
  // var bodyShape = new CANNON.Box(size)
  var bodyShape = new CANNON.Sphere(radius)
  var body = new CANNON.Body({ mass: mass,
    angularFactor: new CANNON.Vec3(0, 1, 0)
  });
  body.linearDamping = 0.6;
  body.position.set(0, 60, 0)

  body.angularDamping = 0.5
  body.updateMassProperties();

  //set spawn and rotation here?
  var rotation = new CANNON.Vec3()

  var mesh = new THREE.Mesh( ballGeometry, new THREE.MeshBasicMaterial({}) );

  var newPlayer = new Player(data.id, body, mesh, data.nickname);
  newPlayer.camRotation = rotation

  newPlayer.body.addShape(bodyShape);
  game.addPhysicsBody(newPlayer.body);
  playerScene.add(mesh)

  console.log("Test Gun: "+JSON.stringify(gunManager.testGun)+" Ammo: "+gunManager.testGun.name)
  newPlayer.setGun(gunManager.testGun)

  //Tell all other players about the newbie
  this.broadcast.emit("new player", {id: newPlayer.id, nickname: newPlayer.nickname, x: newPlayer.body.position.x, y: newPlayer.body.y, z: newPlayer.body.z, mass: mass, playerData: newPlayer.playerData});

  //Tell the new player of all the current players
  var i, existingPlayer;
  for (i = 0; i < players.length; i++) {
    existingPlayer = players[i];
    this.emit("new player", {id: existingPlayer.id, nickname: existingPlayer.nickname, x: existingPlayer.body.position.x, y: existingPlayer.body.y, z: existingPlayer.body.z, mass: mass, playerData: existingPlayer.playerData});
  };

  players.push(newPlayer);
  util.log("Added new player "+newPlayer.nickname+" ("+this.id+" "+newPlayer.defaultSensitivity+" ) Total players now: "+players.length)
};

function onHitPlayer(data){
  var hitPlayer = playerById(data.id)

  if(!hitPlayer){
    console.log("(hit) player not found: "+data.id)
  }

  // TODO: Affect health here and anything else when hit by a bullet, and give data

  this.broadcast.emit("hit player", {id: hitPlayer.id})
}



// function onLookPlayer(data){
//   var lookPlayer = playerById(data.id)
//
//   if(!lookPlayer){
//     console.log("cannot rotate player")
//   }
//
//   //set body rotation
//   // lookPlayer.body.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), )
//   var moveX = data.movementX
//   var moveY = data.movementY
//
//   moveX /= 2
//   moveY /= 2
//
//   var changeX = data.movementY * defaultSensitivity
//   var changeY = data.movementX * defaultSensitivity
//
//   lookPlayer.camRotation.x -= changeX
//   lookPlayer.camRotation.y -= changeY
//
//   lookPlayer.camRotation.x = Math.max( - PI_2, Math.min( PI_2, lookPlayer.camRotation.x ) );
//   // lookPlayer.body.angularVelocity.set(changeX, changeY, 0)
//   // this.emit("look player", {rotationX: lookPlayer.camRotation.x, rotationY: lookPlayer.camRotation.y})
// }

function onInputPlayer(data) {
  // console.log("move: "+data.id)
  var inputPlayer = playerById(data.id);

  if (!inputPlayer) {
    console.log("(move) Player not found: "+data.id);
    return;
  };

  inputPlayer.input(data.inputs, delta)
};

function sendUpdate(delta){
  function getUpdateData(){
    var updateData = []
    for(var i = 0; i < players.length; i++){
      var plData = {}
      plData.id = players[i].id
      plData.position = players[i].body.position
      plData.quat = players[i].body.quaternion
      plData.playerData = players[i].playerData
      plData.camRotation = players[i].camRotation
      plData.shootData = players[i].shootData
      updateData.push(plData)

      //Variables to reset once update is sent
      players[i].shootData.hitPlayer = false
      players[i].shootData.shotPlayer = []
      players[i].shootData.shootBullet = false

    }
    return updateData;
  }
  socket.sockets.emit('updatePlayers', {delta: delta, data: getUpdateData()})
}

//TODO When moved hit test to server side, delete
function getRemotePlayerObjects(){
  var objects = []
  for(var o = 0; o < players.length; o++){
    objects.push(players[o].mesh)
  }
  return objects
}

function getRemotePlayerFromObject(obj){
  for(var o = 0; o < players.length; o++){
    if(players[o].mesh == obj){
      return players[o]
    }
  }
  return false
}

function playerShoot(data){

}


function playerById(id) {
  var i;
  for (i = 0; i < players.length; i++) {
    if (players[i].id == id)
    return players[i];
  };

  return false;
};

var time = Date.now()
var delta = 0;
function loop() {
  game.updatePhysics();

  delta = Date.now() - time
  //use delta
  sendUpdate(delta)

  time = Date.now()

  setTimeout(loop, 1000/60);
}

function Game(matrix, terrainHeight, terrainScale){
  var map = matrix//[]
  var models = {}
  var cw = {} // Cannon World
  var dt = 1/60;
  var n = 8
  var height = terrainHeight
  var scale = terrainScale
  // console.log("T:"+terrainHeight)

  this.gameInit = function() {
    cw.world = new CANNON.World();
    cw.world.quatNormalizeSkip = 0;
    cw.world.quatNormalizeFast = false;

    var solver = new CANNON.GSSolver();
    cw.world.defaultContactMaterial.contactEquationStiffness = 1e9;
    cw.world.defaultContactMaterial.contactEquationRelaxation = 4;
    solver.iterations = 7;
    solver.tolerance = 0.1;
    var split = true;
    if(split){
      cw.world.solver = new CANNON.SplitSolver(solver);
    }else{
      cw.world.solver = solver;
    }

    cw.world.gravity.set(0,-30,0);
    cw.world.broadphase = new CANNON.NaiveBroadphase();
    // Create a slippery material (friction coefficient = 0.0)
    // physicsMaterial = new CANNON.Material("slipperyMaterial");
    // var physicsContactMaterial = new CANNON.ContactMaterial(physicsMaterial, physicsMaterial, 0.0, 0.3);
    // // We must add the contact materials to the world
    // cw.world.addContactMaterial(physicsContactMaterial);

    //Ground plane
    var groundShape = new CANNON.Plane(); //inf size
    var groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    this.addPhysicsBody(groundBody);

    this.createStage()
  };

  var worldSize = (map[0].length/2)*scale
  console.log("World size: "+worldSize)
  var boundaryWhitespace = 10
  var boundaryThickness = 1
  var boundaryHeight = 40

  var tileWidth;
  var tileHeight;

  var slopeData;

  this.createStage = function(){
    // this.createMap(n)

    var boundarySize = new CANNON.Vec3(worldSize*2+(boundaryWhitespace*2), boundaryHeight, boundaryThickness)

    for(var i = 0; i < 4; i++){
      var halfExtents = new CANNON.Vec3(boundarySize.x/2, boundarySize.y/2, boundarySize.z/2)
      var boundarySideShape = new CANNON.Box(halfExtents)
      var rotation = (- Math.PI / 2)*i

      var boundaryBody = new CANNON.Body({mass: 0})
      boundaryBody.addShape(boundarySideShape)
      boundaryBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), rotation); //Match rotaion of geometry

      var zChange = 0
      var xChange = 0

      switch (i) {
        case 0:
        zChange = -worldSize-boundaryWhitespace
        xChange = 0
        break;
        case 1:
        zChange = 0
        xChange = -worldSize-boundaryWhitespace
        break;
        case 2:
        zChange = worldSize+boundaryWhitespace
        xChange = 0
        break;
        case 3:
        zChange = 0
        xChange = worldSize+boundaryWhitespace
        break;
        default:
        break;
      }

      boundaryBody.position.set(xChange-(tileWidth/2), boundaryHeight/2, zChange-(tileWidth/2))
      this.addPhysicsBody(boundaryBody)
    }

    // this.loadModels()

    // slopeData = this.createSlope(tileWidth, tileHeight)
    //
    // for(var l = 0; l < map.length; l++){
    //   for(var x = 0; x < n; x++){
    //     for(var y = 0; y < n; y++){
    //       //Create physics bodies
    //       // if(map[i] > 0){
    //       //   this.createHouse(map[i]-1, i)
    //       // }
    //       if(map[l][x][y] > 0){
    //         this.createTile(x,y,l)
    //       }
    //     }
    //   }
    // }

    var sizeX = map[0].length;
    var sizeY = map[1].length;
    // Create the heightfield
    var hfShape = new CANNON.Heightfield(map, {
        elementSize: scale
    });
    var hfBody = new CANNON.Body({ mass: 0 });
    hfBody.addShape(hfShape);
    hfBody.position.set((-sizeX * hfShape.elementSize) / 2, 0, (sizeY * hfShape.elementSize) / 2);
    hfBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), (-Math.PI/2))
    this.addPhysicsBody(hfBody);



    var geometry = new THREE.Geometry();

    var v0 = new CANNON.Vec3();
    var v1 = new CANNON.Vec3();
    var v2 = new CANNON.Vec3();

    for (var xi = 0; xi < hfShape.data.length - 1; xi++) {
      for (var yi = 0; yi < hfShape.data[xi].length - 1; yi++) {
        for (var k = 0; k < 2; k++) {
          hfShape.getConvexTrianglePillar(xi, yi, k===0);
          v0.copy(hfShape.pillarConvex.vertices[0]);
          v1.copy(hfShape.pillarConvex.vertices[1]);
          v2.copy(hfShape.pillarConvex.vertices[2]);
          v0.vadd(hfShape.pillarOffset, v0);
          v1.vadd(hfShape.pillarOffset, v1);
          v2.vadd(hfShape.pillarOffset, v2);
          geometry.vertices.push(
            new THREE.Vector3(v0.x, v0.y, v0.z),
            new THREE.Vector3(v1.x, v1.y, v1.z),
            new THREE.Vector3(v2.x, v2.y, v2.z)
          );
          var i = geometry.vertices.length - 3;
          var face = new THREE.Face3(i, i+1, i+2)
          geometry.faces.push(face);
        }
      }
    }

    geometry.computeBoundingSphere();
    geometry.computeFaceNormals();
    var material = new THREE.MeshBasicMaterial();
    mesh = new THREE.Mesh(geometry, material);
    mesh.quaternion.copy(hfBody.quaternion)
    mesh.position.copy(hfBody.position)
    playerScene.add(mesh)



    console.log("created map ("+map[0].length+" x "+map[1].length+")")
  }

  // this.loadModels = function(){
  //   var numModels = 1
  //   for(var m = 0; m < numModels; m++){
  //     models[m] = fs.readFileSync("public/assets/models/house"+m+".json")
  //   }
  // }

  this.createMap = function(nO){
    n = 11
    tileWidth = (worldSize*2)/n
    tileHeight = tileWidth

    //TODO: Layers, add extra dimension
    //11x11
    //    (-n/2, -n/2) Q32             (n/2, -n/2)  Q1

    map = [[[1, 5, 0, 0, 0, 0, 3, 1, 1, 2, 2],
          [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
          [0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 1],
          [6, 0, 0, 2, 2, 2, 2, 2, 0, 0, 1],
          [1, 0, 0, 2, 0, 0, 0, 2, 0, 0, 2],
          [1, 0, 0, 2, 0, 0, 0, 2, 0, 3, 2],
          [2, 0, 0, 2, 0, 0, 0, 2, 0, 0, 2],
          [2, 0, 0, 2, 2, 2, 2, 2, 0, 0, 1],
          [1, 0, 0, 4, 0, 0, 0, 4, 0, 0, 4],
          [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [1, 5, 0, 3, 1, 1, 2, 2, 5, 0, 0]],

          [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
          [0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 1],
          [0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 4],
          [0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0],
          [0, 3, 2, 2, 2, 2, 2, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]

          ]
  //     (-n/2, n/2) Q3               (n/2, n/2) Q4
}

this.getMap = function(){
  return map
}

this.getWorldData = function(){
  return {worldSize: worldSize, n: n, terrainHeight: height, terrainScale: scale, tileWidth: tileWidth, tileHeight: tileHeight, boundaryThickness: boundaryThickness, boundaryHeight: boundaryHeight, boundaryWhitespace: boundaryWhitespace}
}

this.getN = function(){
  return n
}

this.createTile = function(x, y, l){
  var tile = map[l][x][y]
  // var gridPos = new CANNON.Vec3(((gridTile%n)-(n/2))*tileWidth, 0, ((gridTile/n)-(n/2))*tileWidth)
  var gridPos = new CANNON.Vec3(-((x-(n/2))*tileWidth), l*tileHeight, (y-(n/2))*tileWidth)

  if(tile){
    //None
    if(tile == 0){
      return
    }

    //Solid
    if(tile == 1){
      var tWidth = tileWidth
      var tHeight = tileHeight
      var halfExtents = new CANNON.Vec3(tWidth/2, tHeight/2, tWidth/2)
      var boxShape = new CANNON.Box(halfExtents)

      var boxBody = new CANNON.Body({mass: 0})
      boxBody.addShape(boxShape)

      // var heightOffset = (height/2)//*newScale
      // boxBody.quaternion.set(rot.x, rot.y, rot.z, rot.w)
      // boxBody.position.set(gridPos.x+(pos.x/2), (pos.y/2)+height, gridPos.z+(pos.z/2))
      // boxBody.position.set(gridPos.x+pos.x, pos.y+heightOffset, gridPos.z+pos.z)
      boxBody.position.set(gridPos.x, gridPos.y+(tileHeight/2), gridPos.z)

      this.addPhysicsBody(boxBody)
    }

    //Overhead
    if(tile == 2){
      var size = new CANNON.Vec3(tileWidth, tileHeight/8, tileWidth)
      var halfExtents = new CANNON.Vec3(size.x/2, size.y/2, size.z/2)
      var boxShape = new CANNON.Box(halfExtents)

      var boxBody = new CANNON.Body({mass: 0})
      boxBody.addShape(boxShape)

      // var heightOffset = (height/2)//*newScale
      // boxBody.quaternion.set(rot.x, rot.y, rot.z, rot.w)
      // boxBody.position.set(gridPos.x+(pos.x/2), (pos.y/2)+height, gridPos.z+(pos.z/2))
      // boxBody.position.set(gridPos.x+pos.x, pos.y+heightOffset, gridPos.z+pos.z)
      boxBody.position.set(gridPos.x, gridPos.y+(tileHeight-size.y/2), gridPos.z)

      this.addPhysicsBody(boxBody)
    }

    //Slope 3-6
    if(tile >= 3 && tile <= 6){
      var dir = tile-3
      var rot = (Math.PI/2)*dir
      var slopeShape = new CANNON.ConvexPolyhedron(slopeData[0], slopeData[1])
      var slopeBody = new CANNON.Body({mass: 0})
      slopeBody.addShape(slopeShape)
      slopeBody.position.set(gridPos.x, gridPos.y+(tileHeight/2), gridPos.z)
      slopeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), rot); //Match rotaion of geometry
      this.addPhysicsBody(slopeBody)
    }
  }
}

this.createSlope = function(width, height){
  var y2 = height/2
  var x2 = width/2
  var verts = [ new CANNON.Vec3(x2, -y2, -x2),
    new CANNON.Vec3(-x2, -y2, -x2),
    new CANNON.Vec3(-x2, -y2, x2),
    new CANNON.Vec3(x2, -y2, x2),
    new CANNON.Vec3(x2, y2, x2),
    new CANNON.Vec3(-x2, y2, x2)]
    var faces = [ [5, 4, 0],
    [0, 1, 5],
    [1, 0, 2],
    [3, 2, 0],
    [0, 4, 3],
    [1, 2, 5],
    [3, 4, 5],
    [3, 5, 2]]
    // return new CANNON.ConvexPolyhedron(verts, faces)
    return [verts, faces]
  }

  this.addPhysicsBody = function(body){
    cw.world.addBody(body)
  }

  this.removePhysicsBody = function(body){
    if(body){
      cw.world.remove(body)
    }
  }

  this.updatePhysics = function(){
    cw.world.step(dt)

    for(var i = 0; i < players.length; i++){
      var player = players[i]
      player.mesh.position.copy(player.body.position)
    }
    playerScene.updateMatrixWorld(true)
  }

  this.getRandomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  this.gameInit();
}

function Player(id, body, mesh, nickname) {
  var that = this

  this.defaultSensitivity = 0.008
  this.scopingSensitivity = 0.003

  this.PI_2 = Math.PI / 2;

  this.playerData = {
    health: 100,
    gun: {},
    score: 0,
    ammo: 0
  }

  this.playerData.lastShot = 0

  this.shootData = {
    hitPlayer: false,
    shotPlayer: [],
    shootBullet: false
  }

  this.velocityFactor = 5
  this.jumpVelocity = 10

  this.id = id
  this.nickname = nickname
  this.body = body
  this.mesh = mesh

  this.reloading = false

  this.velocity = body.velocity

  // var inputVelocity = new CANNON.Vec3();
  this.quat = new THREE.Quaternion();
  this.inputVelocity = new THREE.Vector3();
  this.euler = new THREE.Euler();

  this.canJump = true

  this.contactNormal = new CANNON.Vec3(); // Normal in the contact, pointing *out* of whatever the player touched
  this.upAxis = new CANNON.Vec3(0,1,0);

  var collide = function(e){
    var contact = e.contact;
    if(contact.bi.id == body.id){  // bi is the player body, flip the contact normal
      contact.ni.negate(that.contactNormal);
    }else{
      that.contactNormal.copy(contact.ni); // bi is something else. Keep the normal as it is
    }
    // If contactNormal.dot(upAxis) is between 0 and 1, we know that the contact normal is somewhat in the up direction.
    if(that.contactNormal.dot(that.upAxis) >= 0){ // Use a "good" threshold value between 0 and 1 here!
      that.canJump = true;
    }
  }

  body.addEventListener("collide", collide)
};

Player.prototype.setPosition = function(pos){
  position = pos
  body.position.set(pos);
}

Player.prototype.setGun = function(gun){
  this.playerData.gun = gun
  this.playerData.ammo = gun.maxAmmo
}

Player.prototype.hitByPlayer = function(hitBy, subtractHealth){
  this.playerData.health -= subtractHealth

  if(this.playerData.health <= 0){
    sendActualChatMessage({from: "server", msg: hitBy.nickname+" KILLED "+this.nickname})
    this.kill()
  }
}

Player.prototype.kill = function(){
  game.removePhysicsBody(this.body)
  playerScene.remove(this.mesh)

  players.splice(players.indexOf(this), 1);

  socket.sockets.connected[this.id].disconnect()//emit("remove player", {id: this.id});
}

Player.prototype.input = function(inputs, dt){
  dt *= 0.1;

  this.inputVelocity.set(0, 0, 0)

  this.velocity.x = 0
  this.velocity.z = 0

  //left right up down and jump
  if(inputs.forward){
    this.inputVelocity.z = -this.velocityFactor * dt;
  }

  if(inputs.backward){
    this.inputVelocity.z = this.velocityFactor * dt;
  }

  if(inputs.left){
    this.inputVelocity.x = -this.velocityFactor * dt;
  }

  if(inputs.right){
    this.inputVelocity.x = this.velocityFactor * dt;
  }

  if(inputs.jump){
    if(this.canJump == true){
      this.velocity.y = this.jumpVelocity
    }
    this.canJump = false
  }

  //set body rotation
  // lookPlayer.body.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), )
  var moveX = inputs.movementX
  var moveY = inputs.movementY
  var changeX = inputs.movementY * this.defaultSensitivity
  var changeY = inputs.movementX * this.defaultSensitivity

  // console.log("M "+moveX+" "+moveY+" C "+changeX+" "+changeY+" S "+this.defaultSensitivity)

  this.camRotation.x -= changeX
  this.camRotation.y -= changeY

  this.camRotation.x = Math.max( - this.PI_2, Math.min( this.PI_2, this.camRotation.x ) );

  this.euler.x = this.camRotation.x;
  this.euler.y = this.camRotation.y;
  this.euler.order = "XYZ";
  this.quat.setFromEuler(this.euler);
  this.inputVelocity.applyQuaternion(this.quat);

  this.velocity.x += this.inputVelocity.x
  this.velocity.z += this.inputVelocity.z



  if(inputs.shoot){
    var lastShotDelta = Date.now()-this.playerData.lastShot

    if(lastShotDelta > this.playerData.gun.shootSpeed){
      if(this.playerData.ammo > 0){
        this.playerData.ammo -= 1

        this.shootData.shootBullet = true

        //TODO Set near and far for gun ranges
        raycaster.set(this.body.position, inputs.camDir)
        var objects = getRemotePlayerObjects()
        var intersects = raycaster.intersectObjects(objects)

        if(intersects.length > 0){
          var shotPlayerMesh = intersects[0].object
          var shotPlayer = getRemotePlayerFromObject(shotPlayerMesh)

          if(shotPlayer){
            // console.log(shootingPlayer.nickname+" hit "+shotPlayer.nickname)
            sendActualChatMessage({from: "server", msg: shootingPlayer.nickname+" hit "+shotPlayer.nickname+"!"})
            this.playerData.score += 5

            this.shootData.hitPlayer = true
            this.shootData.shotPlayer = [shotPlayer.id]

            shotPlayer.hitByPlayer(shootingPlayer, shootingPlayer.playerData.gun.basicDamage)
          }
        }
      }
      this.playerData.lastShot = Date.now()
    }
  }




  // mesh.position.copy(body.position)
}

function Gun(id, name, maxAmmo, basicDamage, specialDamage, shootSpeed, scopeType, reloadSpeed){
  // this.id = id
  // this.name = name
  // this.maxAmmo = maxAmmo
  // this.basicDamage = basicDamage
  // this.specialDamage = specialDamage
  // this.shootSpeed = shootSpeed
  // this.scopeType = scopeType

  return {id: id, name: name, maxAmmo: maxAmmo, basicDamage: basicDamage, specialDamage: specialDamage, shootSpeed: shootSpeed, scopeType: scopeType, reloadSpeed: reloadSpeed}
}


function GunManager(){
  this.testGun = Gun(0, "Gun", 12, 5, {head: 1}, 100, 0, 500);
}

init();
setTimeout(loop, 1000);
