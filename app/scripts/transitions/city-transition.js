/* global THREE, TWEEN, TC */
'use strict';

var $b = $('body');
var w = window;

var cityTransitionDefaults = {
  ambientLight: 0xbbbbbb,
  directionalLight: 0x555555,
  clearFaceColor: 0xffffff,
  cameraDistanceMultiplier: 2,
  zoomOutTime: 1000,
  zoomInTime: 1000,
  boxMultiplier: 300,
  boxHeight: 10,
};

var cityTransition = {
  options: cityTransitionDefaults,
  name: 'city-transition',
  beforeTransition: function(cur, next, callback) {
    //transitionTemp is storage for transition, will come included with options, it's nice to clear it when done on afterTransition
    var t = this._transitionTemp;

    function generateGui(obj) {
      t.f.add(obj.rotation, 'x', -Math.PI, Math.PI);
      t.f.add(obj.rotation, 'y', -Math.PI, Math.PI);
      t.f.add(obj.rotation, 'z', -Math.PI, Math.PI);
      t.f.add(obj.position, 'x', -1000, 1000);
      t.f.add(obj.position, 'y', -1000, 1000);
      t.f.add(obj.position, 'z', -1000, 1000);
    }

    t.background = this.$overlay.css('background');
    this.$overlay.css('background', 'url("images/city-transition-background.jpg")');

    t.renderer = new THREE.WebGLRenderer({
      alpha: true
    });
    t.renderer.setSize(w.innerWidth, w.innerHeight);
    t.renderer.domElement.classList.add('city-transition-canvas');
    document.body.appendChild(t.renderer.domElement);

    t.boxMultiplier = t.o.boxMultiplier;
    t.cameraPos = 400;

    t.camera = new THREE.PerspectiveCamera(45, w.innerWidth / w.innerHeight, 1, t.cameraPos * t.o.cameraDistanceMultiplier * 10);
    t.camera.position.z = t.cameraPos;
    t.camera.position.y = 300;
    t.camera.rotation.x = -Math.PI/4;

    generateGui(t.camera);

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

    t.materialMap = new THREE.MeshLambertMaterial({
      map: THREE.ImageUtils.loadTexture('images/paper-map.jpg'),
      side: THREE.DoubleSide
    });

    t.mapPositionY = -200;

    t.mapPlane = new THREE.Mesh(new THREE.PlaneGeometry(5000,5000), t.materialMap);
    t.mapPlane.rotation.x =  Math.PI/2;
    t.mapPlane.position.y = t.mapPositionY;

    t.scene.add(t.mapPlane);

    t.box = new THREE.Mesh(new THREE.BoxGeometry(cur.el.width(), t.o.boxHeight, cur.el.height()), t.materialEmpty);
    t.box.position.y = t.mapPositionY + t.o.boxHeight/2;

    t.boxWidth = cur.el.width();
    t.boxHeight = cur.el.height();

    function generateChildren(el, level, array) {
      level++;
      el.children().each(function() {
        var $this = $(this);
        var material = new THREE.MeshLambertMaterial({
          map: THREE.ImageUtils.loadTexture(this.myImg)
        });
        var materials = [t.materialEmpty, t.materialEmpty, material, t.materialEmpty, t.materialEmpty, t.materialEmpty];
        var box = new THREE.Mesh(new THREE.BoxGeometry(this.myRect.width, t.o.boxHeight*level*8, this.myRect.height), new THREE.MeshFaceMaterial( materials ));
        box.position.x = this.myRect.left + this.myRect.width/2 - t.boxWidth/2;
        box.position.y = t.mapPositionY + t.o.boxHeight*level*2;
        box.position.z = this.myRect.top + this.myRect.height/2 - t.boxHeight/2;
        t.scene.add(box);
        array.push(box);
        generateChildren($this, level, array);
      });
    }

    t.boxArray = [];

    generateChildren(cur.domClone, 0, t.boxArray);

    t.ambientLight = new THREE.AmbientLight(t.o.ambientLight);
    t.directionalLight = new THREE.DirectionalLight(t.o.directionalLight);
    t.directionalLight.position.set(500, 40, 1).normalize();

    // t.scene.add(t.box);
    t.scene.add(t.ambientLight);
    t.scene.add(t.directionalLight);

    var begin = { cameraZ: t.cameraPos, boxRotationY: 0, boxRotationZ: 0 };
    var middle = { cameraZ: t.cameraPos * t.o.cameraDistanceMultiplier, boxRotationY: Math.PI * (3/4), boxRotationZ: 2 * Math.PI };
    var end = { cameraZ: t.cameraPos, boxRotationY: Math.PI * (3/2), boxRotationZ: 4 * Math.PI };

    t.tween1 = new TWEEN.Tween(begin).to(middle, t.o.zoomOutTime);
    t.tween1.onUpdate(function(){
      t.camera.position.z = begin.cameraZ;
    });
    t.tween2 = new TWEEN.Tween(middle).to(end, t.o.zoomInTime);
    t.tween2.onUpdate(function() {
      t.camera.position.z = middle.cameraZ;
    });
    t.tween2.easing(TWEEN.Easing.Cubic.In);
    t.tween1.easing(TWEEN.Easing.Cubic.Out);
    // t.tween1.chain(t.tween2);

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

    $b.find('.city-transition-canvas').remove();

    this.$overlay.css('background', t.background);

    //Clean up, is nice and recomended
    t = {};
    callback('After transition - ok.');
  }
};

TC.registerTransition(cityTransition);

