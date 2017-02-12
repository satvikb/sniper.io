var worldSize = 50


function createStage(){
  var meshes = []
  var bodies = []

  var boundaryThickness = 10
  var boundaryHeight = 10
  var boundarySize = new CANNON.Vec3(worldSize-(boundaryThickness), boundaryHeight, boundaryThickness)

  for(var i = 0; i < 4; i++){
    var boundarySideShape = new CANNON.Box(boundarySize)
    var boundarySideGeometry = new THREE.BoxGeometry(boundarySize.x*2, boundarySize.y*2, boundarySize.z*2);
    var rotation = (- Math.PI / 2)*i
    boundarySideGeometry.applyMatrix( new THREE.Matrix4().makeRotationY( rotation ) );

    var material = new THREE.MeshLambertMaterial( { color: 0xdddddd} ); //TODO MeshBasicMaterial?

    var boundaryBody = new CANNON.Body({mass: 0})
    boundaryBody.addShape(boundarySideShape)
    // boundaryBody.wireframe
    boundaryBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), rotation); //Match rotaion of geometry
    var boundaryMesh  = new THREE.Mesh(boundarySideGeometry, material)

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
    boundaryMesh.position.set(xChange, 0, zChange)
    boundaryMesh.castShadow = false;

    meshes.push(boundaryMesh)
    bodies.push(boundaryBody)
  }

  var house = createRandomHouse()


  //Return array of bodies and meshes
  return [meshes, bodies]
}

function createRandomHouse(){

  function loadJSON(callback) {

      var xobj = new XMLHttpRequest();
      xobj.overrideMimeType("application/json");
      xobj.open('GET', '/assets/models/Obj.json', true); // Replace 'my_data' with the path to your file
      xobj.onreadystatechange = function () {
            if (xobj.readyState == 4 && xobj.status == "200") {
              // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
              callback(xobj.responseText);
            }else{
              // console.log("other "+xobj.status);
            }
      };
      xobj.send(null);
   }


   loadJSON(function(response) {
     // Parse JSON string into object
     var json = JSON.parse(response)
     var objs = json["objs"];
     var metadata = json["metadata"]
     var height = metadata[0]["totalHeight"]

     function vectorFromJSON(jsonVector){
       return new CANNON.Vec3(jsonVector["x"], jsonVector["y"], jsonVector["z"])
     }

     function quatFromJSON(jsonVector){
       return new THREE.Quaternion(jsonVector["x"], jsonVector["y"], jsonVector["z"], jsonVector["w"])
     }

     for(var i = 0; i < objs.length; i++){
       var obj = objs[i];
       var pos = vectorFromJSON(obj["pos"])
       var scale = vectorFromJSON(obj["scale"])
       var rot = quatFromJSON(obj["rot"])

       var boxShape = new CANNON.Box(scale)
       var boxGeometry = new THREE.BoxGeometry(scale.x*2, scale.y*2, scale.z*2);

       var material = new THREE.MeshLambertMaterial( { color: 0xdddddd} ); //TODO MeshBasicMaterial?

       var boxBody = new CANNON.Body({mass: 0})
       boxBody.addShape(boxShape)
       boxBody.quaternion.set(rot.x, rot.y, rot.z, rot.w) //Match rotaion of geometry
       var boxMesh  = new THREE.Mesh(boxGeometry, material)
       boxMesh.setRotationFromQuaternion(new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w))

       boxMesh.position.set(pos.x, pos.y+height, pos.z)
       boxBody.position.set(pos.x, pos.y+height, pos.z)

       scene.add(boxMesh)
       world.addBody(boxBody)
     }
    });

}
