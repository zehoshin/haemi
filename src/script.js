import * as THREE from 'three'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';

// import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
// import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
// import { TexturePass } from 'three/addons/postprocessing/TexturePass.js';
// import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
// import { UnrealBloomPass } from 'three/addons/postprocessing/AlphaUnrealBloomPass.js';
// // import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
// import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { BloomEffect, EffectComposer, EffectPass, RenderPass } from "postprocessing";

//settings
const urlParams = new URLSearchParams(window.location.search);
const query = {
    amount: urlParams.get('amount') || '2k',
};

const amountMap = {
    '256': [16, 16, 0.1],
    '1k': [32, 32, 0.16],
    '2k': [64, 32, 0.21],
    '4k': [64, 64, 0.29],
    '8k': [128, 64, 0.42],
    '16k': [128, 128, 0.45],
    '32k': [256, 128, 0.55],
    '65k': [256, 256, 0.6],
    '131k': [512, 256, 0.85],
    '252k': [512, 512, 1.2],
    '524k': [1024, 512, 1.4],
    '1m': [1024, 1024, 1.6],
    '2m': [2048, 1024, 2],
    '4m': [2048, 2048, 2.5]
};
const amountInfo = amountMap[query.amount];

const settings = {
    amount: '2k',
    speed: 0.4,
    dieSpeed: 0.0025,
    radius: 1.0,
    curlSize: 0.015,
    attraction: -2.0,
    shadowDarkness: 0.66,
    tornadoStrength: 3.3,
    color1: '#ffa8e4',
    color2: '#efccff',
};

let camera, simulCamera, scene, simulScene, renderer, controls;

let time = 0;
let dt;
let ray = new THREE.Ray();

//particles
let particleMesh;
let color1, color2, tmpColor;
let texture;

//simulator
let copyShader, positionShader, textureDefaultPosition, positionRenderTarget, positionRenderTarget2, rotationTexture, scaleTexture;

let simulMesh;
let followPoint;
let followPointTime = 0;

const TEXTURE_WIDTH = amountInfo[0];
const TEXTURE_HEIGHT = amountInfo[1];
const AMOUNT = TEXTURE_WIDTH * TEXTURE_HEIGHT;

let initAnimation = 0;

//light
let shadowDarkness = 0.45;
let lightMesh;

//instance
let glbModel;
let glbMaterial;
let rotationSpeeds;
let colorIndices;

const params = {
    exposure: 1,
    strength: 5.0,
    threshold: 0,
    radius: 1.0,
};

let composer, sceneTarget, copyPass, combinePass, bloomComposer;
let renderTarget;

let onARSession = false;

let size;

init()

function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 10000);
    // camera.position.set( 0, 0, 30 );
    // camera.position.set(-440, 380, 800);
    camera.position.set( 0, 500, 600 );

    // camera.lookAt(new THREE.Vector3( 0, 0, 0 ))
    // settings.camera = camera;
    // settings.cameraPosition = camera.position;

    renderer = new THREE.WebGLRenderer({
        // canvas,
        // context: renderer.getContext(), 
        antialias : true,
        alpha: true,
        depth: true,
    });
    // renderer.debug.checkShaderErrors = false;
    // renderer.autoClear = false;
    // renderer.autoClearDepth = false;

    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.xr.enabled = true;
    renderer.setClearColor( 0x000000, 0.5 )

    document.body.appendChild ( renderer.domElement );
    document.body.appendChild( ARButton.createButton( renderer ));



    //
    // renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    //     format: THREE.RGBAFormat,
    //     type: THREE.UnsignedByteType,
    //     depthBuffer: true,
    //     stencilBuffer: false,
    // });

    // const renderScene = new RenderPass( scene, camera );

    // const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
    // bloomPass.threshold = params.threshold;
    // bloomPass.strength = params.strength;
    // bloomPass.radius = params.radius;

    // const outputPass = new OutputPass();

    // composer = new EffectComposer( renderer, renderTarget );
    // // composer.addPass( copyPass );
    // composer.addPass( renderScene )
    // composer.addPass( bloomPass );
    // composer.addPass( outputPass );

    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new EffectPass(camera, new BloomEffect({
        intensity: 2.0
    }))); 


    
    window.addEventListener('resize', function() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    });

    //

    initLight();
    scene.add(lightMesh);
    initSimulator();
    loadGLBModel();

    const defaultLight = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 3 );
    defaultLight.position.set( 0.5, 1, 0.25 );
    scene.add( defaultLight );

    const geometry = new THREE.BoxGeometry( 10, 10, 10 );
    const material = new THREE.MeshStandardMaterial( { 
        color: 0xffffff,
        roughness: 1.0,
        metalness: 0.0,
    } );
    const cube = new THREE.Mesh( geometry, material );
    cube.position.z = -2;
    cube.receiveShadow = true;
    scene.add( cube );

    const loader = new GLTFLoader();
    // loader.load(
    //     'models/scene3.glb',
    //     function ( gltf ) {
    //         let scaleFactor = 100;
    //         gltf.scene.position.y = -100;
    //         gltf.scene.position.z = 650;
    //         gltf.scene.scale.set ( scaleFactor, scaleFactor, scaleFactor);
    //         scene.add( gltf.scene );
    //     },
    // );

    window.addEventListener('keyup', onKeyUp);

    controls = new OrbitControls( camera, renderer.domElement );
    controls.update();

    GUI
    const gui = new GUI();

    settings.amount = query.amount;

    gui.add(settings, 'amount', ['256', '1k', '2k', '4k', '8k', '16k', '32k', '65k', '131k', '252k', '524k', '1m', '2m', '4m'])
    .onChange(function(value) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('amount', value);
        window.location.href = newUrl.href;
    });
    gui.add( settings, 'speed', 0, 3 );
    gui.add( settings, 'dieSpeed', 0, 0.05 );
    gui.add( settings, 'radius', 0, 10 );
    gui.add( settings, 'curlSize', 0, 0.05 );
    gui.add( settings, 'attraction', -20, 20 );
    gui.add( settings, 'shadowDarkness', 0, 1 );
    gui.add( settings, 'tornadoStrength', 0.0, 10.0 );
    gui.addColor( settings, 'color1' );
    gui.addColor( settings, 'color2' );

    // const bloomFolder = gui.addFolder( 'bloom' );

    // bloomFolder.add( params, 'threshold', 0.0, 1.0 ).onChange( function ( value ) {
    //     bloomPass.threshold = Number( value );
    // } );

    // bloomFolder.add( params, 'strength', 0.0, 3.0 ).onChange( function ( value ) {
    //     bloomPass.strength = Number( value );
    // } );

    // gui.add( params, 'radius', 0.0, 1.0 ).step( 0.01 ).onChange( function ( value ) {
    //     bloomPass.radius = Number( value );
    // } );

    // const toneMappingFolder = gui.addFolder( 'tone mapping' );
    // toneMappingFolder.add( params, 'exposure', 0.1, 2 ).onChange( function ( value ) {
    //     renderer.toneMappingExposure = Math.pow( value, 4.0 );
    // } );

    time = Date.now();
    // renderer.setAnimationLoop( render );
    animate();
}


//#########SIMULATION##########
function initSimulator() {

    followPoint = new THREE.Vector3();

    simulScene = new THREE.Scene();
    simulCamera = new THREE.Camera();
    simulCamera.position.z = 1;

    copyShader = new THREE.RawShaderMaterial({
        uniforms: {
            resolution: { type: 'v2', value: new THREE.Vector2( TEXTURE_WIDTH, TEXTURE_HEIGHT ) },
            texture: { type: 't', value: null }
        },
        vertexShader: document.getElementById( 'quadVert' ).textContent,
        fragmentShader: document.getElementById( 'throughFrag' ).textContent});

    positionShader = new THREE.RawShaderMaterial({
        uniforms: {
            resolution: { type: 'v2', value: new THREE.Vector2( TEXTURE_WIDTH, TEXTURE_HEIGHT ) },
            texturePosition: { type: 't', value: null },
            textureDefaultPosition: { type: 't', value: null },
            mouse3d: { type: 'v3', value: new THREE.Vector3 },
            speed: { type: 'f', value: 1 },
            dieSpeed: { type: 'f', value: 0 },
            radius: { type: 'f', value: 0 },
            curlSize: { type: 'f', value: 0 },
            attraction: { type: 'f', value: 0 },
            time: { type: 'f', value: 0 },
            initAnimation: { type: 'f', value: 0 },
            // windDirection: { type: 'v3', value: new THREE.Vector3(100, 0.0, 0.0) },
            tornadoStrength: { type: 'f', value: settings.tornadoStrength },

        },
        vertexShader: document.getElementById( 'quadVert' ).textContent,
        fragmentShader: document.getElementById( 'positionFrag' ).textContent,
        blending: THREE.NoBlending,
        transparent: false,
        depthWrite: false,
        depthTest: false
    });

    simulMesh = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2 ), copyShader );
    simulScene.add( simulMesh );

    positionRenderTarget = new THREE.WebGLRenderTarget(TEXTURE_WIDTH, TEXTURE_HEIGHT, {
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        depthWrite: false,
        depthBuffer: false,
        stencilBuffer: false
    });
    positionRenderTarget2 = positionRenderTarget.clone();
    copyTexture(createPositionTexture(), positionRenderTarget);
    copyTexture(positionRenderTarget, positionRenderTarget2);

    rotationTexture = createRotationTexture();
    scaleTexture = createScaleTexture();
}

function copyTexture(input, output) {
    simulMesh.material = copyShader;
    copyShader.uniforms.texture.value = input.texture;
    renderer.setRenderTarget( output );
    renderer.render( simulScene, simulCamera );
    renderer.setRenderTarget(null);
}

function createPositionTexture() {
    var positions = new Float32Array( AMOUNT * 4 );
    var i4;
    var r, phi, theta;
    for(var i = 0; i < AMOUNT; i++) {
        i4 = i * 4;
        // r = (0.5 + Math.pow(Math.random(), 0.4) * 0.5) * 50;
        r = (0.5 + Math.random() * 0.5) * 50;
        phi = (Math.random() - 0.5) * Math.PI;
        theta = Math.random() * Math.PI * 2;
        positions[i4 + 0] = r * Math.cos(theta) * Math.cos(phi);
        positions[i4 + 1] = r * Math.sin(phi);
        positions[i4 + 2] = r * Math.sin(theta) * Math.cos(phi);
        positions[i4 + 3] = Math.random();
    }
    var texture = new THREE.DataTexture( positions, TEXTURE_WIDTH, TEXTURE_HEIGHT, THREE.RGBAFormat, THREE.FloatType );
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    texture.generateMipmaps = false;
    texture.flipY = false;
    textureDefaultPosition = texture;
    return texture;
}

function createRotationTexture() {
    const rotations = new Float32Array(AMOUNT * 4);
    for (let i = 0; i < AMOUNT; i++) {
        rotations[i * 4 + 0] = Math.random() * 2.0 * Math.PI;
        rotations[i * 4 + 1] = Math.random() * 2.0 * Math.PI; 
        rotations[i * 4 + 2] = Math.random() * 2.0 * Math.PI; 
        rotations[i * 4 + 3] = Math.random(); 
    }
    const texture = new THREE.DataTexture(rotations, TEXTURE_WIDTH, TEXTURE_HEIGHT, THREE.RGBAFormat, THREE.FloatType);
    texture.needsUpdate = true;
    texture.generateMipmaps = false;
    texture.flipY = false;
    return texture;
}

function createScaleTexture() {
    const scales = new Float32Array(AMOUNT * 4);
    for (let i = 0; i < AMOUNT; i++) {
        scales[i * 4 + 0] = Math.random() * 0.6 + 1.2; 
        scales[i * 4 + 1] = 0.0;
        scales[i * 4 + 2] = 0.0;
        scales[i * 4 + 3] = 1.0;
    }
    const texture = new THREE.DataTexture(scales, TEXTURE_WIDTH, TEXTURE_HEIGHT, THREE.RGBAFormat, THREE.FloatType);
    texture.needsUpdate = true;
    texture.generateMipmaps = false;
    texture.flipY = false;
    return texture;
}


function updateSimulator(dt) {
    if(settings.speed || settings.dieSpeed) {
        const r = 300;
        const h = 30;
        
        let autoClearColor = renderer.autoClearColor;
        renderer.autoClearColor = false;

        const deltaRatio = dt / 16.6667;

        positionShader.uniforms.speed.value = settings.speed * deltaRatio;
        positionShader.uniforms.dieSpeed.value = settings.dieSpeed * deltaRatio;
        positionShader.uniforms.radius.value = settings.radius;
        positionShader.uniforms.curlSize.value = settings.curlSize;
        positionShader.uniforms.attraction.value = settings.attraction;
        positionShader.uniforms.initAnimation.value = initAnimation;
        positionShader.uniforms.tornadoStrength.value = settings.tornadoStrength;
        // positionShader.uniforms.mouse3d.value.copy(settings.mouse3d);
        // followPointTime += dt * 0.001 * settings.speed;
        followPointTime += dt * 0.001;

        // followPoint.set(
        //     Math.cos(followPointTime) * r,
        //     Math.cos(followPointTime * 4.0) * h,
        //     Math.sin(followPointTime * 2.0) * r
        // );
        followPoint.set(
            Math.cos(followPointTime) * r * 1.2,  // x
            Math.cos(followPointTime * 2.5) * h,  // y
            Math.sin(followPointTime) * r   // z
        );
        positionShader.uniforms.mouse3d.value.lerp(followPoint, 0.2);

        // renderer.setClearColor(0x000000, 1);
        updatePosition(dt);
        renderer.autoClearColor = autoClearColor;
    }
}

function updatePosition(dt) {
    // swap
    var tmp = positionRenderTarget;
    positionRenderTarget = positionRenderTarget2;
    positionRenderTarget2 = tmp;

    simulMesh.material = positionShader;
    positionShader.uniforms.textureDefaultPosition.value = textureDefaultPosition;
    positionShader.uniforms.texturePosition.value = positionRenderTarget2.texture;
    positionShader.uniforms.time.value += dt * 0.001;
    // positionShader.uniforms.windDirection.value.set(100, 0.0, 0.0);

    var currentRenderTarget = renderer.getRenderTarget();
    var currentXrEnabled = renderer.xr.enabled;
    var currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

    renderer.xr.enabled = false;
    renderer.shadowMap.autoUpdate = false;

    renderer.setRenderTarget(positionRenderTarget);
    renderer.clear();
    renderer.render(simulScene, simulCamera);

    renderer.xr.enabled = currentXrEnabled;
    renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
    renderer.setRenderTarget(currentRenderTarget);
}

//##########PARTICLES#############
function loadGLBModel() {
    const loader = new GLTFLoader();
    loader.load('./src/models/flower2.glb', function(gltf) {
        glbModel = gltf.scene.children[0];
        glbMaterial = glbModel.material;
        initParticles(); 
        scene.add(particleMesh);
    });
}

//##########입자#############
function initParticles() {
    if (!glbModel) {
        console.error("GLB 모델이 로드되지 않았습니다.");
        return;
    }
    particleMesh = createParticleMesh();
}

function createParticleMesh() {
    const geometry = glbModel.geometry;
    const material = new THREE.ShaderMaterial({
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader').textContent,
        uniforms: {
            resolution: { type: 'v2', value: new THREE.Vector2( TEXTURE_WIDTH, TEXTURE_HEIGHT ) },
            texturePosition: { value: positionRenderTarget.texture },
            textureRotation: { value: rotationTexture },
            textureScale: { value: scaleTexture }, 
            time: { value: 0.0 },
            color1: { value: new THREE.Color(settings.color1) }, 
            color2: { value: new THREE.Color(settings.color2) },
            lightPosition: { value: new THREE.Vector3(10, 10, 10) },
            ambientLightIntensity: { value: 2.0 },
            metalness: { value: 0.0 },
            roughness: { value: 1.0 }, 
        },
        transparent: true,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, AMOUNT);
    mesh.receiveShadow = true;

    colorIndices = new Float32Array(AMOUNT); 

    geometry.setAttribute('colorIndex', new THREE.InstancedBufferAttribute(colorIndices, 1));
    
    return mesh;
}

function updateParticles(dt) {
    if (!particleMesh) return;

    particleMesh.material.uniforms.texturePosition.value = positionRenderTarget.texture;
    particleMesh.material.uniforms.time.value += dt * 0.01;;
    particleMesh.material.uniformsNeedUpdate = true;
}

//##########LIGHT##########
function initLight() {

    lightMesh = new THREE.Object3D();
    lightMesh.position.set(0, 500, 0);

    const ambient = new THREE.AmbientLight( 0x333333 );
    lightMesh.add( ambient );

    const pointLight = new THREE.PointLight( 0xffffff, 1000, 1000, 1 );
    pointLight.castShadow = true;
    pointLight.shadow.camera.near = 1;
    pointLight.shadow.camera.far = 700;
    pointLight.shadow.bias = 0.1; 
    pointLight.shadow.mapSize.width = 4096;
    pointLight.shadow.mapSize.height = 2048; 
    
    lightMesh.add( pointLight );

    const directionalLight = new THREE.DirectionalLight( 0xba8b8b, 0.5 );
    directionalLight.position.set( 1, 1, 1 );
    lightMesh.add( directionalLight );

    const directionalLight2 = new THREE.DirectionalLight( 0x8bbab4, 0.3 );
    directionalLight2.position.set( 1, 1, -1 );
    lightMesh.add( directionalLight2 );

}

//###########ANIMATION##############
// function render(frame) {
//     if (frame) {
//         controls.update();
//         let newTime = Date.now();
//         dt = newTime - time;
//         time = newTime;

//         initAnimation = Math.min(initAnimation + dt * 0.00025, 1);
//         // lightUpdate(dt, camera);
//         updateSimulator(dt);
//         updateParticles(dt);

//         composer.render();
//     }
// }

function animate() {
    renderer.setAnimationLoop( render );
}
  
function render() {
    controls.update();
    let newTime = Date.now();
    dt = newTime - time;
    time = newTime;

    initAnimation = Math.min(initAnimation + dt * 0.00025, 1);
    // lightUpdate(dt, camera);
    updateSimulator(dt);
    updateParticles(dt);

    const session = renderer.xr.getSession();
    const isXR = session !== null;

    if (isXR) {
        renderer.setSize(renderer.domElement.width, renderer.domElement.height);
    }
    composer.render();
}

//#########EVENT LISTENER#############
function onKeyUp(evt) {
    if(evt.keyCode === 32) {
        settings.speed = settings.speed === 0 ? 0.05 : 0;
        settings.dieSpeed = settings.dieSpeed === 0 ? 0.003 : 0;
    }
}

renderer.xr.addEventListener( 'sessionstart', function ( event ) {
    console.log('onAR')
} );

renderer.xr.addEventListener( 'sessionend', function ( event ) {
    console.log('offAR')
} );