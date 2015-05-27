/* global _, THREE, TWEEN, TC */
'use strict';

var $b = $('body');
var w = window;

var boxTransitionMapDefaults = {
  ambientLight: 0xbbbbbb,
  directionalLight: 0x555555,
  clearFaceColor: 0xffffff,
  cameraDistanceMultiplier: 3,
  zoomOutTime: 1000,
  zoomInTime: 1000
};

var boxTransitionMap = {
  options: boxTransitionMapDefaults,
  name: 'box-transition-map',
  beforeTransitionMap: function(cur, pages, callback) {
    var t = this._transitionMapTemp;

    t.onDocumentMouseDown = function(event) {
      if( !t.stopListening ) {
        event.preventDefault();

        t.mouse.x = ( event.clientX / t.renderer.domElement.width ) * 2 - 1;
        t.mouse.y = - ( event.clientY / t.renderer.domElement.height ) * 2 + 1;

        t.raycaster.setFromCamera( t.mouse, t.camera );

        var intersects = t.raycaster.intersectObjects( t.boxes );

        if (intersects.length > 0) {
          var box = intersects[0].object;
          t.nextPage = box.pageName;
          t.end.x = box.position.x;
          t.end.y = box.position.y;
          box.hover = false;
          t.checkHoverStates();
          t.stopListening = true;
          t.tween2.start();
        }
      }
    };

    t.onDocumentMouseMove = function(event) {
      if( !t.stopListening ) {
        t.mouse.x = ( event.clientX / t.renderer.domElement.width ) * 2 - 1;
        t.mouse.y = - ( event.clientY / t.renderer.domElement.height ) * 2 + 1;

        t.raycaster.setFromCamera( t.mouse, t.camera );

        var intersects = t.raycaster.intersectObjects( t.boxes );

        var hovered;
        if (intersects.length > 0) {
          hovered = intersects[0].object.pageName;
        }

        _.each(t.boxes, function(b) {
          if (hovered === b.pageName) {
            if (!b.hover) {
              b.hover = true;
            }
          } else {
            if (b.hover) {
              b.hover = false;
            }
          }

          t.checkHoverStates();
        });
      }
    };

    t.onDocumentTouchStart = function(event) {
      event.preventDefault();
      event.clientX = event.touches[0].clientX;
      event.clientY = event.touches[0].clientY;
      t.onDocumentMouseDown(event);
    };

    t.checkHoverStates = function() {
      _.each(t.boxes, function(b) {
        if(b.previousHover === b.hover) {
          b.hoverIn = false;
          b.hoverOut = false;
        } else {
          if(b.previousHover) {
            b.hoverOut = true;
          } else {
            b.hoverIn = true;
          }
        }

        if (b.hoverIn) {
          b.tween = new TWEEN.Tween({z: b.position.z}).to({z: 100}, 150);
          b.tween.easing(TWEEN.Easing.Cubic.InOut);
          b.tween.onUpdate(function() {
            b.position.z = this.z;
          });
          b.tween.start();
        }
        if (b.hoverOut) {
          b.tween = new TWEEN.Tween({z: b.position.z}).to({z: 0}, 150);
          b.tween.easing(TWEEN.Easing.Cubic.InOut);
          b.tween.onUpdate(function() {
            b.position.z = this.z;
          });
          b.tween.start();
        }

        b.previousHover = b.hover;
      });
    };

    t.throttledMouseMove = _.throttle(t.onDocumentMouseMove, 40);

    document.addEventListener( 'mousedown', t.onDocumentMouseDown, false );
    document.addEventListener( 'touchstart', t.onDocumentTouchStart, false );
    document.addEventListener( 'mousemove', t.throttledMouseMove, false );

    t.raycaster = new THREE.Raycaster();
    t.mouse = new THREE.Vector2();

    t.background = this.$overlay.css('background');
    this.$overlay.css('background', 'url("images/box-transition-background.jpg")');

    t.renderer = new THREE.WebGLRenderer({
      alpha: true
    });
    t.renderer.setSize(w.innerWidth, w.innerHeight);
    t.renderer.domElement.classList.add('box-transition-canvas');

    document.body.appendChild(t.renderer.domElement);

    t.boxMultiplier = 300;
    t.boxHeight = t.boxMultiplier / (w.innerWidth / w.innerHeight);
    t.cameraPos = Math.tan(67.5 * Math.PI/180) * (t.boxHeight/2) + (t.boxMultiplier/2);

    t.camera = new THREE.PerspectiveCamera(45, w.innerWidth / w.innerHeight, 1, t.cameraPos * t.o.cameraDistanceMultiplier * 10);
    t.camera.position.z = t.cameraPos;

    t.scene = new THREE.Scene();

    t.materialEmpty = new THREE.MeshLambertMaterial({
      color: t.o.clearFaceColor
    });

    t.boxes = [];
    _.each(pages, function(p) {
      var material = new THREE.MeshLambertMaterial({
        map: THREE.ImageUtils.loadTexture(p.image)
      });
      var boxMaterial = [material, material, t.materialEmpty, t.materialEmpty, material, material];
      var box = new THREE.Mesh(new THREE.BoxGeometry(t.boxMultiplier, t.boxHeight, t.boxMultiplier), new THREE.MeshFaceMaterial( boxMaterial ));
      box.pageName = p.name;

      if (p.name === cur.name) {
        t.curBox = box;
      }

      t.boxes.push(box);
      t.scene.add(box);
    });

    t.boxes[0].position.x = t.boxMultiplier + 1/10 * t.boxMultiplier;
    t.boxes[2].position.x = - t.boxes[0].position.x;

    t.materials = [t.materialCur, t.materialCur, t.materialEmpty, t.materialEmpty, t.materialCur, t.materialCur];

    t.ambientLight = new THREE.AmbientLight(t.o.ambientLight);
    t.directionalLight = new THREE.DirectionalLight(t.o.directionalLight);
    t.directionalLight.position.set(1, 1, 1).normalize();

    t.scene.add(t.ambientLight);
    t.scene.add(t.directionalLight);

    t.begin = { z: t.cameraPos, x: t.curBox.position.x, y: t.curBox.position.y };
    t.middle = { z: t.cameraPos * t.o.cameraDistanceMultiplier, x: 0, y: 0 };
    t.end = { z: t.cameraPos, x: 0, y: 0 };

    t.tween1 = new TWEEN.Tween(t.begin).to(t.middle, t.o.zoomOutTime);
    t.tween1.onUpdate(function(){
      t.camera.position.x = this.x;
      t.camera.position.y = this.y;
      t.camera.position.z = this.z;
    });
    t.tween2 = new TWEEN.Tween(t.middle).to(t.end, t.o.zoomInTime);
    t.tween2.onUpdate(function() {
      t.camera.position.x = this.x;
      t.camera.position.y = this.y;
      t.camera.position.z = this.z;
    });
    t.tween2.easing(TWEEN.Easing.Cubic.In);
    t.tween1.easing(TWEEN.Easing.Cubic.Out);

    t.stopAnimate = false;

    callback('Before transition map - ok.');
  },
  doTransitionMap: function(cur, pages, callback) {
    var t = this._transitionMapTemp;

    t.tween1.start();

    function animate(){
      TWEEN.update();

      // render
      t.renderer.render(t.scene, t.camera);

      // request new frame
      if (!t.stopAnimate) {
        requestAnimationFrame(function(){
          animate();
        });
      }
    }

    t.tween2.onComplete(function() {
      t.stopAnimate = true;
      callback('Transition map - ok.');
    });

    // start animation
    animate();
  },
  afterTransitionMap: function(cur, pages, callback) {
    var t = this._transitionMapTemp;

    $b.find('.box-transition-canvas').remove();

    this.$overlay.css('background', t.background);

    var nextPage = t.nextPage;

    document.removeEventListener( 'mousedown', t.onDocumentMouseDown, false );
    document.removeEventListener( 'touchstart', t.onDocumentTouchStart, false );
    document.removeEventListener( 'mousemove', t.throttledMouseMove, false );

    //Clean up, is nice and recomended
    t = {};
    callback('After transition map - ok.', nextPage);
  }
};

TC.registerTransitionMap(boxTransitionMap);
