/**
 * @author mrdoob / http://mrdoob.com/
 * @author schteppe / https://github.com/schteppe
 */
 var PointerLockControls = function ( camera, cannonBody ) {

    var id;

    var eyeYPos = 2; // eyes are 2 meters above the ground
    var velocityFactor = 5;
    var jumpVelocity = 10;
    var scope = this;

    var pitchObject = new THREE.Object3D();
    pitchObject.add( camera );

    var yawObject = new THREE.Object3D();
    yawObject.position.y = 2;
    yawObject.add( pitchObject );

    var quat = new THREE.Quaternion();

    var moveForward = false;
    var moveBackward = false;
    var moveLeft = false;
    var moveRight = false;
    var jumpBtn = false;

    var scoping = false;
    var canJump = false;

    var contactNormal = new CANNON.Vec3(); // Normal in the contact, pointing *out* of whatever the player touched
    var upAxis = new CANNON.Vec3(0,1,0);

    var oldPos = new THREE.Vector3()//yawObject.position

    var defaultSensitivity = 0.006
    var scopingSensitivity = 0.003

    var currentSensitivity = defaultSensitivity

    cannonBody.addEventListener("collide",function(e){
        var contact = e.contact;

        // contact.bi and contact.bj are the colliding bodies, and contact.ni is the collision normal.
        // We do not yet know which one is which! Let's check.
        if(contact.bi.id == cannonBody.id)  // bi is the player body, flip the contact normal
            contact.ni.negate(contactNormal);
        else
            contactNormal.copy(contact.ni); // bi is something else. Keep the normal as it is

        // If contactNormal.dot(upAxis) is between 0 and 1, we know that the contact normal is somewhat in the up direction.
        if(contactNormal.dot(upAxis) > 0.8) // Use a "good" threshold value between 0 and 1 here!
            canJump = true;
    });

    var velocity = cannonBody.velocity;

    var PI_2 = Math.PI / 2;

    var onMouseMove = function ( event ) {

        if ( scope.enabled === false ) return;

        var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        yawObject.rotation.y -= movementX * currentSensitivity;
        pitchObject.rotation.x -= movementY * currentSensitivity;

        pitchObject.rotation.x = Math.max( - PI_2, Math.min( PI_2, pitchObject.rotation.x ) );
    };

    var onKeyDown = function ( event ) {

        switch ( event.keyCode ) {

            case 38: // up
            case 87: // w
                moveForward = true;
                break;

            case 37: // left
            case 65: // a
                moveLeft = true; break;

            case 40: // down
            case 83: // s
                moveBackward = true;
                break;

            case 39: // right
            case 68: // d
                moveRight = true;
                break;

            case 32: // space
                if ( canJump === true ){
                    velocity.y = jumpVelocity;
                }
                canJump = false;
                jumpBtn = true;
                break;
        }

        if(event.shiftKey == true){
          scoping = true
          currentSensitivity = scopingSensitivity
          scopingOverlay.style.display = ''
          camera.fov = 25
          camera.updateProjectionMatrix()
        }


    };

    var onKeyUp = function ( event ) {

        switch( event.keyCode ) {

            case 38: // up
            case 87: // w
                moveForward = false;
                break;

            case 37: // left
            case 65: // a
                moveLeft = false;
                break;

            case 40: // down
            case 83: // a
                moveBackward = false;
                break;

            case 39: // right
            case 68: // d
                moveRight = false;
                break;
            case 32:
                jumpBtn = false
                break;

        }

        if(event.shiftKey == false){
          scoping = false
          currentSensitivity = scopingSensitivity

          scopingOverlay.style.display = 'none'
          camera.fov = 75
          camera.updateProjectionMatrix()
          // console.log("no shift" +scoping)
        }

    };

    document.addEventListener( 'mousemove', onMouseMove, false );
    document.addEventListener( 'keydown', onKeyDown, false );
    document.addEventListener( 'keyup', onKeyUp, false );

    this.enabled = false;

    this.getObject = function () {
        return yawObject;
    };

    this.isScoping = function(){
       return scoping
    };

    this.getDirection = function(targetVec){
        targetVec.set(0,0,-1);
        quat.multiplyVector3(targetVec);
    }

    // Moves the camera to the Cannon.js object position and adds velocity to the object if the run key is down
    var inputVelocity = new THREE.Vector3();
    var euler = new THREE.Euler();
    this.update = function ( delta ) {

        if ( scope.enabled === false ) return;

        delta *= 0.1;

        inputVelocity.set(0,0,0);
        // velocity.set(0, 0, 0);
        velocity.x = 0
        velocity.z = 0

        if ( moveForward ){
            inputVelocity.z = -velocityFactor * delta;
        }
        if ( moveBackward ){
            inputVelocity.z = velocityFactor * delta;
        }

        if ( moveLeft ){
            inputVelocity.x = -velocityFactor * delta;
        }
        if ( moveRight ){
            inputVelocity.x = velocityFactor * delta;
        }

        // Convert velocity to world coordinates
        euler.x = pitchObject.rotation.x;
        euler.y = yawObject.rotation.y;
        euler.order = "XYZ";
        quat.setFromEuler(euler);
        inputVelocity.applyQuaternion(quat);
        //quat.multiplyVector3(inputVelocity);

        // Add to the object
        velocity.x += inputVelocity.x;
        velocity.z += inputVelocity.z;

        // cannonBody.inertia.set(0, 0, 0);
        // cannonBody.invInertia.set(0, 0, 0);

        // cannonBody.angularVelocity.set(0, 0, 0);
        // cannonBody.angularVelocity.set(0,0,0);

        // oldPos = new THREE.Vector3().copy(this.getObject().position)

        yawObject.position.copy(cannonBody.position);
    };

    this.inputs = function(){

      var inputs = {
        left: moveLeft,
        right: moveRight,
        backward: moveBackward,
        forward: moveForward,
        jump: jumpBtn,
        rotX: pitchObject.rotation.x,
        rotY: yawObject.rotation.y
      }

      // var newPos = this.getRoundedVector(this.getPos())
      // oldPos = this.getRoundedVector(oldPos)
      //
      // // console.log("Old: "+oldPos.x+" New: "+newPos.x)
      //
      // if((newPos.x != oldPos.x) == true || (newPos.y != oldPos.y) == true || (newPos.z != oldPos.z) == true){
      //   oldPos = new THREE.Vector3().copy(newPos)
      //   return true;
      // }
      // // oldPos = newPos
      // return false;
        return inputs;
    }

    this.getRoundedVector = function(vec){
      var x = Math.round((vec.x + 0.00001) * 100) / 100
      var y = Math.round((vec.y + 0.00001) * 100) / 100
      var z = Math.round((vec.z + 0.00001) * 100) / 100
      return new THREE.Vector3(x, y, z)
    }

    this.getPos = function(){
      return this.getObject().position
    }

    this.setPos = function(pos) {
        this.cannonBody.position.set(pos.x, pos.y, pos.z)
    };
};
