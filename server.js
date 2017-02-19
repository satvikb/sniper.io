var express = require('express');
var path = require('path');
var app = express();
app.use(express.static(path.join(__dirname, 'public')));
var port = process.env.PORT || 8000;
var THREE = require('three');
var CANNON = require('cannon');

var server = require('http').createServer(app)
var fs = require('fs')

var util = require("util")
var socket = require("socket.io").listen(server, {origins:'sniper.satvik.co:*'})

var game;

function init() {
  players = [];
  game = new Game()

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

  client.on('mapData', function(){
    this.emit('mapData', {map: game.getMap(), world: game.getWorldData()})
  })
};

function onClientDisconnect() {
  util.log("Player has disconnected: "+this.id);

  var removePlayer = playerById(this.id);

  if (!removePlayer) {
    util.log("(disconnect) Player not found: "+this.id);
    return;
  };

  game.removePhysicsBody(removePlayer.getBody())
  players.splice(players.indexOf(removePlayer), 1);
  this.broadcast.emit("remove player", {id: this.id});
};

function onNewPlayer(data) {
  var mass = 50, radius = 0.8, playerHeight = 2;

  var size = new CANNON.Vec3(radius/2, radius, radius/2)
  // var bodyShape = new CANNON.Box(size)
  var bodyShape = new CANNON.Sphere(radius)
  var body = new CANNON.Body({ mass: mass,
    angularFactor: new CANNON.Vec3(0, 1, 0)
  });
  body.linearDamping = 0.9;
  body.position.set(1, 3, 0)

  body.angularDamping = 0.5
  body.updateMassProperties();

  var newPlayer = new Player(this.id, body);

  newPlayer.getBody().addShape(bodyShape);
  game.addPhysicsBody(newPlayer.getBody())

  this.broadcast.emit("new player", {id: newPlayer.getId(), pos: newPlayer.position});

  var i, existingPlayer;
  for (i = 0; i < players.length; i++) {
    existingPlayer = players[i];
    this.emit("new player", {id: existingPlayer.getId(), x: existingPlayer.getX(), y: existingPlayer.getY(), z: existingPlayer.getZ()});
  };

  players.push(newPlayer);
};

function onHitPlayer(data){
  var hitPlayer = playerById(data.id)

  if(!hitPlayer){
    console.log("(hit) player not found: "+data.id)
  }

  // TODO: Affect health here and anything else when hit by a bullet, and give data

  this.broadcast.emit("hit player", {id: hitPlayer.getId()})
}

function onMovePlayer(data) {
  // console.log("move: "+data.id)
  var movePlayer = playerById(data.id);

  if (!movePlayer) {
    console.log("(move) Player not found: "+data.id);
    return;
  };

  movePlayer.move(data.inputs, delta)

  sendUpdate()
};

function sendUpdate(){
  function getUpdateData(){
    var updateData = []
    for(var i = 0; i < players.length; i++){
      var plData = {}
      plData.id = players[i].getId()

      plData.position = players[i].getPos()
      plData.quat = players[i].getQuat()
      updateData.push(plData)
    }
    return updateData;
  }
  socket.sockets.emit('updatePlayers', {data: getUpdateData()})
}

function playerById(id) {
  var i;
  for (i = 0; i < players.length; i++) {
    if (players[i].getId() == id)
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

  time = Date.now()

  setTimeout(loop, 1000/60);
}

function Game(){
  var map = []
  var models = {}
  var cw = {} // Cannon World
  var dt = 1/60;
  var n = 8

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

    cw.world.gravity.set(0,-20,0);
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

  var worldSize = 35
  var boundaryWhitespace = 10
  var boundaryThickness = 1
  var boundaryHeight = 20

  var tileWidth;
  var tileHeight;

  var slopeData;

  this.createStage = function(){
    this.createMap(n)

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

    slopeData = this.createSlope(tileWidth, tileHeight)

    for(var l = 0; l < map.length; l++){
      for(var x = 0; x < n; x++){
        for(var y = 0; y < n; y++){
          //Create physics bodies
          // if(map[i] > 0){
          //   this.createHouse(map[i]-1, i)
          // }
          if(map[l][x][y] > 0){
            this.createTile(x,y,l)
          }
        }
      }
    }
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
          [1, 0, 0, 2, 0, 1, 0, 2, 0, 3, 2],
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

  console.log("created map ("+n+")")

}

this.getMap = function(){
  return map
}

this.getWorldData = function(){
  return {worldSize: worldSize, n: n, tileWidth, tileWidth, tileHeight: tileHeight, boundaryThickness: boundaryThickness, boundaryHeight: boundaryHeight, boundaryWhitespace: boundaryWhitespace}
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
    var faces = [ [0, 5, 4],
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

  // this.createHouse = function(num, gridTile){
  //
  //   var response = models[num]
  //   // Parse JSON string into object
  //   var json = JSON.parse(response)
  //   var objs = json["objs"];
  //   var metadata = json["metadata"]
  //   var height = metadata[0]["totalHeight"]
  //   var width = metadata[0]["totalWidth"]
  //
  //   // var newScale = tileWidth/width
  //   var gridPos = new CANNON.Vec3(((gridTile%n)-(n/2))*tileWidth, 0, ((gridTile/n)-(n/2))*tileWidth)
  //
  //   function vectorFromJSON(jsonVector){
  //     return new CANNON.Vec3(jsonVector["x"], jsonVector["y"], jsonVector["z"])
  //   }
  //
  //   function quatFromJSON(jsonVector){
  //     return new THREE.Quaternion(jsonVector["x"], jsonVector["y"], jsonVector["z"], jsonVector["w"])
  //   }
  //
  //   function divideVector(vec, by){
  //     return new CANNON.Vec3(vec.x/by, vec.y/by, vec.z/by)
  //   }
  //
  //   var house = new THREE.Geometry()
  //
  //   for(var i = 0; i < objs.length; i++){
  //     var obj = objs[i];
  //     var pos = divideVector(vectorFromJSON(obj["pos"]), 2)
  //     var scale = vectorFromJSON(obj["scale"])
  //     var rot = quatFromJSON(obj["rot"])
  //
  //     // scale.x = scale.x*newScale
  //     // scale.y = scale.y*newScale
  //     // scale.z = scale.z*newScale
  //     // pos.x = pos.x*newScale
  //     // pos.y = pos.y*newScale
  //     // pos.z = pos.z*newScale
  //
  //     var halfExtents = new CANNON.Vec3(scale.x/2, scale.y/2, scale.z/2)
  //     var boxShape = new CANNON.Box(halfExtents)
  //
  //     var boxBody = new CANNON.Body({mass: 0})
  //     boxBody.addShape(boxShape)
  //
  //     var heightOffset = (height/2)//*newScale
  //     boxBody.quaternion.set(rot.x, rot.y, rot.z, rot.w)
  //     // boxBody.position.set(gridPos.x+(pos.x/2), (pos.y/2)+height, gridPos.z+(pos.z/2))
  //     boxBody.position.set(gridPos.x+pos.x, pos.y+heightOffset, gridPos.z+pos.z)
  //
  //     this.addPhysicsBody(boxBody)
  //   }
  // }

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
  }

  this.getRandomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  this.gameInit();
}

var velocityFactor = 5
var jumpVelocity = 10

var Player = function(id, body) {
  var position = new CANNON.Vec3();
  var quaternion = new CANNON.Quaternion();
  var velocity = body.velocity

  // var inputVelocity = new CANNON.Vec3();
  var quat = new THREE.Quaternion();
  var inputVelocity = new THREE.Vector3();
  var euler = new THREE.Euler();

  var canJump = true

  //use sparingly
  this.setPosition = function(pos){
    position = pos
    body.position.set(pos);
  }

  this.updatePosition = function(){
    position.copy(body.position)
  }

  this.move = function(inputs, dt){
    dt *= 0.1;

    inputVelocity.set(0, 0, 0)

    velocity.x = 0
    velocity.z = 0

    //left right up down and jump
    if(inputs.forward){
      inputVelocity.z = -velocityFactor * dt;
    }

    if(inputs.backward){
      inputVelocity.z = velocityFactor * dt;
    }

    if(inputs.left){
      inputVelocity.x = -velocityFactor * dt;
    }

    if(inputs.right){
      inputVelocity.x = velocityFactor * dt;
    }

    if(inputs.jump){
      if(canJump == true){
        velocity.y = jumpVelocity
      }
      canJump = false
    }

    euler.x = inputs.rotX;
    euler.y = inputs.rotY;
    euler.order = "XYZ";
    quat.setFromEuler(euler);
    inputVelocity.applyQuaternion(quat);

    velocity.x += inputVelocity.x
    velocity.z += inputVelocity.z
  }

  var contactNormal = new CANNON.Vec3(); // Normal in the contact, pointing *out* of whatever the player touched
  var upAxis = new CANNON.Vec3(0,1,0);

  body.addEventListener("collide", function(e){
    var contact = e.contact;

    if(contact.bi.id == body.id){  // bi is the player body, flip the contact normal
      contact.ni.negate(contactNormal);
    }else{
      contactNormal.copy(contact.ni); // bi is something else. Keep the normal as it is
    }
    // If contactNormal.dot(upAxis) is between 0 and 1, we know that the contact normal is somewhat in the up direction.
    // if(contactNormal.dot(upAxis) > 0){ // Use a "good" threshold value between 0 and 1 here!
    canJump = true;
    // }
  })

  this.getId = function(){
    return id
  }

  this.getBody = function(){
    return body
  }


  this.getX = function() {
    return body.position.x;
  };

  this.getY = function() {
    return body.position.y;
  };

  this.getZ = function(){
    return body.position.z;
  };

  this.getPos = function(){
    this.updatePosition()
    return position
  }

  this.getQuat = function(){
    return body.quaternion
  }
};

init();
setTimeout(loop, 2000);
