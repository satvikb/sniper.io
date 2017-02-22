var container;
var canvas;
var overlay = null;
var scopingOverlay = null, scopingContext;
var crosshairOverlay = null, crosshairContext;
var weaponOverlay = null, weaponContext;
var weapon = new Bitmap('assets/GunSmall.png', 16, 10);

var stats = new Stats();

function Bitmap(src, width, height) {
  this.image = new Image();
  this.image.src = src;
  this.width = width;
  this.height = height;
}

function initHUD(){
  container = document.createElement('div')
  container.id = "container"
  document.body.appendChild(container);

  canvas = document.createElement('canvas')
  canvas.id = "canvas"
  container.appendChild(canvas)


  if(!overlay){
    overlay = createOverlay(canvas)
  }

  createChatElement()

  stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild( stats.dom );
}

function createOverlay(mainCanvas){
  var overlayCanvas = document.createElement('canvas');
  overlayCanvas.style.zIndex="1000";
  overlayCanvas.style.position = 'absolute';
  overlayCanvas.style.left = '0px';
  overlayCanvas.style.top = '0px';
  overlayCanvas.id = "overlay"
  overlayCanvas.width = mainCanvas.width;
  overlayCanvas.height = mainCanvas.height;

  latencyEle = document.createElement('p')
  latencyEle.id = "latency"
  container.appendChild(latencyEle)

  weaponOverlay = document.createElement('canvas')
  weaponOverlay.id = "weaponOverlay"
  // weaponOverlay.width = window.innerWidth
  // weaponOverlay.height = window.innerHeight
  weaponOverlay.style.zIndex = "1001"
  weaponOverlay.style.position = 'absolute';
  weaponOverlay.style.right = '0px';
  weaponOverlay.style.bottom = '0px';


  weaponContext = weaponOverlay.getContext('2d')
  // weaponContext.imageSmoothingEnabled = false
  // weaponContext.transform(0.65,0.5,0,1,85,0);


  //scoping overlay
  scopingOverlay = document.createElement('canvas')
  scopingOverlay.style.zIndex="1002";//above weapon
  scopingOverlay.style.position = 'absolute';
  scopingOverlay.style.left = '0px';
  scopingOverlay.style.top = '0px';
  scopingOverlay.id = "scopingOverlay"
  scopingOverlay.width = window.innerWidth;
  scopingOverlay.height = window.innerHeight;
  scopingOverlay.style.display = 'none';

  scopingContext = scopingOverlay.getContext('2d')

  crosshairOverlay = document.createElement('canvas')
  crosshairOverlay.style.zIndex="2000";//above all else
  crosshairOverlay.style.position = 'absolute';
  crosshairOverlay.style.left = '0px';
  crosshairOverlay.style.top = '0px';
  crosshairOverlay.id = "crosshairOverlay"
  crosshairOverlay.width = window.innerWidth;
  crosshairOverlay.height = window.innerHeight;
  crosshairOverlay.style.display = '';

  crosshairContext = crosshairOverlay.getContext('2d')

  container.appendChild(weaponOverlay)
  container.appendChild(overlayCanvas);
  container.appendChild(scopingOverlay);
  container.appendChild(crosshairOverlay);
  return overlayCanvas;
}

// var innerWidth;
// var innerHeight;
var oldWidth = 0
var oldHeight = 0

function drawOverlay() {
  var context = overlay.getContext('2d');
  context.clearRect(0, 0, overlay.width, overlay.height);
  var x = 10;
  var y = 20;
  context.font = "12pt Calibri";
  context.fillStyle = "#0000ff"; // text color
  context.fillText("alpha v0.1", x, y);

  if(window.innerWidth != oldWidth || window.innerHeight != oldHeight){
    weaponOverlay.width = 0.234375 * window.innerWidth
    weaponOverlay.height = 0.1875 * window.innerHeight
    weaponContext.imageSmoothingEnabled = false
    weaponContext.transform(0.65,0.5,0,1,85,0);

    scopingOverlay.width = window.innerWidth
    scopingOverlay.height = window.innerHeight

    oldWidth = window.innerWidth
    oldHeight = window.innerHeight
  }

  // weaponContext.clearRect(0, 0, weaponOverlay.width, weaponOverlay.height);
  // var scale = new THREE.Vector2(weaponOverlay.width/weapon.width, weaponOverlay.height/weapon.height)
  // var left = overlay.width * 0.66;
  // var top = overlay.height * 0.6;
  // weaponContext.drawImage(weapon.image, 0, 0, weapon.width*scale.x, weapon.height * scale.y);

  var isScoping = controls.isScoping()
  var scopingContextWidth = scopingOverlay.width
  var scopingContextHeight = scopingOverlay.height

  var centerX = scopingContextWidth/2, centerY = scopingContextHeight/2
  var radius = scopingContextHeight/4//((scopingContextWidth)/(scopingContextHeight))*75
  var crosshairadius = ((scopingContextWidth)/(scopingContextHeight))*5

  if(isScoping){
    scopingContext.save()
    scopingContext.fillStyle = 'rgba(0, 0, 0, 1)';
    scopingContext.fillRect(0, 0, scopingContextWidth, scopingContextHeight)

    // Set global composite operation to destination-out
    scopingContext.globalCompositeOperation = 'destination-out';

    // Draw circle
    scopingContext.strokeStyle = "#FFFFFF";


    scopingContext.beginPath();
    scopingContext.arc(centerX, centerY, radius, 0, Math.PI*2, false);
    scopingContext.fill();
  }

  crosshairOverlay.width = window.innerWidth
  crosshairOverlay.height = window.innerHeight

  crosshairContext.save()
  crosshairContext.clearRect(0, 0, crosshairOverlay.width, crosshairOverlay.height);//clearRect(centerX - radius, centerY - radius, centerX + radius, centerY + radius)
  crosshairContext.beginPath()
  if(isScoping == true){
    crosshairContext.moveTo(centerX - radius, centerY)
    crosshairContext.lineTo(centerX + radius, centerY)
    crosshairContext.moveTo(centerX, centerY - radius)
    crosshairContext.lineTo(centerX, centerY + radius)
    crosshairContext.lineWidth = 2
    crosshairContext.stroke();
  }else if(isScoping == false){
    crosshairContext.moveTo(centerX - crosshairadius, centerY)
    crosshairContext.lineTo(centerX + crosshairadius, centerY)
    crosshairContext.moveTo(centerX, centerY - crosshairadius)
    crosshairContext.lineTo(centerX, centerY + crosshairadius)

    crosshairContext.lineWidth = 2
    crosshairContext.stroke();
  }


  context.restore();
  weaponContext.restore();
  scopingContext.restore();
  crosshairContext.restore();
}

function onWindowResize(e) {
  // scopingOverlay.width = e.target.outerWidth
  // scopingOverlay.height = e.target.outerHeight
  // innerWidth = window.innerWidth
  // innerHeight = window.innerHeight

  // console.log("resize "+window.innerWidth+" "+window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight;
  spectateCamera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();
  spectateCamera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );
}
