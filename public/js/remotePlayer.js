function RemotePlayer(body, mesh, nameTag) {
  this.id
  this.body = body
  this.mesh = mesh
  this.nameTag = nameTag
  this.nickname
}

RemotePlayer.prototype.setPos = function(pos){
  if(this.body){
    this.body.position.set(pos.x, pos.y, pos.z)
  }

  if(this.mesh){
    this.mesh.position.copy(this.body.position)
  }
}

RemotePlayer.prototype.setQuat = function(quat){
  if(this.body){
    this.body.quaternion.set(quat.x, quat.y, quat.z, quat.w)
  }

  if(this.mesh){
    this.mesh.quaternion.copy(this.body.quaternion)
  }
}
