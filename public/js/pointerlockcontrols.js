 var PointerLockControls = function ( camera, cannonBody ) {

    var id;

    var eyeYPos = 2; // eyes are 2 meters above the ground
    var velocityFactor = 5;
    var jumpVelocity = 6;
    var scope = this;

    var pitchObject = new THREE.Object3D();
    pitchObject.add( camera );

    var yawObject = new THREE.Object3D();
    yawObject.position.y = 2;
    yawObject.add( pitchObject );

    gunTest.rotateY(-Math.PI*0.45)
    gunTest.scale.set(0.1, 0.1, 0.1)
    gunTest.position.x = 0.095
    gunTest.position.z = 0.05
    gunTest.position.y = -0.175
    pitchObject.add(gunTest)

    var quat = new THREE.Quaternion();

    var moveForward = false;
    var moveBackward = false;
    var moveLeft = false;
    var moveRight = false;
    var jumpBtn = false;

    var shoot = false
    var moveX = 0
    var moveY = 0

    //TODO Can this be exploited for cheating?
    var camDir = 0

    var scoping = false;
    var canJump = false;

    var contactNormal = new CANNON.Vec3(); // Normal in the contact, pointing *out* of whatever the player touched
    var upAxis = new CANNON.Vec3(0,1,0);

    var oldPos = new THREE.Vector3()//yawObject.position

    var defaultSensitivity = 0.008
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
        if(contactNormal.dot(upAxis) >= 0) // Use a "good" threshold value between 0 and 1 here!
            canJump = true;
    });

    var velocity = cannonBody.velocity;

    var PI_2 = Math.PI / 2;

    var testMoveX = 0
    var testMoveY = 0

    this.getMove = function(){
      return [testMoveX, testMoveY]
    }

    this.resetMove = function(){
      testMoveX = 0
      testMoveY = 0
    }

    var mouseStop = function(){
      moveX = moveY = 0
    }

    var timer;

    var onMouseMove = function ( event ) {
      // console.log("mouse move "+event.movementX+" "+event.movementY+" "+scope.enabled)
        if ( scope.enabled === false ) return;

        var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        movementX /= 2
        movementY /= 2

        moveX = testMoveX = movementX
        moveY = testMoveY = movementY

        // socket.emit("look player", {id: socket.id, movementX: movementX, movementY: movementY})

        //client interploration
        yawObject.rotation.y -= movementX * currentSensitivity;
        pitchObject.rotation.x -= movementY * currentSensitivity;

        pitchObject.rotation.x = Math.max( - PI_2, Math.min( PI_2, pitchObject.rotation.x ) );

        // clearTimeout(timer)
        // timer = setTimeout(mouseStop, 0)
    };

    this.updateRotation = function(data){
      //   // this.emit("look player", {rotationX: lookPlayer.camRotation.x, rotationY: lookPlayer.camRotation.y})

      yawObject.rotation.y = data.y
      pitchObject.rotation.x = data.x
      // console.log("R1 "+data.x+" "+data.y+" R2 "+yawObject.rotation.y+" "+pitchObject.rotation.x)
    }

    var onKeyDown = function ( event ) {

        switch ( event.keyCode ) {
          case keys.moveUp: // w
              moveForward = true;
              break;
          case keys.moveLeft: // a
              moveLeft = true; break;
          case keys.moveBack: // s
              moveBackward = true;
              break;
          case keys.moveRight: // d
              moveRight = true;
              break;
          case keys.jump: // space
              if ( canJump === true ){
                  velocity.y = jumpVelocity;
              }
              canJump = false;
              jumpBtn = true;
              break;
          case keys.chat:
            if(chatting == false){
              showChatfield()
              document.exitPointerLock()
            }
            break;

          case keys.sendMessage:
            if(chatting){
              sendChatMessage()
            }
            break;
          case keys.reload:
            reloadGun()
            break;
          // case keys.hide:
          //   toggleExtras()
          //   break;
        }

        //scope
        //TODO Mind if mouse button is used instead
        if(controls.enabled){
          if(event.keyCode == keys.scope){
            setScoping(true)
          }
        }else{
          setScoping(false)
        }
    };

    var onKeyUp = function ( event ) {

        switch( event.keyCode ) {
            case keys.moveUp: // w
                moveForward = false;
                break;

            case keys.moveLeft: // a
                moveLeft = false;
                break;

            case keys.moveBack: // a
                moveBackward = false;
                break;

            case keys.moveRight: // d
                moveRight = false;
                break;
            case keys.jump:
                jumpBtn = false
                break;
        }

        //scope
        //TODO Mind if mouse button is used instead
        if(controls.enabled){
          if(event.keyCode == keys.scope){
            setScoping(false)
          }
        }else{
          setScoping(false)
        }
    };

    var setScoping = function(isScoping){
      scoping = isScoping
      currentSensitivity = isScoping == true ? scopingSensitivity : defaultSensitivity
      scopingOverlay.style.display = isScoping == true ? '' : 'none'
      camera.fov = isScoping == true ? 25 : 75
      camera.updateProjectionMatrix()
    }

    //scoping with RMB

    var mouseDown = function(e){
      if(!e.shiftKey){
        if(e.button == 2){
          setScoping(true)
        }
      }

      //shooting
      if(inGame){
        if(scope.enabled == true){
          if(e.button == 0){
            if(localPlayer.playerData.ammo > 0){
              camDir = camera.getWorldDirection();
              shoot = true
              // socket.emit("shoot", {id: socket.id, camDir: d})
            }
          }
        }
      }
    }

    var mouseUp = function(e){
      if(!e.shiftKey){
        if(e.button == 2){
          setScoping(false)
        }
      }

      if(e.button == 0)
        shoot = false
    }

    document.addEventListener( 'mousemove', onMouseMove, false );
    document.addEventListener( 'keydown', onKeyDown, false );
    document.addEventListener( 'keyup', onKeyUp, false );

    document.addEventListener("mousedown", mouseDown, false);
    document.addEventListener("mouseup", mouseUp, false);






    this.getObject = function () {
        return yawObject;
    };

    this.getPitch = function () {
      return pitchObject;
    }

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

        if ( scope.enabled === false ){
          moveForward = false
          moveBackward = false
          moveLeft = false
          moveRight = false
          jumpBtn = false
          shoot = 0
          moveX = 0
          moveY = 0
          return;
        }else{

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
        }

        yawObject.position.copy(cannonBody.position);
    };

    this.inputs = function(){

      //TODO Send mouse movement not actual rotation
      var inputs = {
        left: moveLeft,
        right: moveRight,
        backward: moveBackward,
        forward: moveForward,
        jump: jumpBtn,
        movementX: moveX,
        movementY: moveY,
        shoot: shoot,
        camDir: camDir//,
        // rotX: pitchObject.rotation.x,
        // rotY: yawObject.rotation.y
      }

      moveX = moveY = 0
      shoot = false

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
