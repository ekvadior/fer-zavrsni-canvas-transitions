/* global THREE, TWEEN */
'use strict';

var $b = $('body');
var w = window;

var boxTransitionDefaults = {
  ambientLight: 0xbbbbbb,
  directionalLight: 0x555555,
  clearFaceColor: 0xffffff,
  cameraDistanceMultiplier: 2,
  allowRotationZ: false,
  zoomOutTime: 1000,
  zoomInTime: 1000
};

var boxTransition = {
  options: boxTransitionDefaults,
  name: 'box-transition',
  beforeTransition: function(cur, next, callback) {
    //transitionTemp is storage for transition, will come included with options, it's nice to clear it when done on afterTransition
    var t = this._transitionTemp;

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

    t.camera = new THREE.PerspectiveCamera(45, w.innerWidth / w.innerHeight, 1, t.cameraPos * t.o.cameraDistanceMultiplier);
    t.camera.position.z = t.cameraPos;

    t.scene = new THREE.Scene();

    t.materialCur = new THREE.MeshLambertMaterial({
      map: THREE.ImageUtils.loadTexture(cur.image)
    });
    t.materialNext = new THREE.MeshLambertMaterial({
      map: THREE.ImageUtils.loadTexture(next.image)
    });
    t.materialEmpty = new THREE.MeshLambertMaterial({
      color: t.o.clearFaceColor
    });

    t.materials = [t.materialNext, t.materialNext, t.materialEmpty, t.materialEmpty, t.materialCur, t.materialCur];

    t.box = new THREE.Mesh(new THREE.BoxGeometry(t.boxMultiplier, t.boxHeight, t.boxMultiplier), new THREE.MeshFaceMaterial( t.materials ));

    t.ambientLight = new THREE.AmbientLight(t.o.ambientLight);
    t.directionalLight = new THREE.DirectionalLight(t.o.directionalLight);
    t.directionalLight.position.set(1, 1, 1).normalize();

    t.scene.add(t.box);
    t.scene.add(t.ambientLight);
    t.scene.add(t.directionalLight);

    var begin = { cameraZ: t.cameraPos, boxRotationY: 0, boxRotationZ: 0 };
    var middle = { cameraZ: t.cameraPos * t.o.cameraDistanceMultiplier, boxRotationY: Math.PI * (3/4), boxRotationZ: 2 * Math.PI };
    var end = { cameraZ: t.cameraPos, boxRotationY: Math.PI * (3/2), boxRotationZ: 4 * Math.PI };

    t.tween1 = new TWEEN.Tween(begin).to(middle, t.o.zoomOutTime);
    t.tween1.onUpdate(function(){
      t.camera.position.z = begin.cameraZ;
      t.box.rotation.y = begin.boxRotationY;
      if (t.o.allowRotationZ) {
        t.box.rotation.z = begin.boxRotationZ;
      }
    });
    t.tween2 = new TWEEN.Tween(middle).to(end, t.o.zoomInTime);
    t.tween2.onUpdate(function() {
      t.camera.position.z = middle.cameraZ;
      t.box.rotation.y = middle.boxRotationY;
      if (t.o.allowRotationZ) {
        t.box.rotation.z = middle.boxRotationZ;
      }
    });
    t.tween2.easing(TWEEN.Easing.Cubic.In);
    t.tween1.easing(TWEEN.Easing.Cubic.Out);
    t.tween1.chain(t.tween2);

    t.stopAnimate = false;

    // After you're done callback with status. No code should go after.
    callback('Before transition - ok.');
  },
  doTransition: function(cur, next, callback) {
    var t = this._transitionTemp;

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
      callback('Transition - ok.');
    });

    // start animation
    animate();
  },
  afterTransition: function(cur, next, callback) {
    var t = this._transitionTemp;

    $b.find('.box-transition-canvas').remove();

    this.$overlay.css('background', t.background);

    //Clean up, is nice and recomended
    t = {};
    callback('After transition - ok.');
  }
};

