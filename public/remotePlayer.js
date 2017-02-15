var RemotePlayer = function (body, mesh ) {
  var id;

  var getBody = function(){
    return body
  }

  var getMesh = function(){
    return mesh
  }

  var getPos = function(){
    return getObject().position
  }

  var setPos = function(pos){
    this.getBody().position.set(pos.x, pos.y, pos.z)
    this.getMesh().position.copy(this.getBody().position)
  }

  return {
    getBody, getBody,
    getMesh, getMesh,
    setPos: setPos,
    getPos: getPos
  }
};
