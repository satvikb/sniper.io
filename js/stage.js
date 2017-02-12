var worldSize = 100


function createStage(){
  var meshes = []
  var bodies = []


  // var size = new CANNON.Vec3(1,1,1);
  // var boxShape = new CANNON.Box(size);
  // var boxGeometry = new THREE.BoxGeometry(size.x*2,size.y*2,size.z*2);
  // material = new THREE.MeshLambertMaterial( { color: 0xdddddd } );
  // for(var i=0; i<7; i++){
  //   var x = (Math.random()-0.5)*100;
  //   var y = 1 + (Math.random()-0.5)*1;
  //   var z = (Math.random()-0.5)*100;
  //   var boxBody = new CANNON.Body({ mass: 0 });
  //   boxBody.addShape(boxShape);
  //   var boxMesh = new THREE.Mesh( boxGeometry, material );
  //
  //   boxBody.position.set(x,y,z);
  //   boxMesh.position.set(x,y,z);
  //   boxMesh.castShadow = true;
  //   boxMesh.receiveShadow = true;
  //
  //   bodies.push(boxBody);
  //   meshes.push(boxMesh);
  // }


  var boundaryThickness = 10
  var boundarySize = new CANNON.Vec3(worldSize-(boundaryThickness), 10, boundaryThickness)

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
  var manager = new THREE.LoadingManager();
	manager.onProgress = function ( item, loaded, total ) {
		console.log( item, loaded, total );
	};

  var texture = new THREE.Texture();

  var onProgress = function ( xhr ) {
		if ( xhr.lengthComputable ) {
			// var percentComplete = xhr.loaded / xhr.total * 100;
			// console.log( Math.round(percentComplete, 2) + '% downloaded' );
		}
	};

	var onError = function ( xhr ) {
	};


  var loader = new THREE.ImageLoader( manager );
	loader.load( 'assets/textures/UV_Grid_Sm.jpg', function ( image ) {
		texture.image = image;
		texture.needsUpdate = true;
	} );

  var loader = new THREE.OBJLoader( manager );
	loader.load( 'assets/models/house.obj', function ( object ) {


		object.traverse( function ( child ) {
			if ( child instanceof THREE.Mesh ) {
				child.material.map = texture; // TODO: Fix not undating texture
        // child.material.needsUpdate = true;

        child.castShadow = true

        var shape = null;

        var geometry = child.geometry;
        if(geometry.boundingBox == undefined){
          geometry.computeBoundingBox();
        }
        var box = geometry.boundingBox;

        var size = new CANNON.Vec3((box.max.x - box.min.x)/2, (box.max.y - box.min.y)/2, (box.max.z - box.min.z)/2);
        var pos = new CANNON.Vec3(box.min.x+(size.x), box.min.y+(size.y), box.min.z+(size.z));

        // console.log("isBox")
        shape = new CANNON.Box(size);
        var body = new CANNON.Body({mass: 0})
        body.addShape(shape)
        body.position.copy(pos);
        body.quaternion.copy(child.quaternion);

        world.addBody(body);
			}
		} );
		object.position.y = 0;
		scene.add( object ); // TODO: Add to scene by adding to array of objects
    // mesh.push(object)
    // mesh = object
	}, onProgress, onError );
}
