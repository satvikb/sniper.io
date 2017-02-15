var player = function(id, posX, posY, posZ) {
    var x = posX,
        y = posY,
        z = posZ
        id;

    var getX = function() {
        return x;
    };

    var getY = function() {
        return y;
    };

    var getZ = function(){
      return z;
    };

    var setX = function(newX) {
        x = newX;
    };

    var setY = function(newY) {
        y = newY;
    };

    var setZ = function(newZ) {
        z = newZ;
    };

    return {
        getX: getX,
        getY: getY,
        getZ: getZ,
        setX: setX,
        setY: setY,
        setZ: setZ,
        id: id
    }
};

exports.player = player;
