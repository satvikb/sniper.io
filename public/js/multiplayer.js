var socket;
var remotePlayers;
var localPlayer;

var inGame = false
var gameId = 0

function setSocketEventHandlers(){
  socket.on("connect", onSocketConnected);
  socket.on("joinGame", onJoinGame)
  socket.on("disconnect", onSocketDisconnect);
  socket.on("connectData", onConnectData);
  // socket.on("latency", latency);

  socket.on("new player", onNewPlayer);
  socket.on("updatePlayers", onUpdatePlayers);
  socket.on("hit player", onHitPlayer);
  socket.on("remove player", onRemovePlayer);

  socket.on("look player", onLookPlayer)

  socket.on("chatMessage", chatMessage)
}

// var latency;
//
// function testLatency(){
//   latency = Date.now()
//   socket.emit("latency")
// }
//
// function latency(data){
//   var time = Date.now()
//   latency = time-latency
//   // console.log("Latency: "+latency+"ms "+data.time-Date.now()+"ms")
//   document.getElementById("latency").innerHTML = latency+"ms"
// }

function onConnectData(data){
  console.log("Latency: "+(Date.now()-latency)+"ms")
  worldSize = data.world.worldSize
  n = data.world.n
  tileWidth = data.world.tileWidth
  tileHeight = data.world.tileHeight
  boundaryHeight = data.world.boundaryHeight
  boundaryThickness = data.world.boundaryThickness
  boundaryWhitespace = data.world.boundaryWhitespace

  map = data.map

  initMap()
}


var radius = 0.8, playerHeight = 2;
var ballGeometry = new THREE.SphereGeometry(radius, 16, 16);

function onNewPlayer(data) {
  console.log("New player "+data.id+" "+data.nickname)

  if(data.id != socket.id){
    var bodyShape = new CANNON.Sphere(radius)
    var body = new CANNON.Body({ mass: data.mass, angularFactor: new CANNON.Vec3(0, 1, 0)});
    body.linearDamping = 0.6;
    body.angularDamping = 0.5
    body.updateMassProperties();

    // var shape = new THREE.BoxGeometry(bodyShape.radius, 32, 32);
    var mesh = new THREE.Mesh( ballGeometry, shaderMaterial)//new THREE.MeshLambertMaterial({color: 0xffffff}) );

    var nameTag = makeTextLabelSprite(data.nickname);
  	nameTag.position.set(data.x, data.y+radius*1.25, data.z);

    var newPlayer = new RemotePlayer(body, mesh, nameTag)
    newPlayer.id = data.id
    newPlayer.nickname = data.nickname

    newPlayer.setPos(new CANNON.Vec3(data.x, data.y, data.z))

    newPlayer.body.addShape(bodyShape);
    addPhysicsBody(newPlayer.body);
    scene.add(newPlayer.mesh)
    scene.add(newPlayer.nameTag);
    remotePlayers.push(newPlayer)
  }
};

function onLookPlayer(data){
  // var rot = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w))
  controls.updateRotation(data)
}

function makeTextLabelSprite( message, parameters ) {
  var canvas = document.createElement('canvas')
  // canvas.width
  var width = 300
  var height = 50
  // var fontSize = 100
  var context = canvas.getContext('2d')
  context.font = "Bold "+height+"px Arial"
  context.fillStyle = "rgba(30, 30, 30, 0.5)"
  context.fillRect(0, 0, width, height)
  context.fillStyle = "rgba(255, 255, 255, 0.5)"
  var textWidth = context.measureText(message)
  // console.log("textWidth "+textWidth)
  context.fillText(message, width/2-textWidth.width, height*0.875)

  var texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;

  var material = new THREE.SpriteMaterial( { map: texture, side: THREE.DoubleSide } );
  material.transparent = true;

  var sprite = new THREE.Sprite(material)
  return sprite
}

function onUpdatePlayers(data){
  if(inGame){
    var playerData = data.data
    for(var p = 0; p < playerData.length; p++){
      var id = playerData[p].id
      var player = playerById(id)

      if(!player && id != socket.id){
        return
      }

      var position = playerData[p].position
      var quat = playerData[p].quat

      if(socket.id == id){
        localPlayer.setPos(position)
        localPlayer.setQuat(quat)
      }else{
        player.setPos(position)
        player.setQuat(quat)
        if(player.nameTag) player.nameTag.position.set(position.x, position.y+radius*1.25, position.z)
      }
    }
  }
}

function onSocketConnected() {
  // console.log("Connected to socket server "+socket.id);
  latency = Date.now()
  socket.emit("connectData")
  // socket.emit("new player", {id: socket.id});
};

function onSocketDisconnect() {
  // console.log("Disconnected from socket server");
};

function onJoinGame(data){
  inGame = true
  gameId = data.gameId

  socket.emit("new player", {id: socket.id, nickname: data.nickname});

  var sphereShape = new CANNON.Sphere(radius)
  var sphereBody = new CANNON.Body({ mass: data.mass, angularFactor: new CANNON.Vec3(0, 1, 0)});

  sphereBody.addShape(sphereShape);
  sphereBody.position.set(0,6,0);
  sphereBody.linearDamping = 0.6;
  sphereBody.angularDamping = 0.5


  var mesh = new THREE.Mesh( ballGeometry, new THREE.MeshLambertMaterial({color: 0xffffff}) );

  localPlayer = new RemotePlayer(sphereBody, mesh)
  localPlayer.nickname = data.nickname

  controls = new PointerLockControls( camera , sphereBody );

  controls.oldPos = new THREE.Vector3().copy(controls.getObject().position)
  scene.add( controls.getObject() );
  addPhysicsBody(sphereBody)
}

function onHitPlayer(data){
  var hitPlayer = playerById(data.players[0])

  if(!hitPlayer && socket.id != data.id){
    console.log("(hit) player not found: "+data.id)
  }
}

function onRemovePlayer(data) {
  var removePlayer = playerById(data.id);

  if (!removePlayer) {
    console.log("Player not found: "+data.id);
    return;
  };

  scene.remove(removePlayer.mesh)
  scene.remove(removePlayer.nameTag)
  cw.world.remove(removePlayer.body)

  remotePlayers.splice(remotePlayers.indexOf(removePlayer), 1);
};

function playerById(id) {
  var i;
  for (i = 0; i < remotePlayers.length; i++) {
    if (remotePlayers[i].id == id)
    return remotePlayers[i];
  };

  return false;
};
