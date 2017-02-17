// var THREE = require('three');
var CANNON = require('cannon');

var velocityFactor = 5
var jumpVelocity = 10

var player = function(id, body, mesh) {
    var position = new CANNON.Vec3();
    var quaternion = new CANNON.Quaternion();
    var velocity = body.velocity

    var inputVelocity = new CANNON.Vec3();

    var canJump = true

    function setPosition(pos){
      position = pos
      body.position.set(pos);
      mesh.position.copy(body.position)
    }

    function move(inputs, dt){
      dt *= 0.1;

      inputVelocity.set(0, 0, 0)

      velocity.x = 0
      velocity.y = 0

      //left right up down and jump
      if(inputs.left){
        inputVelocity.z = -velocityFactor * dt;
      }

      if(inputs.right){
        inputVelocity.z = velocityFactor * dt;
      }

      if(inputs.forward){
        inputVelocity.x = -velocityFactor * dt;
      }

      if(inputs.backward){
        inputVelocity.x = velocityFactor * dt;
      }

      if(inputs.jump){
        if(canJump == true){
          velocity.y = jumpVelocity
        }
        canJump = false
      }


      velocity.x += inputVelocity.x
      velocity.z += inputVelocity.z

    }

    body.addEventListener("collide", function(e){
      var contact = e.contact;

      if(contact.bi.id == cannonBody.id)  // bi is the player body, flip the contact normal
          contact.ni.negate(contactNormal);
      else
          contactNormal.copy(contact.ni); // bi is something else. Keep the normal as it is

      // If contactNormal.dot(upAxis) is between 0 and 1, we know that the contact normal is somewhat in the up direction.
      if(contactNormal.dot(upAxis) > 0.8) // Use a "good" threshold value between 0 and 1 here!
          canJump = true;
    })



    function getId(){
      return id
    }

    function getBody(){
      return body
    }

    function getMesh(){
      return mesh
    }



    var getX = function() {
        return body.position.x;
    };

    var getY = function() {
        return body.position.y;
    };

    var getZ = function(){
      return body.position.z;
    };
    //
    // var setX = function(newX) {
    //     x = newX;
    // };
    //
    // var setY = function(newY) {
    //     y = newY;
    // };
    //
    // var setZ = function(newZ) {
    //     z = newZ;
    // };
    //
    // return {
    //     getX: getX,
    //     getY: getY,
    //     getZ: getZ,
    //     setX: setX,
    //     setY: setY,
    //     setZ: setZ,
    //     id: id
    // }
};

exports.player = player;
