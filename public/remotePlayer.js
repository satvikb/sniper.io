var RemotePlayer = function (body, mesh ) {
  var id;

  var getBody = function(){
    return body
  }

  var getMesh = function(){
    return mesh
  }


  var getPos = function(){
    return getBody().position
  }

  var setPos = function(pos){
    if(this.getBody())
      this.getBody().position.set(pos.x, pos.y, pos.z)
    if(this.getMesh())
      this.getMesh().position.copy(this.getBody().position)
  }


  var getQuat = function(quat){
      return getBody().quaternion
  }

  var setQuat = function(quat){
    if(this.getBody())
      this.getBody().quaternion.set(quat.x, quat.y, quat.z, quat.w)
    if(this.getMesh())
      this.getMesh().quaternion.copy(this.getBody().quaternion)
  }

  return {
    getBody, getBody,
    getMesh, getMesh,
    setPos: setPos,
    getPos: getPos,
    getQuat: getQuat,
    setQuat: setQuat
  }
};
