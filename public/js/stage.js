var cw = {} // Cannon World
var map;
var n;
// var models = {}
var worldSize;
var tileWidth;
var tileHeight;
var boundaryThickness;
var boundaryHeight;
var boundaryWhitespace;

var slopeData;

var stage = new THREE.Geometry()

function initMap(){
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

  cannonDebugRenderer = new THREE.CannonDebugRenderer(scene, cw.world);

  createStage()
};

function createStage(){

  var boundarySize = new CANNON.Vec3(worldSize*2+(boundaryWhitespace*2), boundaryHeight, boundaryThickness)

  var boundaryMeshGeo = new THREE.Geometry()

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

    addPhysicsBody(boundaryBody)


    var lineGeo = new THREE.Geometry()

    var v1 = new THREE.Vector3(-worldSize-boundaryWhitespace, 0, 0)
    var v2 = new THREE.Vector3(worldSize+boundaryWhitespace, 0, 0)

    lineGeo.vertices.push(v1)
    lineGeo.vertices.push(v2)
    lineGeo.applyMatrix( new THREE.Matrix4().makeRotationY( rotation ) );

    var mat = new THREE.LineBasicMaterial({color: 0x0000ff});
    var line = new THREE.Line(lineGeo, mat)
    line.position.set(xChange-(tileWidth/2), 0, zChange-(tileWidth/2))
    scene.add(line)
  }

  slopeData = createSlope(tileWidth, tileHeight)

  console.log("Layers: "+map.length)
  for(var l = 0; l < map.length; l++){
    for(var x = 0; x < n; x++){
      for(var y = 0; y < n; y++){

        if(map[l][x][y] > 0){
          createTile(x,y,l)
        }
      }
    }
  }

  var stageMesh = new THREE.Mesh(stage, houseMaterial)
  // stageMesh.castShadow = true
  // stageMesh.receiveShadow = true
  // stageMesh.shadowBias = -0.007
  scene.add(stageMesh)
}

var houseMaterial = new THREE.MeshLambertMaterial( { color: 0xdddddd} ); //TODO MeshBasicMaterial?

function createTile(x, y, l){
  var tile = map[l][x][y]
  var gridPos = new CANNON.Vec3(-((x-(n/2))*tileWidth), l*tileHeight, (y-(n/2))*tileWidth)

  if(tile){
    if(tile == 0){
      return
    }

    if(tile == 1){
      var tWidth = tileWidth
      var tHeight = tileHeight

      var halfExtents = new CANNON.Vec3(tWidth/2, tHeight/2, tWidth/2)
      var boxShape = new CANNON.Box(halfExtents)

      var boxBody = new CANNON.Body({mass: 0})
      boxBody.addShape(boxShape)
      boxBody.position.set(gridPos.x, gridPos.y+(tileHeight/2), gridPos.z)


      var boxGeometry = new THREE.BoxGeometry(tWidth, tHeight, tWidth);
      var boxMesh  = new THREE.Mesh(boxGeometry, houseMaterial)
      boxMesh.position.set(gridPos.x, gridPos.y+(tileHeight/2), gridPos.z)
      boxMesh.updateMatrix()
      stage.merge(boxMesh.geometry, boxMesh.matrix)

      addPhysicsBody(boxBody)
    }

    if(tile == 2){
      var size = new CANNON.Vec3(tileWidth, tileHeight/8, tileWidth)
      var halfExtents = new CANNON.Vec3(size.x/2, size.y/2, size.z/2)
      var boxShape = new CANNON.Box(halfExtents)

      var boxBody = new CANNON.Body({mass: 0})
      boxBody.addShape(boxShape)
      boxBody.position.set(gridPos.x, gridPos.y+(tileHeight-size.y/2), gridPos.z)

      var boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      var boxMesh  = new THREE.Mesh(boxGeometry, houseMaterial)
      boxMesh.position.set(gridPos.x, gridPos.y+(tileHeight-size.y/2), gridPos.z)
      boxMesh.updateMatrix()
      stage.merge(boxMesh.geometry, boxMesh.matrix)

      addPhysicsBody(boxBody)
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
      addPhysicsBody(slopeBody)

      var slopeGeo = createSlopeGeo(slopeData[0], slopeData[1])
      slopeGeo.applyMatrix( new THREE.Matrix4().makeRotationY( rot ) );
      var mesh = new THREE.Mesh(slopeGeo, houseMaterial)
      mesh.position.set(gridPos.x, gridPos.y+(tileHeight/2), gridPos.z)

      mesh.updateMatrix()
      stage.merge(mesh.geometry, mesh.matrix)
    }
  }
}

function createSlope(width, height){
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

function createSlopeGeo(verts, faces){
  var slope = new THREE.Geometry()

  for(var i = 0; i < verts.length; i++){
    slope.vertices.push(new THREE.Vector3(verts[i].x, verts[i].y, verts[i].z))
  }

  for(var i = 0; i < faces.length; i++){
    slope.faces.push(new THREE.Face3(faces[i][0], faces[i][1], faces[i][2]))
  }
  slope.computeFaceNormals()

  return slope
}


function addPhysicsBody(body){
  cw.world.addBody(body)
}

function updatePhysics(){
  cw.world.step(dt)
}
