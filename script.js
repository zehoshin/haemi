import * as THREE from 'three'
import { ARButton } from 'three/addons/webxr/ARButton.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// import { EffectComposer } from './js/EffectComposer.js';
// import { RenderPass } from './js/RenderPass.js';
// import { UnrealBloomPass } from './js/UnrealBloomPass.js';
// import { OutputPass } from './js/OutputPass.js';

// overlay.appendChild( svg );

let camera, scene, renderer, composer;
let defaultEnvironment
let controller;
const mixers = [];
const clock = new THREE.Clock();
let currentRotation = 0; 
const loader = new GLTFLoader();
let hue = 285; // 310 ~ 285 ~ 260
let saturation = 80;
let lightness = 50;


init();
animate();

function init() {

  const container = document.createElement( 'div' );
  document.body.appendChild( container );

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );

  const light = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 5 );
  light.position.set( 0.5, 1, 0.25 );
  scene.add( light );

  renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.xr.enabled = true;
  renderer.colorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild( renderer.domElement );

  document.body.appendChild( ARButton.createButton( renderer ) );
  controller = renderer.xr.getController( 0 );
  controller.addEventListener( 'selectstart', onSelectStart );
  controller.addEventListener( 'selectend', onSelectEnd );

  scene.add( controller );
}

let lightnessChangePoint = false;
let hueChangePoint = false;
let scaleChangePoint = false;

let petalScale = 0.015;
const petalGenTime = 50;

function drawingFlower() {
  loader.load('./src/petal4.glb', function (gltf) {
      const mesh = gltf.scene;
      mesh.traverse(function (child) {
        if (child.isMesh) {
            child.material = new THREE.MeshPhysicalMaterial({
                color: colorGen(), 
                metalness: 0.1, 
                roughness: 0.9,
            });
        }
      });

      if (!lightnessChangePoint) {
        lightness += 1;
        if (lightness == 90) {
          lightnessChangePoint = true;
        }
      } else {
        lightness -= 1;
        if (lightness == 40) {
          lightnessChangePoint = false;
        }
      }

      if (!hueChangePoint) {
        hue += 1;
        if (hue == 320) {
          hueChangePoint = true;
        }
      } else {
        hue -= 1;
        if (hue == 270) {
          hueChangePoint = false;
        }
      }

      if (!scaleChangePoint) {
        petalScale *= 0.8;
        if (petalScale < 0.006) {
          scaleChangePoint = true;
        }  
      } else {
        petalScale *= 1.2;
        if (petalScale > 0.015) {
          scaleChangePoint = false;
        }
      }

      mesh.scale.set(petalScale, petalScale, petalScale);
      mesh.position.set(0, 0, -0.3).applyMatrix4(controller.matrixWorld);
      mesh.quaternion.setFromRotationMatrix(controller.matrixWorld);
      scene.add(mesh);

      currentRotation += 45.8;
      const radians = THREE.MathUtils.degToRad(currentRotation);
      mesh.rotation.z = radians;
      // mesh.rotation.x = THREE.MathUtils.degToRad(0);
      // mesh.rotation.y = THREE.MathUtils.degToRad(0);

      const mixer = new THREE.AnimationMixer(mesh);
      mixers.push(mixer); 

      const action = mixer.clipAction(gltf.animations[0]);
      action.setLoop(THREE.LoopOnce); 
      action.clampWhenFinished = true; 
      action.play();

  }, undefined, function (error) {
      console.error(error);
  });
}

function onSelectStart() {

  this.userData.isSelecting = true;

}

function onSelectEnd() {

    this.userData.isSelecting = false;

}

function handleController(controller) {
  if (controller.userData.isSelecting && !controller.userData.timeoutId) {
      drawingFlower(); // 즉시 onSelect 함수를 호출

      controller.userData.timeoutId = setTimeout(function() {
          controller.userData.timeoutId = null; 
          if (controller.userData.isSelecting) {
              handleController(controller); 
          }
      }, petalGenTime);
  }
}

function colorGen() {

  function hslToRgb(h, s, l) {
      s /= 100;
      l /= 100;
      let c = (1 - Math.abs(2 * l - 1)) * s,
          x = c * (1 - Math.abs((h / 60) % 2 - 1)),
          m = l - c/2,
          r = 0,
          g = 0,
          b = 0;
      if (0 <= h && h < 60) {
          r = c; g = x; b = 0;
      } else if (60 <= h && h < 120) {
          r = x; g = c; b = 0;
      } else if (120 <= h && h < 180) {
          r = 0; g = c; b = x;
      } else if (180 <= h && h < 240) {
          r = 0; g = x; b = c;
      } else if (240 <= h && h < 300) {
          r = x; g = 0; b = c;
      } else if (300 <= h && h < 360) {
          r = c; g = 0; b = x;
      }
      r = Math.round((r + m) * 255);
      g = Math.round((g + m) * 255);
      b = Math.round((b + m) * 255);
      return {r, g, b};
  }

  function rgbToHex(r, g, b) {
      return "#" + [r, g, b].map(x => {
          const hex = x.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
      }).join('');
  }

  const {r, g, b} = hslToRgb(hue, saturation, lightness);
  return rgbToHex(r, g, b);
}

function animate() {
  requestAnimationFrame( animate );
  const delta = clock.getDelta();
  mixers.forEach((mixer) => mixer.update(delta));
  renderer.setAnimationLoop( render );
}

function render() {
  handleController( controller );
  renderer.render( scene, camera );
}