import * as THREE from 'three'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';

import { FakeGlowMaterial } from 'three/addons/materials/FakeGlowMaterial.js';

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
let sphereMesh;

//simulator
let copyShader, positionShader, textureDefaultPosition, positionRenderTarget, positionRenderTarget2, rotationTexture, scaleTexture, scaleTexture2;

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
let colorIndices, glowTimings;

const params = {
    exposure: 1,
    strength: 5.0,
    threshold: 0,
    radius: 1.0,
};

let composer, sceneTarget, copyPass, combinePass, bloomComposer;
let renderTarget;

let onARSession = false;

let reticle, controller;
let hitTestSource = null;
let hitTestSourceRequested = false;

let lastValidPosition = new THREE.Vector3();


init()

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x000000 );

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set( 0, 10, 8 );
    // camera.position.set(-440, 380, 800);
    // camera.position.set( 0, 500, 600 );

    // camera.lookAt(new THREE.Vector3( 0, 0, 0 ))
    // settings.camera = camera;
    // settings.cameraPosition = camera.position;

    renderer = new THREE.WebGLRenderer({
        antialias : true,
        alpha: true,
        depth: true,
    });
    renderer.debug.checkShaderErrors = false;
    renderer.autoClear = false;
    renderer.autoClearDepth = false;

    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.xr.enabled = true;
    renderer.setClearColor( 0x000000, 1.0 )

    document.body.appendChild ( renderer.domElement );
    document.body.appendChild( ARButton.createButton( renderer, { requiredFeatures: [ 'hit-test' ] } ));

    //

    initLight();
    scene.add(lightMesh);
    initSimulator();
    loadGLBModel();

    
    function onSelect() {
        if (reticle.visible) {
            if (!particleMesh) {
                particleMesh = createParticleMesh();
            }
    
            // reticle의 행렬을 위치, 회전, 스케일로 분해
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();
    
            reticle.matrix.decompose(position, quaternion, scale);
    
            // particleMesh의 위치, 회전, 스케일을 reticle의 값으로 설정
            particleMesh.position.copy(position);
            // particleMesh.quaternion.copy(quaternion);
            // particleMesh.scale.copy(scale);
    
            // 유효한 위치를 마지막 위치로 저장
            lastValidPosition.copy(position);
    
            // scene에 particleMesh 추가
            scene.add(particleMesh);
        }
    }

    controller = renderer.xr.getController( 0 );
    controller.addEventListener( 'select', onSelect );
    scene.add( controller );

    reticle = new THREE.Mesh(
        new THREE.RingGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ),
        new THREE.MeshBasicMaterial()
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add( reticle );

    // const defaultLight = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 3 );
    // defaultLight.position.set( 0.5, 1, 0.25 );
    // scene.add( defaultLight );

    // const loader = new GLTFLoader();
    // loader.load(
    //     './src/models/scene3.glb',
    //     function ( gltf ) {
    //         let scaleFactor = 1;
    //         gltf.scene.position.y = -1.5;
    //         gltf.scene.position.z = 6;
    //         gltf.scene.scale.set ( scaleFactor, scaleFactor, scaleFactor);
    //         scene.add( gltf.scene );
    //     },
    // );

    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    const sphereMaterial = new FakeGlowMaterial();
    const instancedMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    // scene.add(instancedMesh);


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

    time = Date.now();
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
    scaleTexture2 = createScaleTexture2();
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
        scales[i * 4 + 0] = Math.random() * 0.6 + 2.0; 
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

function createScaleTexture2() {
    const scales = new Float32Array(AMOUNT * 4);
    for (let i = 0; i < AMOUNT; i++) {
        scales[i * 4 + 0] = Math.random() * 0.6 + 10; 
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
        const r = 250;
        const h = 25;
        
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
        particleMesh.position.set(0,0,0)
        const scaleFator = 0.011
        particleMesh.scale.set(scaleFator, scaleFator, scaleFator)

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
            ambientLightIntensity: { value: 1.0 },
            metalness: { value: 0.0 },
            roughness: { value: 1.0 }, 
            glowIntensity: { value: 1.0 }, 
        },
        transparent: true,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, AMOUNT);
    mesh.receiveShadow = true;

    colorIndices = new Float32Array(AMOUNT);
    glowTimings = new Float32Array(AMOUNT);  

    for (let i = 0; i < AMOUNT; i++) {
        colorIndices[i] = Math.random();
        glowTimings[i] = Math.random() * 100.0;
    }

    geometry.setAttribute('colorIndex', new THREE.InstancedBufferAttribute(colorIndices, 1));
    geometry.setAttribute('glowTiming', new THREE.InstancedBufferAttribute(glowTimings, 1)); 

    return mesh;
}

function updateParticles(dt) {
    if (!particleMesh) return;

    particleMesh.material.uniforms.texturePosition.value = positionRenderTarget.texture;
    particleMesh.material.uniforms.time.value += dt * 0.01;;
    particleMesh.material.uniforms.glowIntensity.value = Math.sin(time * 0.01) * 0.2;
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

function animate() {
    renderer.setAnimationLoop( render );
}
  
function render(timestamp, frame) {
    controls.update();
    let newTime = Date.now();
    dt = newTime - time;
    time = newTime;

    initAnimation = Math.min(initAnimation + dt * 0.00025, 1);
    // lightUpdate(dt, camera);
    updateSimulator(dt);
    updateParticles(dt);

    if ( frame ) {

        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();
        if ( hitTestSourceRequested === false ) {
            session.requestReferenceSpace( 'viewer' ).then( function ( referenceSpace ) {
                session.requestHitTestSource( { space: referenceSpace } ).then( function ( source ) {
                    hitTestSource = source;
                } );
            } );
            session.addEventListener( 'end', function () {
                hitTestSourceRequested = false;
                hitTestSource = null;
            } );
            hitTestSourceRequested = true;
        }
        if ( hitTestSource ) {
            const hitTestResults = frame.getHitTestResults( hitTestSource );
            if ( hitTestResults.length ) {
                const hit = hitTestResults[ 0 ];
                reticle.visible = true;
                reticle.matrix.fromArray( hit.getPose( referenceSpace ).transform.matrix );
            } else {
                reticle.visible = false;
            }
        }
    }
    if (!reticle.visible && particleMesh) {
        particleMesh.position.copy(lastValidPosition);
    }

    scene.traverse( function( object ) {
        object.frustumCulled = false;
    } );
    renderer.render( scene, camera );
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