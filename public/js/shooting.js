window.addEventListener("click",function(e){
  e.preventDefault()

});

var bullets = [];

function addBullet(){
  // bulletMaterial.uniforms.viewVector.type = "v3"
  // bulletMaterial.uniforms.viewVector.value = controls.getObject().position

  var bulletGeom = new THREE.SphereGeometry(0.05, 8, 8)//new THREE.BoxGeometry(0.05, 0.05, 1)
  var bullet = new THREE.Mesh(bulletGeom, new THREE.MeshBasicMaterial({color: 0xffff00}))//bulletMaterial.clone())
  // var bulletGlow = new THREE.Mesh(bulletGeom.clone(), bulletMaterial)
  // bulletGlow.scale.multiplyScalar(1.5)
  // bullet.add(bulletGlow)

  var position = new THREE.Vector3();
  var quaternion = new THREE.Quaternion();
  var scale = new THREE.Vector3();

  gunTest.matrixWorld.decompose(position, quaternion, scale)

  bullet.position.copy(position)
  bullet.quaternion.copy(quaternion)
  bullet.rotateY(-Math.PI/2)

  var speed = 2.5
  bullet.velocity = new THREE.Vector3(-Math.sin(controls.getObject().rotation.y)*speed, Math.sin(controls.getPitch().rotation.x)*speed, -Math.cos(controls.getObject().rotation.y)*speed)
  bullet.alive = true
  setTimeout(function(){
    bullet.alive = false
    scene.remove(bullet)
  }, 1000)

  bullets.push(bullet)
  scene.add(bullet)
  // console.log('shoot '+controls.getPitch().rotation.x+" "+-Math.sin(controls.getPitch().rotation.x))
}

function updateBullets(){
  for(var i = 0; i < bullets.length; i++){
    var bullet = bullets[i]
    if(bullet){
      if(bullet.active == false){
        bullets.splice(index, 1);
        continue;
      }

      bullet.position.add(bullet.velocity)
      // bullet.material.uniforms.viewVector.value = new THREE.Vector3().subVectors(controls.getObject().position, bullet.position)
    }
  }
}

function reloadGun(){
  socket.emit("reload", {id: socket.id});
  playerAmmoStat.innerHTML = "reloading..."
}

function playerReload(data){
  // localPlayer.playerData.ammo = data.ammo
}
