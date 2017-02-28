var sphereShape, sphereBody//, physicsMaterial;
var cannonDebugRenderer;
var spectateCamera;
var camera, scene, renderer, raycaster;
var geometry, mesh;
// var width, height;

var controls,time = Date.now();
var blocker = document.getElementById( 'blocker' );

var dt = 1/60;

function init() {

  initPointerLock();
  initHUD();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x00bfff)
  var ambient = new THREE.AmbientLight( 0x404040, 1 );
  scene.add( ambient );

  spectateCamera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
  spectateCamera.position.set(50, 60, -50)
  spectateCamera.lookAt(new THREE.Vector3(0, 0, 0))
  scene.add(spectateCamera)

  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.001, 1000 );

  var hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
  hemiLight.color.setHSL( 0.6, 1, 0.6 );
  hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
  hemiLight.position.set( 0, 500, 0 );
  scene.add( hemiLight );

  var dirLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
  dirLight.position.set( -135, 146, 50 );
  dirLight.name = "dirlight";
  dirLight.target.position.set(0, 0, 0)

  // var shadowHelper = new THREE.CameraHelper( dirLight.shadow.camera );
  // scene.add(shadowHelper);

  var d = 200;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  scene.add( dirLight );

  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = dirLight.shadow.mapSize.height = 1024*2;
  dirLight.shadow.bias = -0.0007;

  // var helper = new THREE.DirectionalLightHelper( dirLight );
  // scene.add(helper);

  // scene.add(new THREE.Mesh(gunTest, new THREE.MeshBasicMaterial({})))
  // scene.add(gunTest)

  // floor
  geometry = new THREE.PlaneGeometry( 100, 100, 10, 10);
  geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) );
  mesh = new THREE.Mesh( geometry, floorMaterial );
  mesh.receiveShadow = true;
  scene.add( mesh );

  raycaster = new THREE.Raycaster()

  renderer = new THREE.WebGLRenderer({canvas: canvas});
  renderer.shadowMap.enabled = true;
  renderer.shadowMapSoft = true;

  renderer.setSize( window.innerWidth, window.innerHeight );

  var axisHelper = new THREE.AxisHelper( 7 );
  scene.add( axisHelper );

  window.addEventListener( 'resize', onWindowResize, false );

  remotePlayers = [];

  socket = io.connect("http://sniper.satvik.co")
  setSocketEventHandlers()
}

function initPointerLock(){
  var element = document.body

  element.requestPointerLock = element.requestPointerLock ||
                              element.mozRequestPointerLock;

  document.exitPointerLock = document.exitPointerLock ||
                             document.mozExitPointerLock;

  element.onclick = function() {
    if(inGame){
      if(chatting == false){
        element.requestPointerLock();
      }else{
        chatting = false
        chatField.style.display = "none"
        element.requestPointerLock()
      }
    }
  };

  // Hook pointer lock state change events for different browsers
  document.addEventListener('pointerlockchange', lockChangeAlert, false);
  document.addEventListener('mozpointerlockchange', lockChangeAlert, false);


  function lockChangeAlert() {
    if(inGame){
      if (document.pointerLockElement === element ||
          document.mozPointerLockElement === element) {
        // console.log('The pointer lock status is now locked');
        controls.enabled = true
        blocker.style.display = 'none';
        // document.addEventListener("mousemove", controls.onMouseMove, false);
      } else {
        // console.log('The pointer lock status is now unlocked');
        controls.enabled = false
        blocker.style.display = '-webkit-box';
        blocker.style.display = '-moz-box';
        blocker.style.display = 'box';
        // document.removeEventListener("mousemove", controls.onMouseMove, false);
      }
    }
  }
}

var angle = 0

function animate() {
  if(loaded){
    stats.begin()

    if(inGame){
      var dt = Date.now() - time
      controls.update( dt );

      var inputs = controls.inputs()

      //TODO Test if mouse moved
      // if(inputs.left || inputs.right || inputs.forward || inputs.backward || inputs.jump){
        socket.emit("move player", {id: socket.id, inputs: inputs});
      // }


      // testLatency();

      updateBullets();

      renderer.render( scene, camera );
      drawOverlay()
    }else{
      spectateCamera.position.x = 50*Math.cos(angle)
      spectateCamera.position.z = 50*Math.sin(angle)
      angle += 0.002
      spectateCamera.lookAt(new THREE.Vector3(0, 0, 0))

      renderer.render( scene, spectateCamera );
    }

    if(cannonDebugRenderer)
      // cannonDebugRenderer.update()

    stats.end()
    time = Date.now();

    requestAnimationFrame( animate );
  }
}
