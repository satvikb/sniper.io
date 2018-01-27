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

var terrainHeight;
var terrainScale;

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
  cw.world.gravity.set(0,-30,0);
  cw.world.broadphase = new CANNON.NaiveBroadphase();

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

  // Create the heightfield
  var sizeX = map[0].length
  var sizeY = map[1].length;
  var hfShape = new CANNON.Heightfield(map, {
      elementSize: terrainScale
  });
  var hfBody = new CANNON.Body({ mass: 0 });
  hfBody.addShape(hfShape);
  hfBody.position.set((-sizeX * hfShape.elementSize) / 2, 0, (sizeY * hfShape.elementSize) / 2);
  hfBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), (-Math.PI/2))
  addPhysicsBody(hfBody);




  var geometry = new THREE.Geometry();

  var v0 = new CANNON.Vec3();
  var v1 = new CANNON.Vec3();
  var v2 = new CANNON.Vec3();

  console.log("Terrain Height: "+terrainHeight)

  for (var xi = 0; xi < hfShape.data.length - 1; xi++) {
    for (var yi = 0; yi < hfShape.data[xi].length - 1; yi++) {
      for (var k = 0; k < 2; k++) {
        var colA = new THREE.Color("rgb(139, 69, 19)")
        var colB = new THREE.Color(1, 1, 1)
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
        face.vertexColors[0] = lerpColor(colA, colB, v0.z/terrainHeight)
        face.vertexColors[1] = lerpColor(colA, colB, v1.z/terrainHeight)
        face.vertexColors[2] = lerpColor(colA, colB, v2.z/terrainHeight)

        geometry.faces.push(face);
      }
    }
  }

  geometry.computeBoundingSphere();
  geometry.computeFaceNormals();
  var material = new THREE.MeshLambertMaterial({vertexColors: THREE.VertexColors});
  mesh = new THREE.Mesh(geometry, material);
  mesh.quaternion.copy(hfBody.quaternion)
  mesh.position.copy(hfBody.position)
  scene.add(mesh)

  loadedStage()
}

function lerpColor(a, b, t){
  return new THREE.Color(
    a.r + (b.r - a.r) * t,
		a.g + (b.g - a.g) * t,
		a.b + (b.b - a.b) * t
  )
}

function addPhysicsBody(body){
  cw.world.addBody(body)
}

function updatePhysics(){
  cw.world.step(dt)
}
