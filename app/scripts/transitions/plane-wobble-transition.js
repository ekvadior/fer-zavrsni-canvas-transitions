/* global _, THREE, TWEEN */
'use strict';

var $b = $('body');
var w = window;

var planeWobbleTransitionDefaults = {
  ambientLight: 0xffffff,
  segments: 32,
  wobbleTime: 1000,
  delayInBetween: 1000,
  transitionTime: 2000,
  wobbleHeight: 20
};

var planeWobbleTransition = {
  options: planeWobbleTransitionDefaults,
  name: 'plane-wobble-transition',
  beforeTransition: function(cur, next, callback) {
    //transitionTemp is storage for transition, will come included with options, it's nice to clear it when done on afterTransition
    var t = this._transitionTemp;

    t.renderer = new THREE.WebGLRenderer({
      alpha: true
    });
    t.renderer.setSize(w.innerWidth, w.innerHeight);
    t.renderer.domElement.classList.add('plane-wobble-transition-canvas');
    document.body.appendChild(t.renderer.domElement);

    t.planeMultiplier = 300;
    t.planeHeight = t.planeMultiplier / (w.innerWidth / w.innerHeight);
    t.cameraPos = Math.tan(67.5 * Math.PI/180) * (t.planeHeight/2);

    t.camera = new THREE.PerspectiveCamera(45, w.innerWidth / w.innerHeight, 1, 1000);
    t.camera.position.z = t.cameraPos;

    t.scene = new THREE.Scene();

    t.materialCur = new THREE.MeshLambertMaterial({
      map: THREE.ImageUtils.loadTexture(cur.image)
    });
    t.materialNext = new THREE.MeshLambertMaterial({
      map: THREE.ImageUtils.loadTexture(next.image)
    });

    t.geometryCur = new THREE.PlaneGeometry(t.planeMultiplier, t.planeHeight, t.o.segments, t.o.segments);
    t.geometryCur.dynamic = true;
    t.geometryNext = new THREE.PlaneGeometry(t.planeMultiplier, t.planeHeight, 1, 1);

    t.planeCur = new THREE.Mesh(t.geometryCur, t.materialCur);
    t.planeNext = new THREE.Mesh(t.geometryNext, t.materialNext);

    t.planeNext.position.z = - t.o.wobbleHeight * 2;

    t.ambientLight = new THREE.AmbientLight(t.o.ambientLight);

    t.scene.add(t.planeCur);
    t.scene.add(t.planeNext);
    t.scene.add(t.ambientLight);

    t.begin = { curMult: 0 };
    var end = { curMult: 1 };

    var posBegin = { nextZ: - t.o.wobbleHeight * 2};
    var posEnd = { nextZ: 0 };

    t.tween1 = new TWEEN.Tween(t.begin).to(end, t.o.wobbleTime);
    t.tween1.onUpdate(function() {
      t.planeCur.position.z = -t.begin.curMult * t.o.wobbleHeight;
    });
    t.tween1.easing(TWEEN.Easing.Cubic.InOut);

    t.tween2 = new TWEEN.Tween(posBegin).to(posEnd, t.o.transitionTime);
    t.tween2.onUpdate(function(){
      t.planeNext.position.z = posBegin.nextZ;
    });
    t.tween2.easing(TWEEN.Easing.Cubic.InOut);
    t.tween2.delay(t.o.delayInBetween);
    t.tween1.chain(t.tween2);

    t.stopAnimate = false;

    // After you're done callback with status. No code should go after.
    callback('Before transition - ok.');
  },
  doTransition: function(cur, next, callback) {
    var t = this._transitionTemp;

    t.tween1.start();

    function animate(time){
      TWEEN.update();

      _.each(t.planeCur.geometry.vertices, function(v, i) {
        v.z = t.planeCur.position.z + (Math.sin(time/1000 + i % t.o.segments)/2 + 1) * t.begin.curMult * t.o.wobbleHeight - 0.01;
      });
      // t.planeCur.geometry.vertices[4].z = 20;
      t.planeCur.geometry.verticesNeedUpdate = true;
      // debugger;

      // render
      t.renderer.render(t.scene, t.camera);

      // request new frame
      if (!t.stopAnimate) {
        requestAnimationFrame(function(time){
          animate(time);
        });
      }
    }

    t.tween2.onComplete(function() {
      t.stopAnimate = true;
      callback('Transition - ok.');
    });

    // start animation
    animate(Date.now()/1000);
  },
  afterTransition: function(cur, next, callback) {
    var t = this._transitionTemp;

    $b.find('.plane-wobble-transition-canvas').remove();

    //Clean up, is nice and recomended
    t = {};
    callback('After transition - ok.');
  }
};

