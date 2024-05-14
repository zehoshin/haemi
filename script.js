import * as THREE from 'three'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ARButton } from 'three/addons/controls/ARButton.js';


//settings
const urlParams = new URLSearchParams(window.location.search);
const query = {
    amount: urlParams.get('amount') || '2k',
};

const amountMap = {
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
    speed: 0.2,
    dieSpeed: 0.002,
    radius: 0.8,
    curlSize: 0.015,
    attraction: -1.5,
    shadowDarkness: 0.66,
    color1: '#ff70e0',
    color2: '#8fff33',
};

let camera, simulCamera, scene, simulScene, renderer, controls;

let time = 0;
let dt;
let ray = new THREE.Ray();

//particles
let partcleMesh;
let color1, color2, tmpColor;
let texture;

//simulator
let copyShader, positionShader, textureDefaultPosition, positionRenderTarget, positionRenderTarget2;

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

init()

function init() {

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 10000);
    // camera.position.set(-440, 380, 800);
    camera.position.set( 0, 0, 0 );
    camera.lookAt(new THREE.Vector3( 0, 0, 0 ))
    // settings.camera = camera;
    // settings.cameraPosition = camera.position;

    renderer = new THREE.WebGLRenderer({
        antialias : true,
        alpha: true,
    });
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.xr.enabled = true;

    document.body.appendChild ( renderer.domElement );
    document.body.appendChild( ARButton.createButton( renderer ));

    initLight();
    scene.add(lightMesh);
    initSimulator();
    initParticles();
    scene.add(partcleMesh);

    const defaultLight = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 1 );
    defaultLight.position.set( 0.5, 1, 0.25 );
    scene.add( defaultLight );

    const geometry = new THREE.BoxGeometry( 0.1, 0.1, 0.1 );
    const material = new THREE.MeshStandardMaterial( { 
        color: 0xffffff,
        roughness: 1.0,
        metalness: 0.0,
    } );
    const cube = new THREE.Mesh( geometry, material );
    cube.position.z = -2;
    cube.receiveShadow = true;
    scene.add( cube );

    window.addEventListener('keyup', onKeyUp);

    controls = new OrbitControls( camera, renderer.domElement );
    controls.update();

    GUI
    const gui = new GUI();

    settings.amount = query.amount;

    gui.add(settings, 'amount', ['1k', '2k', '4k', '8k', '16k', '32k', '65k', '131k', '252k', '524k', '1m', '2m', '4m'])
    .onChange(function(value) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('amount', value);
        window.location.href = newUrl.href;
    });
    gui.add( settings, 'speed', 0, 3 );
    gui.add( settings, 'dieSpeed', 0, 0.05 );
    gui.add( settings, 'radius', 0, 3 );
    gui.add( settings, 'curlSize', 0, 0.05 );
    gui.add( settings, 'attraction', -20, 20 );
    gui.add( settings, 'shadowDarkness', 0, 1 );
    gui.addColor( settings, 'color1' );
    gui.addColor( settings, 'color2' );

    scene.traverse(function(child) {
        if (child.isMesh) {
            child.userData.fixedPosition = child.position.clone();
        }
    });

    time = Date.now();
    renderer.setAnimationLoop( render );

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
            initAnimation: { type: 'f', value: 0 }
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

function updateSimulator(dt) {
    if(settings.speed || settings.dieSpeed) {
        const r = 200;
        const h = 60;
        
        let autoClearColor = renderer.autoClearColor;
        renderer.autoClearColor = false;

        const deltaRatio = dt / 16.6667;

        positionShader.uniforms.speed.value = settings.speed * deltaRatio;
        positionShader.uniforms.dieSpeed.value = settings.dieSpeed * deltaRatio;
        positionShader.uniforms.radius.value = settings.radius;
        positionShader.uniforms.curlSize.value = settings.curlSize;
        positionShader.uniforms.attraction.value = settings.attraction;
        positionShader.uniforms.initAnimation.value = initAnimation;

        // positionShader.uniforms.mouse3d.value.copy(settings.mouse3d);
        followPointTime += dt * 0.001 * settings.speed;
        followPoint.set(
            Math.cos(followPointTime) * r,
            Math.cos(followPointTime * 4.0) * h,
            Math.sin(followPointTime * 2.0) * r
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
function initParticles() {

    tmpColor = new THREE.Color();
    color1 = new THREE.Color(settings.color1);
    color2 = new THREE.Color(settings.color2);
    partcleMesh = createParticleMesh();
    partcleMesh.visible = false;

}

function getRandomAdjacentColor(hex, range = 0.3) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    r = Math.min(1, Math.max(0, r + (Math.random() * range - range / 2)));
    g = Math.min(1, Math.max(0, g + (Math.random() * range - range / 2)));
    b = Math.min(1, Math.max(0, b + (Math.random() * range - range / 2)));

    return new Float32Array([r, g, b]);
}

function createParticleMesh() {
    var position = new Float32Array(AMOUNT * 3);
    var ranRotation = new Float32Array(AMOUNT);
    var ranColor1 = new Float32Array(AMOUNT * 3);
    var ranColor2 = new Float32Array(AMOUNT * 3);
    
    var i3;
    for(var i = 0; i < AMOUNT; i++ ) {
        i3 = i * 3;
        position[i3 + 0] = (i % TEXTURE_WIDTH) / TEXTURE_WIDTH;
        position[i3 + 1] = ~~(i / TEXTURE_WIDTH) / TEXTURE_HEIGHT;

        ranRotation[i] = Math.random() * 360.0;

        var ranColor1Obj = getRandomAdjacentColor(settings.color1);

        ranColor1[i3 + 0] = ranColor1Obj[0];  // R
        ranColor1[i3 + 1] = ranColor1Obj[1];  // G
        ranColor1[i3 + 2] = ranColor1Obj[2];  // B

        var ranColor2Obj = getRandomAdjacentColor(settings.color2);

        ranColor2[i3 + 0] = ranColor2Obj[0];  // R
        ranColor2[i3 + 1] = ranColor2Obj[1];  // G
        ranColor2[i3 + 2] = ranColor2Obj[2];  // B
    }

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.BufferAttribute( position, 3 ));
    geometry.setAttribute( 'ranRotation', new THREE.BufferAttribute(ranRotation, 1))
    geometry.setAttribute( 'ranColor1', new THREE.BufferAttribute(ranColor1, 3))
    geometry.setAttribute( 'ranColor2', new THREE.BufferAttribute(ranColor2, 3))

    var material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
            THREE.UniformsLib.shadowmap,
            {
                texturePosition: { type: 't', value: null },
                particleTexture: { type: 't', value: texture },
                color1: { type: 'c', value: null },
                color2: { type: 'c', value: null },
            }
        ]),
        vertexShader: document.getElementById( 'particlesVert' ).textContent,
        fragmentShader: document.getElementById( 'particlesFrag' ).textContent,
        blending: THREE.NoBlending
    });
    material.uniforms.color1.value = color1;
    material.uniforms.color2.value = color2;


    var paticlesMesh = new THREE.Points( geometry, material );

    paticlesMesh.customDistanceMaterial = new THREE.ShaderMaterial( {
        uniforms: {
            lightPos: { type: 'v3', value: new THREE.Vector3( 0, 0, 0 ) },
            texturePosition: { type: 't', value: null },
            particleTexture: { type: 't', value: texture },
        },
        vertexShader: document.getElementById( 'particlesDistanceVert' ).textContent,
        fragmentShader: document.getElementById( 'particlesDistanceFrag' ).textContent,
        depthTest: true,
        depthWrite: true,
        side: THREE.BackSide,
        blending: THREE.NoBlending
    });

    paticlesMesh.castShadow = true;
    paticlesMesh.receiveShadow = true;

    return paticlesMesh;
}

function updateParticles() {
    var mesh;
    partcleMesh.visible = true;

    tmpColor.setStyle(settings.color1);
    color1.lerp(tmpColor, 0.05);

    tmpColor.setStyle(settings.color2);
    color2.lerp(tmpColor, 0.05);

    mesh = partcleMesh;
    mesh.material.uniforms.texturePosition.value = positionRenderTarget.texture;
    mesh.customDistanceMaterial.uniforms.texturePosition.value = positionRenderTarget.texture;
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
function render(frame) {
    if (frame) {
        controls.update();
        let newTime = Date.now();
        dt = newTime - time;
        time = newTime;

        initAnimation = Math.min(initAnimation + dt * 0.00025, 1);
        // lightUpdate(dt, camera);

        updateSimulator(dt);
        updateParticles();

        scene.traverse(function(child) {
            if (child.isMesh && child.userData.fixedPosition) {
                const fixedPosition = child.userData.fixedPosition.clone();
                const worldPosition = camera.localToWorld(fixedPosition);
                child.position.copy(worldPosition);
            }
        });

        renderer.render(scene, camera);
    }
}


//#########EVENT LISTENER#############
function onKeyUp(evt) {
    if(evt.keyCode === 32) {
        settings.speed = settings.speed === 0 ? 0.05 : 0;
        settings.dieSpeed = settings.dieSpeed === 0 ? 0.003 : 0;
    }
}
