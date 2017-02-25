var loaded = false

var progress = document.createElement('div');
progress.id = "progress"


var progressBar = document.createElement('div');
progressBar.id = "progressBar"

var text = document.createElement('p')
text.innerHTML = "loading files"
text.id = "progressText"
progress.appendChild(text);

progress.appendChild(progressBar);

document.body.appendChild(progress);

var manager = new THREE.LoadingManager();
var texLoader = new THREE.TextureLoader(manager);
var fileLoader = new THREE.FileLoader(manager);


manager.onProgress = function ( item, loaded, total ) {
  progressBar.style.width = (loaded / total * 100) + '%';
  // console.log( 'Loading file: ' + item + '.\nLoaded ' + loaded + ' of ' + total + ' files.' );
};

manager.onLoad = function(){
  // console.log("Loaded all files")

  init();
  text.innerHTML = "loading stage"
}

function loadedStage(){
  // console.log("Loaded, showing view")
  loaded = true
  animate();
  createLobbyScreen();

  document.body.removeChild(document.getElementById("progress"))
}

texLoader.load("http://sniper.satvik.co/assets/textures/test.jpg", function (texture){
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  cubeMaterial = new THREE.MeshLambertMaterial( { map: texture } );
})


texLoader.load('http://sniper.satvik.co/assets/textures/floor.jpg', function ( texture ) {
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.repeat.set(10, 10)
  floorMaterial = new THREE.MeshLambertMaterial( { map: texture } );
})

ShaderLoader("http://sniper.satvik.co/shaders/vertex.js", "http://sniper.satvik.co/shaders/fragment.js", function(vertex, fragment){
  shaderMaterial = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment });
})

function ShaderLoader(vertex_url, fragment_url, onLoad, onProgress, onError) {
    // fileLoader.setResponseType('text');
    fileLoader.load(vertex_url, function (vertex_text) {
        // fileLoader.setResponseType('text');
        fileLoader.load(fragment_url, function (fragment_text) {
            onLoad(vertex_text, fragment_text);
        });
    }, onProgress, onError);
}

// function addRandomPlaceHoldItImage(){
//   var r = Math.round(Math.random() * 4000);
//   new THREE.ImageLoader(manager).load('http://placehold.it/' + r + 'x' + r);
// }
//
// for(var i = 0; i < 50; i++) addRandomPlaceHoldItImage();
