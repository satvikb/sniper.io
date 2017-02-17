// var THREE = require('three');
var CANNON = require('cannon');
// var Player = require("./player").player;
var fs = require('fs')

var game = function(){
  var map = {}
  var models = {}
  var cw = {} // Cannon World
  var dt = 1/60;
  var n = 3

  var test = function(){
    return true
  }

  function init() {
    cw.world = new CANNON.World();
    cw.world.quatNormalizeSkip = 0;
    cw.world.quatNormalizeFast = false;

    var solver = new CANNON.GSSolver();
    cw.world.defaultContactMaterial.contactEquationStiffness = 1e9;
    cw.world.defaultContactMaterial.contactEquationRelaxation = 4;
    solver.iterations = 7;
    solver.tolerance = 0.1;
    var split = true;
    if(split)
      cw.world.solver = new CANNON.SplitSolver(solver);
    else
      cw.world.solver = solver;
    cw.world.gravity.set(0,-20,0);
    cw.world.broadphase = new CANNON.NaiveBroadphase();
    // Create a slippery material (friction coefficient = 0.0)
    physicsMaterial = new CANNON.Material("slipperyMaterial");
    var physicsContactMaterial = new CANNON.ContactMaterial(physicsMaterial, physicsMaterial, 0.0, 0.3);
    // We must add the contact materials to the world
    cw.world.addContactMaterial(physicsContactMaterial);

    //Ground plane
    var groundShape = new CANNON.Plane(); //inf size
    var groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    addPhysicsBody(groundBody);

    createStage()
  };

  var worldSize = 50

  function createStage(){
    var bodies = []

    var boundaryThickness = 10
    var boundaryHeight = 10
    var boundarySize = new CANNON.Vec3(worldSize-(boundaryThickness), boundaryHeight, boundaryThickness)

    for(var i = 0; i < 4; i++){
      var boundarySideShape = new CANNON.Box(boundarySize)
      var rotation = (- Math.PI / 2)*i

      var boundaryBody = new CANNON.Body({mass: 0})
      boundaryBody.addShape(boundarySideShape)
      // boundaryBody.wireframe
      boundaryBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), rotation); //Match rotaion of geometry

      // var zSign =
      var zChange = 0
      var xChange = 0

      switch (i) {
        case 0:
        zChange = -worldSize
        xChange = 0
        break;
        case 1:
        zChange = 0
        xChange = -worldSize
        break;
        case 2:
        zChange = worldSize
        xChange = 0
        break;
        case 3:
        zChange = 0
        xChange = worldSize
        break;
        default:

      }

      boundaryBody.position.set(xChange, 0, zChange)

      bodies.push(boundaryBody)
    }


    loadModels()

    createMap(n)

    for(var i = 0; i < n*n; i++){
      //Create physics bodies
      if(map[i] > 0){
        createHouse(map[i]-1)
      }
    }
  }


  function loadModels(){
    var numModels = 1
    for(var m = 0; m < numModels; m++){
      models[m] = fs.readFileSync("public/assets/models/house"+m+".json")
      // console.log("m "+m+" "+models[m])
    }
  }

  function createMap(n){
    for(var i = 0; i < n*n; i++){
        map[i] = getRandomInt(0, 1)
    }
  }

  function createHouse(num){

     var response = models[num]
    //  console.log("house res: "+response)
     // Parse JSON string into object
     var json = JSON.parse(response)
     var objs = json["objs"];
     var metadata = json["metadata"]
     var height = metadata[0]["totalHeight"]

     function vectorFromJSON(jsonVector){
       return new CANNON.Vec3(jsonVector["x"], jsonVector["y"], jsonVector["z"])
     }

     function quatFromJSON(jsonVector){
       return new CANNON.Quaternion(jsonVector["x"], jsonVector["y"], jsonVector["z"], jsonVector["w"])
     }

     for(var i = 0; i < objs.length; i++){
       var obj = objs[i];
       var pos = vectorFromJSON(obj["pos"])
       var scale = vectorFromJSON(obj["scale"])
       var rot = quatFromJSON(obj["rot"])

       var boxShape = new CANNON.Box(scale)

       var boxBody = new CANNON.Body({mass: 0})
       boxBody.addShape(boxShape)
       boxBody.quaternion.set(rot.x, rot.y, rot.z, rot.w) //Match rotaion of geometry
       boxBody.position.set(pos.x, pos.y+height, pos.z)

       cw.world.addBody(boxBody)
     }
  }

  function addPhysicsBody(body){
    cw.world.addBody(body)
  }

  function updatePhysics(){
    cw.world.step(dt)
  }

  function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  init();
}

exports.game = game
