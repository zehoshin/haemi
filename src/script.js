import * as THREE from 'three'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import { ARButton } from 'three/addons/webxr/ARButton.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'

let predictScene = '';
let isSkipped = false;
let fromScene1 = false;

const overlay = document.createElement( 'div' );
const log = document.createElement('div');
log.id = 'log';

const settings = {
    //amount
    textureWidth: 32,
    textureHeight: 32, 

    //simul
    speed: 0.5,
    dieSpeed: 0.001,
    radius: 1.5,
    curlSize: 0.015,
    attraction: -2.0,
    tornadoStrength: 2.0,
    circleRadius: 0,
    circleHeight: 25,

    //color
    lightIntensity: 0.7,
    glowIntensity: 0.2,
    metalness: 0.3,
    roughness: 1.0,
    color1: '#cfd945',
    color2: '#448717',
    parOpacity: 0.0,
    
    //scale
    currentModel: 'Petal',
    currentScene: 'scene1',
    scaleFactor: 0.6,
    varScaleFactor: 0.6,
    wholeScale: 0.006,

    //glow
    falloff: 0.0,
    glowInternalRadius: 0.0,
    glowColor: '#66ff00',
    glowSharpness: 0.0,
    opacity: 0.0,
};

const presets = {
    scene1: {
        //amount
        textureWidth: 64,
        textureHeight: 64, 

        //simul
        speed: 0.5,
        dieSpeed: 0.001,
        radius: 1.5,
        curlSize: 0.015,
        attraction: -2.0,
        tornadoStrength: 2.0,
        circleRadius: 600,
        circleHeight: 25,

        //color
        lightIntensity: 0.7,
        glowIntensity: 0.2,
        metalness: 0.3,
        roughness: 1.0,
        color1: '#cfd945',
        color2: '#448717',
        parOpacity: 1.0,
        
        //scale
        currentModel: 'Petal',
        currentScene: 'scene1',
        scaleFactor: 0.6,
        varScaleFactor: 0.6,
        wholeScale: 0.006,

        //glow
        falloff: 0.0,
        glowInternalRadius: 0.0,
        glowColor: '#66ff00',
        glowSharpness: 0.0,
        opacity: 0.005,
    },
    scene2: {
        //amount
        textureWidth: 16,
        textureHeight: 16, 

        //simul
        speed: 0.1,
        dieSpeed: 0.0,
        radius: 10.0,
        curlSize: 0.015,
        attraction: -2.0,
        tornadoStrength: 2.0,
        circleRadius: 1000,
        circleHeight: 25,

        //color
        lightIntensity: 0.7,
        glowIntensity: 0.2,
        metalness: 0.3,
        roughness: 1.0,
        color1: '#f8c75d',
        color2: '#ebd6f5',
        parOpacity: 1.0,

        //scale
        currentModel: 'Petal',
        currentScene: 'scene2',
        scaleFactor: 0.6,
        varScaleFactor: 0.6,
        wholeScale: 0.006,

        //glow
        falloff: 0.0,
        glowInternalRadius: 0.0,
        glowColor: '#ff7b00',
        glowSharpness: 0.0,
        opacity: 0.012,
    },
    scene3: {
        //amount
        textureWidth: 32,
        textureHeight: 32,

        //simul
        speed: 0.8,
        dieSpeed: 0.001,
        radius: 1.5,
        curlSize: 0.015,
        attraction: -2.0,
        tornadoStrength: 3.0,
        circleRadius: 550,
        circleHeight: 10,

        //color
        lightIntensity: 1.0,
        glowIntensity: 0.2,
        metalness: 0.3,
        roughness: 1.0,
        color1: '#bb00ff',
        color2: '#f5d6eb',
        parOpacity: 1.0,

        //scale
        currentModel: 'flower',
        currentScene: 'scene3',
        scaleFactor: 2,
        varScaleFactor: 0.6,
        wholeScale: 0.006,

        //glow
        falloff: 0.0,
        glowInternalRadius: 0.0,
        glowColor: '#d400ff',
        glowSharpness: 0.0,
        opacity: 0.06,
    },
    scene4: {
        //amount
        textureWidth: 32,
        textureHeight: 32,

        //simul
        speed: 0.75,
        dieSpeed: 0.004,
        radius: 0.75,
        curlSize: 0.015,
        attraction: -3.0,
        tornadoStrength: 3.3,
        circleRadius: 600,
        circleHeight: 25,

        //color
        lightIntensity: 1.0,
        glowIntensity: 0.2,
        metalness: 0.3,
        roughness: 1.0,
        color1: '#fbff00',
        color2: '#f5d6eb',
        parOpacity: 1.0,

        //scale
        currentModel: 'butterfly',
        currentScene: 'scene4',
        scaleFactor: 0.3,
        varScaleFactor: 1.0,
        wholeScale: 0.006,

        //glow
        falloff: 0.0,
        glowInternalRadius: 0.0,
        glowColor: '#ffa200',
        glowSharpness: 0.0,
        opacity: 0.06,
    },
};

//frame animation
const fps = 24;
const interval = 1000 / fps; // 각 프레임 간의 시간 (밀리초)
let lastTime = performance.now();
let frameCount = 0;
const maxFrame = 2880; 
const angleIncrementPerFrame = -360 / maxFrame;
let currentSceneLoaded = '';
let currentParticleMesh = '';

let vinyl = document.createElement('div');
vinyl.id = 'vinyl';
let thumbnailVideo = document.createElement('video');
thumbnailVideo.id = 'thumbnail';
let thumbnailBack = document.createElement('div');
thumbnailBack.id = 'thumbnail_back';

let isDragging = false;
let startAngle = 0;
let startX = 0;
let currentAngle = 0;

thumbnailVideo.src = './src/thumbnail_video.mp4';

thumbnailVideo.style.display = 'none';
thumbnailBack.style.display = 'none';

function updateThumbnail() {
    const frameIndex = Math.floor(animationParams.frame / 4);
    const videoTime = frameIndex / 6;
    thumbnailVideo.currentTime = videoTime;
}

function onDragStart(e) {
    isDragging = true;
    startX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
    startAngle = currentAngle;
    document.body.style.cursor = 'grabbing';
    thumbnailVideo.style.display = 'block';
    thumbnailBack.style.display = 'block';

}

function onDragMove(e) {
    if (isDragging) {
        const currentX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
        const dx = currentX - startX;
        currentAngle = startAngle + dx;
        vinyl.style.transform = `translateX(-50%) rotate(${currentAngle}deg)`;

        const angleChange = currentAngle - startAngle;
        const frameChange = Math.round(angleChange / angleIncrementPerFrame);

        animationParams.frame = (animationParams.frame + frameChange) % maxFrame;
        if (animationParams.frame < 0) {
            animationParams.frame += maxFrame;
        }
        
        startAngle = currentAngle;
        startX = currentX;

        checkAndLoadParticleMesh(animationParams.frame);
        updateThumbnail();

    }
}
function onDragEnd() {
    isDragging = false;
    document.body.style.cursor = 'default';
    thumbnailVideo.style.display = 'none';
    thumbnailBack.style.display = 'none';
}

vinyl.addEventListener('mousedown', onDragStart);
vinyl.addEventListener('touchstart', onDragStart, { passive: true });
document.addEventListener('mousemove', onDragMove);
document.addEventListener('touchmove', onDragMove, { passive: true });
document.addEventListener('mouseup', onDragEnd);
document.addEventListener('touchend', onDragEnd);


const animationParams = {
    frame: 0,
    isPlaying: false,
};

let TEXTURE_WIDTH = settings.textureWidth;
let TEXTURE_HEIGHT = settings.textureHeight;
let AMOUNT = TEXTURE_WIDTH * TEXTURE_HEIGHT;

const models = [];
const modelNames = ['Petal', 'flower', 'butterfly'];
const modelPaths = [
    './src/models/Petal.glb',
    './src/models/flower.glb', 
    './src/models/butterfly.glb'
];

const sceneNames = ['scene1', 'scene2', 'scene3', 'scene4'];

let camera, simulCamera, scene, simulScene, renderer, controls, gui;
const loader = new GLTFLoader();

let time = Date.now();
let dt;

//particles
let particleMesh;
let glowMesh;

//simulator
let copyShader, positionShader, textureDefaultPosition, positionRenderTarget, positionRenderTarget2, rotationTexture, scaleTexture;

let simulMesh;
let followPoint;
let followPointTime = 0;
let initAnimation = 0;

//instance
let glbModel;
let colorIndices, glowTimings;

//webXR
let reticle, controller;
let hitTestSource = null;
let hitTestSourceRequested = false;

const video = document.getElementById('video');

init()

function init() {
    //set Render Scene

    scene = new THREE.Scene();
    if (window.innerWidth > 640) {
    scene.background = new THREE.Color( 0x000000 );
    }

    camera = new THREE.PerspectiveCamera( 90, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set( -0.3326, 6.2612, 
        8.2365 );
    camera.rotation.set( 
        -0.7213, -0.0254, -0.0223 );

    renderer = new THREE.WebGLRenderer({
        antialias : true,
        alpha: true,
        depth: true,
    });
    renderer.debug.checkShaderErrors = false;
    renderer.autoClear = false;
    renderer.autoClearDepth = false;

    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.xr.enabled = true;
    renderer.setClearColor( 0x000000, 1.0 )

    // if (window.innerWidth > 640) {
    document.body.appendChild ( renderer.domElement );
    // }
    
    //webXR

    // controller = renderer.xr.getController( 0 );
    // controller.addEventListener( 'select', onSelect );
    // scene.add( controller );

    reticle = new THREE.Mesh(
        new THREE.RingGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ),
        new THREE.MeshBasicMaterial()
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add( reticle );

    //light

    const defaultLight = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 3 );
    defaultLight.position.set( 0.5, 1, 0.25 );
    scene.add( defaultLight );

    //controls

    window.addEventListener('keyup', onKeyUp);
    controls = new OrbitControls( camera, renderer.domElement );
    controls.update();
    window.addEventListener('resize', onWindowResize, false);

    overlay.id = 'overlay';
    overlay.style.display = 'none';
    document.body.appendChild( overlay );

    //GUI
    initGUI();
    initGUIforAR();

    //init Simulator & Particles & Glow
    initSimulator();
    loadParticlesGLB();
    initGlowMesh();


    animate();
    requestAnimationFrame(frameAnimation);
    setInterval(logFPS, 1000);

    document.body.appendChild( createButton( renderer, { requiredFeatures: [ 'hit-test' ] } ));
}

//#########SIMULATION##########
function initSimulator() {

    followPoint = new THREE.Vector3();

    simulScene = new THREE.Scene();
    simulCamera = new THREE.Camera();
    // simulCamera.position.z = 1;

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

function copyTexture(inputTexture, outputRenderTarget) {
    simulMesh.material = copyShader;
    copyShader.uniforms.texture.value = inputTexture;

    var currentRenderTarget = renderer.getRenderTarget();
    var currentXrEnabled = renderer.xr.enabled;

    renderer.xr.enabled = false;

    renderer.setRenderTarget(outputRenderTarget);
    renderer.clear();
    renderer.render(simulScene, simulCamera);

    renderer.xr.enabled = currentXrEnabled;
    renderer.setRenderTarget(currentRenderTarget);
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

function createScaleTexture(varScaleFactor, scaleFactor) {
    const scales = new Float32Array(AMOUNT * 4);
    for (let i = 0; i < AMOUNT; i++) {
        scales[i * 4 + 0] = Math.random() * varScaleFactor + scaleFactor; 
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

function updateSimulator(dt) {
    if(settings.speed || settings.dieSpeed) {
        let r = settings.circleRadius;
        let h = settings.circleHeight;
        
        let autoClearColor = renderer.autoClearColor;
        renderer.autoClearColor = false;

        // const deltaRatio = dt / 16.6667;
        const deltaRatio = 1;

        positionShader.uniforms.resolution.value = new THREE.Vector2( TEXTURE_WIDTH, TEXTURE_HEIGHT ),
        positionShader.uniforms.speed.value = settings.speed * deltaRatio;
        positionShader.uniforms.dieSpeed.value = settings.dieSpeed * deltaRatio;
        positionShader.uniforms.radius.value = settings.radius;
        positionShader.uniforms.curlSize.value = settings.curlSize;
        positionShader.uniforms.attraction.value = settings.attraction;
        positionShader.uniforms.initAnimation.value = initAnimation;
        positionShader.uniforms.tornadoStrength.value = settings.tornadoStrength;
        
        copyShader.uniforms.resolution.value = new THREE.Vector2( TEXTURE_WIDTH, TEXTURE_HEIGHT ),

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

    renderer.xr.enabled = false;

    renderer.setRenderTarget(positionRenderTarget);
    renderer.clear();
    renderer.render(simulScene, simulCamera);

    renderer.xr.enabled = currentXrEnabled;
    renderer.setRenderTarget(currentRenderTarget);
}

function updateTexture() {
    TEXTURE_WIDTH = settings.textureWidth;
    TEXTURE_HEIGHT = settings.textureHeight;
    AMOUNT = TEXTURE_WIDTH * TEXTURE_HEIGHT;

    // Update the simulator render target
    const oldPositionRenderTarget = positionRenderTarget;
    const oldPositionRenderTarget2 = positionRenderTarget2;

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

    copyTexture(oldPositionRenderTarget.texture, positionRenderTarget);
    copyTexture(oldPositionRenderTarget2.texture, positionRenderTarget2);

    // Update the scale texture
    updateScaleTexture();

    // Update the particle mesh
    const modelIndex = modelNames.indexOf(settings.currentModel);
    updateParticleMesh(models[modelIndex]);
}

function updateScaleTexture() {
    const scales = new Float32Array(AMOUNT * 4);
    for (let i = 0; i < AMOUNT; i++) {
        scales[i * 4 + 0] = Math.random() * settings.varScaleFactor + settings.scaleFactor;
        scales[i * 4 + 1] = 0.0;
        scales[i * 4 + 2] = 0.0;
        scales[i * 4 + 3] = 1.0;
    }
    const texture = new THREE.DataTexture(scales, TEXTURE_WIDTH, TEXTURE_HEIGHT, THREE.RGBAFormat, THREE.FloatType);
    texture.needsUpdate = true;
    texture.generateMipmaps = false;
    texture.flipY = false;

    if (particleMesh) {
        particleMesh.material.uniforms.textureScale.value = texture;
    }
    if (glowMesh) {
        glowMesh.material.uniforms.textureScale.value = texture;
    }
}

//##########PARTICLES#############
function loadParticlesGLB() {
    const loader = new GLTFLoader();
    modelPaths.forEach(path => {
        loader.load(path, function(gltf) {
            if (path === './src/models/butterfly.glb') {
                gltf.scene.children.forEach(child => {
                    models.push(child);
                });

            } else {
                const model = gltf.scene.children[0];
                models.push(model);
            }
            console.log(`${path} loaded and added to models array.`);

            if (models.length >= modelPaths.length) {
                initParticles();
            }
        });
    });
    console.log(models)
}

function initParticles() {
    if (models.length === 0) {
        console.error("No GLB models have been loaded.");
        return;
    }
    const glbModel = models[modelNames.indexOf(settings.currentModel)];

    particleMesh = createParticleMesh(glbModel);
    particleMesh.renderOrder = 2;
    // scene.add(particleMesh);
}

function createParticleMesh(model) {
    const geometries = [];
    model.traverse((child) => {
        if (child.isMesh) {
            geometries.push(child.geometry);
        }
    });
    const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
    // const geometry = model.geometry;
    const material = new THREE.ShaderMaterial({
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader').textContent,
        uniforms: {
            resolution: { type: 'v2', value: new THREE.Vector2( TEXTURE_WIDTH, TEXTURE_HEIGHT ) },
            texturePosition: { value: positionRenderTarget.texture },
            textureRotation: { value: rotationTexture },
            textureScale: { value: createScaleTexture(settings.varScaleFactor, settings.scaleFactor) }, 
            time: { value: 0.0 },
            color1: { value: new THREE.Color(settings.color1) }, 
            color2: { value: new THREE.Color(settings.color2) },
            lightPosition: { value: new THREE.Vector3(10, 10, 10) },
            ambientLightIntensity: { value: 1.0 },
            metalness: { value: 0.0 },
            roughness: { value: 1.0 }, 
            glowIntensity: { value: 1.0 }, 
            meshPosition: { value: new THREE.Vector3() },
            opacity: { value: settings.parOpacity }
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
    });
    const mesh = new THREE.InstancedMesh(mergedGeometry, material, AMOUNT);

    colorIndices = new Float32Array(AMOUNT);
    glowTimings = new Float32Array(AMOUNT);  

    for (let i = 0; i < AMOUNT; i++) {
        colorIndices[i] = Math.random();
        glowTimings[i] = Math.random() * 100.0;
    }

    mergedGeometry.setAttribute('colorIndex', new THREE.InstancedBufferAttribute(colorIndices, 1));
    mergedGeometry.setAttribute('glowTiming', new THREE.InstancedBufferAttribute(glowTimings, 1)); 

    if (animationParams.frame >= 2160) {
        const fixedRotation = new Float32Array(AMOUNT * 4);
        for (let i = 0; i < AMOUNT; i++) {
            fixedRotation[i * 4 + 0] = Math.PI / 2;
            fixedRotation[i * 4 + 1] = 0;
            fixedRotation[i * 4 + 2] = 0;
            fixedRotation[i * 4 + 3] = Math.random();
        }
        const fixedRotationTexture = new THREE.DataTexture(fixedRotation, TEXTURE_WIDTH, TEXTURE_HEIGHT, THREE.RGBAFormat, THREE.FloatType);
        fixedRotationTexture.needsUpdate = true;
        fixedRotationTexture.generateMipmaps = false;
        fixedRotationTexture.flipY = false;
        mesh.material.uniforms.textureRotation.value = fixedRotationTexture;

        const butterflyVertexShader = `
        uniform sampler2D texturePosition;
        uniform sampler2D textureRotation;
        uniform sampler2D textureScale;
        uniform vec2 resolution;
        uniform float time;
        uniform vec3 meshPosition;
        attribute float colorIndex;
        attribute float glowTiming;
        varying float vColorIndex;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vGlowTiming;
        
        mat3 rotationMatrix(vec3 rotation) {
            float cosX = cos(rotation.x);
            float sinX = sin(rotation.x);
            float cosY = cos(rotation.y);
            float sinY = sin(rotation.y);
            float cosZ = cos(rotation.z);
            float sinZ = sin(rotation.z);
        
            mat3 rotX = mat3(
                1.0, 0.0, 0.0,
                0.0, cosX, -sinX,
                0.0, sinX, cosX
            );
        
            mat3 rotY = mat3(
                cosY, 0.0, sinY,
                0.0, 1.0, 0.0,
                -sinY, 0.0, cosY
            );
        
            mat3 rotZ = mat3(
                cosZ, -sinZ, 0.0,
                sinZ, cosZ, 0.0,
                0.0, 0.0, 1.0
            );
        
            return rotZ * rotY * rotX;
        }
        
        mat3 lookAt(vec3 direction, vec3 up) {
            vec3 z = normalize(direction);
            vec3 x = normalize(cross(up, z));
            vec3 y = cross(z, x);
        
            return mat3(x, y, z);
        }
        
        void main() {
            vColorIndex = colorIndex;
            vGlowTiming = glowTiming;
        
            vNormal = normalize(normalMatrix * normal);
        
            vec2 uv = vec2(gl_InstanceID % int(resolution.x), gl_InstanceID / int(resolution.x)) / resolution;
            vec4 positionInfo = texture2D(texturePosition, uv);
            vec3 positionOffset = positionInfo.xyz;
            vec3 rotationAngles = texture2D(textureRotation, uv).xyz;
            float baseScale = texture2D(textureScale, uv).r;
        
            float life = positionInfo.a;
            float scale = baseScale * smoothstep(0.0, 0.5, life);
        
            vec3 rotatedPosition;
            vec3 direction = normalize(meshPosition - positionOffset);
            vec3 up = vec3(0.0, 1.0, 0.0);
            if (rotationAngles.x == ${Math.PI / 2}) { 
                mat3 lookAtMatrix = lookAt(direction, up);
                rotatedPosition = lookAtMatrix * (position * scale);
            } else {
                vec3 timeRotation = rotationAngles + time * vec3(0.1, 0.2, 0.3);
                mat3 rotationMat = rotationMatrix(timeRotation);
                rotatedPosition = rotationMat * position * scale;
            }
        
            vec3 transformedPosition = rotatedPosition + positionOffset;
        
            vPosition = (modelViewMatrix * vec4(transformedPosition, 1.0)).xyz;
            vec4 mvPosition = modelViewMatrix * vec4(transformedPosition, 1.0);
            gl_Position = projectionMatrix * mvPosition;
        }
        `;
        mesh.material.vertexShader = butterflyVertexShader;
        mesh.material.needsUpdate = true;
    }
    
    return mesh;
}

function updateParticleMesh(model) {
    if (particleMesh && glowMesh) {
        scene.remove(particleMesh);
        scene.remove(glowMesh);
    }
    particleMesh = createParticleMesh(model);
    scene.add(particleMesh);
    initGlowMesh()
}

function updateParticles(dt) {
    if (!particleMesh) return;

    particleMesh.material.uniforms.resolution.value = new THREE.Vector2( TEXTURE_WIDTH, TEXTURE_HEIGHT );
    particleMesh.material.uniforms.texturePosition.value = positionRenderTarget.texture;
    particleMesh.material.uniforms.time.value += dt * 0.01;;
    particleMesh.material.uniforms.color1.value = new THREE.Color(settings.color1);
    particleMesh.material.uniforms.color2.value = new THREE.Color(settings.color2);
    particleMesh.material.uniforms.ambientLightIntensity.value = settings.lightIntensity;
    particleMesh.material.uniforms.glowIntensity.value = Math.sin(time * 0.01) * settings.glowIntensity;
    particleMesh.material.uniforms.metalness.value = settings.metalness;
    particleMesh.material.uniforms.roughness.value = settings.roughness;
    particleMesh.material.uniforms.opacity.value = settings.parOpacity;

    particleMesh.scale.set(settings.wholeScale, settings.wholeScale, settings.wholeScale);
    particleMesh.material.uniformsNeedUpdate = true;

    glowMesh.material.uniforms.resolution.value = new THREE.Vector2( TEXTURE_WIDTH, TEXTURE_HEIGHT );
    glowMesh.material.uniforms.texturePosition.value = positionRenderTarget.texture;
    glowMesh.material.uniforms.falloff.value = settings.falloff;
    glowMesh.material.uniforms.glowInternalRadius.value = settings.glowInternalRadius;
    glowMesh.material.uniforms.glowColor.value = new THREE.Color(settings.glowColor);
    glowMesh.material.uniforms.glowSharpness.value = settings.glowSharpness;
    glowMesh.material.uniforms.opacity.value = settings.opacity;
    glowMesh.material.uniforms.scale.value = new THREE.Vector3(settings.wholeScale, settings.wholeScale, settings.wholeScale);
    glowMesh.scale.set(settings.wholeScale, settings.wholeScale, settings.wholeScale);

    glowMesh.instanceMatrix.needsUpdate = true;
}

function initGlowMesh() {
    const sphereGeometry = new THREE.SphereGeometry(10, 8, 8);
    const sphereMaterial = new THREE.ShaderMaterial({
        vertexShader: document.getElementById('glowVertex').textContent,
        fragmentShader: document.getElementById('glowFragment').textContent,
        uniforms: {
            resolution: { type: 'v2', value: new THREE.Vector2( TEXTURE_WIDTH, TEXTURE_HEIGHT ) },
            texturePosition: { value: positionRenderTarget.texture },
            textureScale: { value: createScaleTexture(settings.varScaleFactor, settings.scaleFactor) }, 
            falloff: { value: 0.0 },
            glowInternalRadius: { value: 10.0 },
            glowColor: { value: new THREE.Color("#ffffff") },
            glowSharpness: { value: 0.0 },
            opacity: { value: 2.3 },
            scale: { value: new THREE.Vector3(settings.wholeScale, settings.wholeScale, settings.wholeScale) },
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
    
    glowMesh = new THREE.InstancedMesh(sphereGeometry, sphereMaterial, AMOUNT);
    glowMesh.scale.set(settings.wholeScale, settings.wholeScale, settings.wholeScale)
    glowMesh.renderOrder = 1;
    if (animationParams.isPlaying) {
    scene.add(glowMesh);
    }
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
    // if (animationParams.isPlaying && animationParams.frame < maxFrame) {
    updateSimulator(dt);
    updateParticles(dt);
    // }

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

    // if (!reticle.visible && particleMesh && glowMesh) {
    //     particleMesh.position.copy(lastValidPosition);
    //     glowMesh.position.copy(lastValidPosition);
    // }

    scene.traverse( function( object ) {
        object.frustumCulled = false;
    } );
    renderer.render( scene, camera );
}

//##########frame animation############
function frameAnimation() {
    if (animationParams.isPlaying && animationParams.frame < maxFrame) {
        requestAnimationFrame(frameAnimation);
    }
    const now = performance.now();
    const deltaTime = now - lastTime;

    if (deltaTime >= interval) {
        animationParams.frame += 1;
        frameCount += 1;
        lastTime = now - (deltaTime % interval);

        currentAngle = animationParams.frame * angleIncrementPerFrame;
        vinyl.style.transform = `translateX(-50%) rotate(${currentAngle}deg)`;
        updateThumbnail();
    }

    if (animationParams.isPlaying && animationParams.frame === 2880) {
        animationParams.isPlaying = false;
    }

    if (window.innerWidth > 640) {
    checkAndLoadScene(animationParams.frame);
    }
    checkAndLoadParticleMesh(animationParams.frame);

    if (animationParams.frame < 720) {

        //simul
        if (settings.speed < 0.5) {
            settings.speed += 0.002;
        } else if (settings.speed > 0.5) {
            settings.speed -= 0.002;
        }
        settings.dieSpeed = 0.001;
        if (settings.radius < 1.5) {
            settings.radius += 0.01;
        } else if (settings.radius > 1.5) {
            settings.radius -= 0.01;
        }
        settings.curlSize = 0.015;
        settings.attraction = -2.0;
        settings.tornadoStrength = 2.0;
        if (settings.circleRadius < 600) {
            settings.circleRadius += 1;
        } else if (settings.circleRadius > 600) {
            settings.circleRadius -= 1;
        }
        settings.circleHeight = 25;

        //color
        // settings.lightIntensity = 0.7;
        // settings.glowIntensity = 0.2;
        // settings.metalness = 0.3;
        // settings.roughness = 1.0;
        settings.color1 = '#cfd945';
        settings.color2 = '#448717';
        
        //scale
        settings.currentModel = 'Petal';
        settings.currentScene = 'scene1';
        if(settings.scaleFactor != 0.4) {
            settings.scaleFactor = 0.4;
            updateScaleTexture();
        }
        settings.varScaleFactor = 0.6;
        // settings.wholeScale = 0.006;

        //glow
        settings.falloff = 0.0;
        settings.glowInternalRadius = 0.0;
        settings.glowColor = '#66ff00';
        settings.glowSharpness = 0.0;

        if (predictScene != 'scene1' || isSkipped) {
            isSkipped = false;
            if (settings.opacity <= 0.008) {
                settings.opacity += 0.0001;
            } else if (settings.opacity >= 0.008) {
                settings.opacity -= 0.0001;
            }
            if (settings.parOpacity <= 1.0) {
                settings.parOpacity += 0.002;
            }
            if (settings.opacity >= 0.008 && settings.opacity <= 0.0081 && settings.parOpacity >= 1.0) {
                isSkipped = false;
                predictScene = 'scene1';
            }
        }

        if (animationParams.frame > 600 ) {
            if (settings.parOpacity >= 0.0) {
                settings.parOpacity -= 0.005;
            }
            if (settings.opacity >= 0.0) {
                settings.opacity -= 0.0001;
            }
            
        }
        if (animationParams.frame === 700) {
            fromScene1 = true;
        }
    }
    if (animationParams.frame >= 720 && animationParams.frame < 1440) {

        //simul
        if (settings.speed < 0.05) {
            settings.speed += 0.002;
        } else if (settings.speed > 0.05) {
            settings.speed -= 0.002;
        }
        settings.dieSpeed = 0.001;
        if (settings.radius < 10.0) {
            settings.radius += 0.01;
        }
        settings.curlSize = 0.015;
        settings.attraction = -2.0;
        settings.tornadoStrength = 3.0;
        if(fromScene1 && animationParams.frame === 720) {
            settings.circleRadius = 1000;
            fromScene1 = false;
        }
        if (settings.circleRadius < 800) {
            settings.circleRadius += 1;
        } else if (settings.circleRadius > 800) {
            settings.circleRadius -= 0.1;
        }
        settings.circleHeight = 25;

        //color
        // settings.lightIntensity = 0.7;
        // settings.glowIntensity = 0.2;
        // settings.metalness = 0.3;
        // settings.roughness = 1.0;
        settings.color1 = '#f8c75d';
        settings.color2 = '#ebd6f5';
        
        //scale
        settings.currentModel = 'Petal';
        settings.currentScene = 'scene2';
        if(settings.scaleFactor != 0.3) {
            settings.scaleFactor = 0.3;
            updateScaleTexture();
        }
        settings.varScaleFactor = 0.6;
        // settings.wholeScale = 0.006;

        //glow
        settings.falloff = 0.0;
        settings.glowInternalRadius = 0.0;
        settings.glowColor = '#ff7b00';
        settings.glowSharpness = 0.0;

        if (predictScene != 'scene2' || isSkipped) {
            isSkipped = false;
            if (settings.opacity <= 0.012) {
                settings.opacity += 0.0001;
            } else if (settings.opacity >= 0.012) {
                settings.opacity -= 0.0001;
            }
            if (settings.parOpacity <= 1.0) {
                settings.parOpacity += 0.002;
            } 
            if (settings.opacity >= 0.012 && settings.opacity <= 0.0013 && settings.parOpacity >= 1.0) {
                isSkipped = false;
                predictScene = 'scene2';
            }
        }

        if (animationParams.frame > 1320 ) {
            if (settings.parOpacity >= 0.0) {
                settings.parOpacity -= 0.005;
            }
            if (settings.opacity >= 0.0) {
                settings.opacity -= 0.0001;
            }
        }
    }
    if (animationParams.frame >= 1440 && animationParams.frame < 2160) {

        //simul
        if (settings.speed < 0.8) {
            settings.speed += 0.002;
        } else if (settings.speed > 0.8) {
            settings.speed -= 0.002;
        }
        settings.dieSpeed = 0.001;
        if (settings.radius < 1.5) {
            settings.radius += 0.02;
        } else if (settings.radius > 1.5) {
            settings.radius -= 0.02;
        }
        settings.curlSize = 0.015;
        settings.attraction = -2.0;
        settings.tornadoStrength = 3.0;
        if (settings.circleRadius < 550) {
            settings.circleRadius += 1;
        } else if (settings.circleRadius > 550) {
            settings.circleRadius -= 1;
        }
        settings.circleHeight = 25;

        //color
        // settings.lightIntensity = 1.0;
        // settings.glowIntensity = 0.2;
        // settings.metalness = 0.3;
        // settings.roughness = 1.0;
        settings.color1 = '#bb00ff';
        settings.color2 = '#f5d6eb';
        
        //scale
        settings.currentModel = 'flower';
        settings.currentScene = 'scene3';
        if(settings.scaleFactor != 2.0) {
            settings.scaleFactor = 2.0;
            updateScaleTexture();
        }
        settings.varScaleFactor = 0.6;
        // settings.wholeScale = 0.006;

        //glow
        settings.falloff = 0.0;
        settings.glowInternalRadius = 0.0;
        settings.glowColor = '#d400ff';
        settings.glowSharpness = 0.0;

        if (predictScene != 'scene3' || isSkipped) {
            isSkipped = false;
            if (settings.opacity <= 0.02) {
                settings.opacity += 0.0001;
            } else if (settings.opacity >= 0.02) {
                settings.opacity -= 0.0001;
            }
            if (settings.parOpacity <= 1.0) {
                settings.parOpacity += 0.002;
            }
            if (settings.opacity >= 0.02 && settings.opacity <= 0.021 && settings.parOpacity >= 1.0) {
                isSkipped = false;
                predictScene = 'scene3';
            }
        }

        if (animationParams.frame > 2040 ) {
            if (settings.parOpacity > 0.0) {
                settings.parOpacity -= 0.005;
            }
            if (settings.opacity >= 0.0) {
                settings.opacity -= 0.0001;
            }
        }
    }

    if (animationParams.frame >= 2160) {

        //simul
        if (settings.speed < 0.75) {
            settings.speed += 0.002;
        } else if (settings.speed > 0.75) {
            settings.speed -= 0.002;
        }

        if (settings.dieSpeed >= 0.004) {
            settings.dieSpeed -= 0.0002
        } else if (settings.dieSpeed <= 0.004) {
            settings.dieSpeed += 0.0002
        }
        if (settings.radius < 0.75) {
            settings.radius += 0.02;
        } else if (settings.radius > 0.75) {
            settings.radius -= 0.02;
        }
        settings.curlSize = 0.015;
        settings.attraction = -3.0;
        settings.tornadoStrength = 3.3;
        if (settings.circleRadius < 600) {
            settings.circleRadius += 1;
        } else if (settings.circleRadius > 600) {
            settings.circleRadius -= 1;
        }
        settings.circleHeight = 25;

        //color
        // settings.lightIntensity = 1.0;
        // settings.glowIntensity = 0.2;
        // settings.metalness = 0.3;
        // settings.roughness = 1.0;
        settings.color1 = '#fbff00';
        settings.color2 = '#f5d6eb';
        
        //scale
        settings.currentModel = 'butterfly';
        settings.currentScene = 'scene4';
        if(settings.scaleFactor != 0.3) {
            settings.scaleFactor = 0.3;
            updateScaleTexture();
        }
        settings.varScaleFactor = 0.6;
        // settings.wholeScale = 0.006;

        //glow
        settings.falloff = 0.0;
        settings.glowInternalRadius = 0.0;
        settings.glowColor = '#ffa200';
        settings.glowSharpness = 0.0;

        if (predictScene != 'scene4' || isSkipped) {
            if (settings.opacity <= 0.06) {
                settings.opacity += 0.0001;
            } else if (settings.opacity >= 0.06) {
                settings.opacity -= 0.0001;
            }
            if (settings.parOpacity <= 1.0) {
                settings.parOpacity += 0.002;
            }
            if (settings.opacity >= 0.06 && settings.opacity <= 0.061 && settings.parOpacity >= 1.0) {
                isSkipped = false;
                predictScene = 'scene4';
            }
        }

        if (animationParams.frame > 2760 ) {
            if (settings.parOpacity > 0.0) {
                settings.parOpacity -= 0.005;
            }
            if (settings.opacity >= 0.0) {
                settings.opacity -= 0.001;
            }
        }
    }
}

function logFPS() {
    console.log(`${frameCount} fps`);
    log.innerHTML = `${frameCount} fps`;

    frameCount = 0; 
}

function playAnimation() {
    if (!animationParams.isPlaying) {
        animationParams.isPlaying = true;
        lastTime = performance.now();
        if(!particleMesh && !glowMesh) {
            scene.add(particleMesh);
            scene.add(glowMesh);
        }
        frameAnimation();

        if (window.innerWidth > 640) {
        video.play();
        }
    }
}

function stopAnimation() {
    animationParams.isPlaying = false;
    if (window.innerWidth > 640) {
        video.pause();
    }
    isSkipped = true;
    // settings.speed = 0;
    // settings.dieSpeed = 0;
    // settings.tornadoStrength = 0;
}

function resetAnimation() {
    animationParams.isPlaying = false;
    animationParams.frame = 0;
    currentSceneLoaded = '';
    if (window.innerWidth > 640) {
        video.currentTime = 0 / fps;
        video.pause();
    }
    if (particleMesh && glowMesh) {
        scene.remove(particleMesh);
        scene.remove(glowMesh);
    }
    settings.parOpacity = 0;
    settings.opacity = 0;
}

function skipToFrame(frame) {
    isSkipped = true;
    animationParams.frame = frame;

    if (window.innerWidth > 640) {
    checkAndLoadScene(frame);
    }

    checkAndLoadParticleMesh(frame);
    playAnimation();

    if (window.innerWidth > 640) {
        video.currentTime = frame / fps;
        video.play();
    }
}

function checkAndLoadScene(frame) {
    let sceneToLoad = '';
    if (frame >= 0 && frame < 720) {
        sceneToLoad = 'scene1';
    } else if (frame >= 720 && frame < 1440) {
        sceneToLoad = 'scene2';
    } else if (frame >= 1440 && frame < 2160) {
        sceneToLoad = 'scene3';
    } else if (frame >= 2160 && frame < 2880) {
        sceneToLoad = 'scene4';
    }

    if (sceneToLoad && sceneToLoad !== currentSceneLoaded) {
        loadGLBScene(sceneToLoad);
        currentSceneLoaded = sceneToLoad;
    }
}

function checkAndLoadParticleMesh(frame) {
    let meshToLoad = '';
    if (frame >= 0 && frame < 720) {
        meshToLoad = 'Petal';
    } else if (frame >= 720 && frame < 1440) {
        meshToLoad = 'Petal';
    } else if (frame >= 1440 && frame < 2160) {
        meshToLoad = 'flower';
    } else if (frame >= 2160 && frame < 2880) {
        meshToLoad = 'butterfly';
    }

    if (meshToLoad && meshToLoad !== currentParticleMesh) {
        loadParticleMesh(meshToLoad);
        currentParticleMesh = meshToLoad;
    }
}

function loadParticleMesh(modelName) {
    const modelIndex = modelNames.indexOf(modelName);
    console.log(modelIndex)
    if (modelIndex !== -1) {
        updateParticleMesh(models[modelIndex]);
    }
}

//#########EVENT LISTENER#############
function onKeyUp(evt) {
    if(evt.keyCode === 32) {
        settings.speed = settings.speed === 0 ? 0.05 : 0;
        settings.dieSpeed = settings.dieSpeed === 0 ? 0.003 : 0;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


function onSelect() {
    if (reticle.visible) {
        if (!particleMesh) {
            particleMesh = createParticleMesh();
        }

        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();

        reticle.matrix.decompose(position, quaternion, scale);

        playAnimation();

        particleMesh.position.copy(position);
        particleMesh.rotation.copy(quaternion);

        glowMesh.position.copy(position);
        glowMesh.rotation.copy(quaternion);

        // lastValidPosition.copy(position);

        scene.add(particleMesh);
        scene.add(glowMesh);

    }
}

renderer.xr.addEventListener( 'sessionstart', function ( event ) {
    console.log('onAR')
    if(!particleMesh && !glowMesh) {
        scene.add(particleMesh);
        scene.add(glowMesh);
    }
} );

renderer.xr.addEventListener( 'sessionend', function ( event ) {
    console.log('offAR')
} );

function loadGLBScene(modelName) {
    const modelPaths = {
        'scene1': './src/models/scene1.glb',
        'scene2': './src/models/scene2.glb',
        'scene3': './src/models/scene3.glb',
        'scene4': './src/models/scene4.glb'
    };

    // Clear existing models
    if (glbModel) {
        scene.remove(glbModel);
    }

    loader.load(modelPaths[modelName], function (gltf) {
        glbModel = gltf.scene;
        let scaleFactor = 1;
        glbModel.position.y = -0.5;
        glbModel.position.z = 6;
        glbModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
        scene.add(glbModel);
    });
}

function initGUI() {
    gui = new GUI();

    const animationFolder = gui.addFolder( 'animation' );

    const skipFolder = gui.addFolder( 'skip' );
    // const presetFolder = gui.addFolder('Presets');
    // const saveFolder = gui.addFolder('Save Presets');
    const amountFolder = gui.addFolder( 'amount' );
    const simulFolder = gui.addFolder( 'simul' );
    const modelFolder = gui.addFolder( 'model' );
    const colorFolder = gui.addFolder( 'color' );
    const scaleFolder = gui.addFolder( 'scale' );
    const glowFolder = gui.addFolder( 'glow' );

    animationFolder.add( animationParams, 'frame', 1, 2880, 1 )
    .listen()
    .onChange( function() {
        updateScaleTexture();

        if (window.innerWidth > 640) {
        checkAndLoadScene(animationParams.frame);
        }

        checkAndLoadParticleMesh(animationParams.frame);
        console.log(settings.scaleFactor)
    });
    animationFolder.add({ play: playAnimation }, 'play').name('Play');
    animationFolder.add({ stop: stopAnimation }, 'stop').name('Stop');
    animationFolder.add({ reset: resetAnimation }, 'reset').name('Reset');
    
    skipFolder.add({ skipToScene1: () => skipToFrame(0) }, 'skipToScene1').name('Skip to Scene 1');
    skipFolder.add({ skipToScene2: () => skipToFrame(720) }, 'skipToScene2').name('Skip to Scene 2');
    skipFolder.add({ skipToScene3: () => skipToFrame(1440) }, 'skipToScene3').name('Skip to Scene 3');
    skipFolder.add({ skipToScene4: () => skipToFrame(2160) }, 'skipToScene4').name('Skip to Scene 4');


    // presetFolder.add({ preset1: () => loadPreset('scene1') }, 'preset1').name('Load scene1');
    // presetFolder.add({ preset2: () => loadPreset('scene2') }, 'preset2').name('Load scene2');
    // presetFolder.add({ preset3: () => loadPreset('scene3') }, 'preset3').name('Load scene3');
    // presetFolder.add({ preset4: () => loadPreset('scene4') }, 'preset4').name('Load scene4');

    // saveFolder.add({ savePreset1: () => savePreset('scene1') }, 'savePreset1').name('Save scene1');
    // saveFolder.add({ savePreset2: () => savePreset('scene2') }, 'savePreset2').name('Save scene2');
    // saveFolder.add({ savePreset3: () => savePreset('scene3') }, 'savePreset3').name('Save scene3');
    // saveFolder.add({ savePreset4: () => savePreset('scene4') }, 'savePreset4').name('Save scene4');

    amountFolder.add( settings, 'textureWidth', 1, 64, 1)
    .listen()
    .onChange(function() {
        updateTexture();
    });
    amountFolder.add( settings, 'textureHeight', 1, 64, 1)
    .listen()
    .onChange(function() {
        updateTexture();
    });
    
    simulFolder.add( settings, 'speed', 0, 3 ).listen();
    simulFolder.add( settings, 'dieSpeed', 0, 0.05 ).listen();
    simulFolder.add( settings, 'radius', 0, 10 ).listen();
    simulFolder.add( settings, 'curlSize', 0, 0.05 ).listen();
    simulFolder.add( settings, 'attraction', -20, 20 ).listen();
    simulFolder.add( settings, 'tornadoStrength', 0.0, 20.0 ).listen();
    simulFolder.add( settings, 'circleRadius', 0, 1000, 1).listen();
    simulFolder.add( settings, 'circleHeight', 0, 100, 1 ).listen();
    
    colorFolder.add( settings, 'lightIntensity', 0.0, 5.0 ).listen();
    colorFolder.add( settings, 'glowIntensity', 0.0, 1.0 ).listen();
    colorFolder.add( settings, 'metalness', 0.0, 1.0 ).listen();
    colorFolder.add( settings, 'roughness', 0.0, 1.0 ).listen();
    colorFolder.addColor( settings, 'color1' ).listen();
    colorFolder.addColor( settings, 'color2' ).listen();
    colorFolder.add( settings, 'parOpacity', 0.0, 1.0 ).listen();

    modelFolder.add(settings, 'currentModel', modelNames).name('Model')
    .listen()
    .onChange(function(value) {
        const modelIndex = modelNames.indexOf(value);
        updateParticleMesh(models[modelIndex]);
    });

    if (window.innerWidth > 640) {
    modelFolder.add(settings, 'currentScene', sceneNames).name('Scene')
    .listen()
    .onChange(function(value) {
        loadGLBScene(value);
    });
    }
    scaleFolder.add(settings, 'scaleFactor', 0, 20).name('Scale Factor')
    .listen()
    .onChange(function(value) {
        updateScaleTexture();
    });
    scaleFolder.add(settings, 'varScaleFactor', 0, 1).name('Var Scale Factor')
    .listen()
    .onChange(function(value) {
        updateScaleTexture();
    });
    scaleFolder.add( settings, 'wholeScale', 0.0, 10.0 ).listen();

    glowFolder.add( settings, 'falloff', 0, 10).listen();
    glowFolder.add( settings, 'glowInternalRadius', 0, 10).listen();
    glowFolder.addColor( settings, 'glowColor' ).listen();
    glowFolder.add( settings, 'glowSharpness', 0, 10).listen();
    glowFolder.add( settings, 'opacity', 0, 1).listen();


    gui.close();
}

function initGUIforAR() {
    gui = new GUI( { container: overlay } );

    const animationFolder = gui.addFolder( 'animation' );
    const modelFolder = gui.addFolder( 'model' );
    const colorFolder = gui.addFolder( 'color' );
    const scaleFolder = gui.addFolder( 'scale' );
    const glowFolder = gui.addFolder( 'glow' );

    animationFolder.add( animationParams, 'frame', 1, 2880, 1 )
    .listen()
    .onChange( function() {
        updateScaleTexture();

        if (window.innerWidth > 640) {
        checkAndLoadScene(animationParams.frame);
        }

        checkAndLoadParticleMesh(animationParams.frame);
        console.log(settings.scaleFactor)
    });
    animationFolder.add({ play: playAnimation }, 'play').name('Play');
    animationFolder.add({ stop: stopAnimation }, 'stop').name('Stop');
    animationFolder.add({ reset: resetAnimation }, 'reset').name('Reset');
    
    colorFolder.add( settings, 'lightIntensity', 0.0, 5.0 ).listen();
    colorFolder.add( settings, 'glowIntensity', 0.0, 1.0 ).listen();
    colorFolder.add( settings, 'metalness', 0.0, 1.0 ).listen();
    colorFolder.add( settings, 'roughness', 0.0, 1.0 ).listen();
    colorFolder.addColor( settings, 'color1' ).listen();
    colorFolder.addColor( settings, 'color2' ).listen();
    colorFolder.add( settings, 'parOpacity', 0.0, 1.0 ).listen();

    modelFolder.add(settings, 'currentModel', modelNames).name('Model')
    .listen()
    .onChange(function(value) {
        const modelIndex = modelNames.indexOf(value);
        updateParticleMesh(models[modelIndex]);
    });

    scaleFolder.add(settings, 'scaleFactor', 0, 20).name('Scale Factor')
    .listen()
    .onChange(function(value) {
        updateScaleTexture();
    });
    scaleFolder.add(settings, 'varScaleFactor', 0, 1).name('Var Scale Factor')
    .listen()
    .onChange(function(value) {
        updateScaleTexture();
    });
    scaleFolder.add( settings, 'wholeScale', 0.0, 10.0 ).listen();

    glowFolder.add( settings, 'opacity', 0, 1).listen();

    gui.close();
}

function loadPreset(presetName) {
    const preset = presets[presetName];
    if (preset) {
        if (presetName === 'scene1') {
            playAnimation();
            animationParams.frame = 0;
        } else if (presetName === 'scene2') {
            playAnimation();
            animationParams.frame = 720;
        } else if (presetName === 'scene3') {
            playAnimation();
            animationParams.frame = 1440;
        } else if (presetName === 'scene4') {
            playAnimation();
            animationParams.frame = 2160;
        }

        Object.assign(settings, preset);
        updateGUI();
        updateTexture();
        // loadGLBScene(settings.currentScene);
        const modelIndex = modelNames.indexOf(settings.currentModel);
        updateParticleMesh(models[modelIndex]);
    }
}

function savePreset(presetName) {
    presets[presetName] = { ...settings };
}

function updateGUI() {
    gui.controllersRecursive().forEach(controller => controller.updateDisplay());
}

let isUIdisplayed = true;
let isPosfixed = false;

function createButton( renderer, sessionInit = {} ) {

    const button = document.createElement( 'button' );

    function showStartAR( /*device*/ ) {

        if ( sessionInit.domOverlay === undefined ) {

            // const overlay = document.createElement( 'div' );
            overlay.id = 'overlay';
            overlay.style.display = 'none';
            document.body.appendChild( overlay );

            const svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
            svg.setAttribute( 'width', 38 );
            svg.setAttribute( 'height', 38 );
            svg.style.position = 'absolute';
            svg.style.right = '20px';
            svg.style.top = '20px';
            svg.addEventListener( 'click', function () {
                currentSession.end();
            } );

            const fixParticlePos = document.createElement("div");
            fixParticlePos.id = "fixParticlePos";
            fixParticlePos.innerHTML = '생성';

            fixParticlePos.addEventListener( 'click', function () {
                isPosfixed = true;
                onSelect();
            } );

            const skipScene = document.createElement("div");
            skipScene.id = "skipScene";
            
            const scene1 = document.createElement('div');
            const scene2 = document.createElement('div');
            const scene3 = document.createElement('div');
            const scene4 = document.createElement('div');
            scene1.id = 'scene1';
            scene1.className = 'scene';
            scene2.id = 'scene1';
            scene2.className = 'scene';
            scene3.id = 'scene1';
            scene3.className = 'scene';
            scene4.id = 'scene1';
            scene4.className = 'scene';

            const hideUI = document.createElement("div");
            hideUI.id = "hideUI";
            hideUI.innerHTML = "UIoff";

            hideUI.addEventListener( 'click', function () {
                if (isUIdisplayed) {
                    fixParticlePos.style.display = 'none';
                    skipScene.style.display = 'none';
                    vinyl.style.display = 'none';
                    hideUI.innerHTML = "UIon";
                    isUIdisplayed = false;
                } else {
                    fixParticlePos.style.display = 'block';
                    skipScene.style.display = 'flex';
                    vinyl.style.display = 'block';
                    hideUI.innerHTML = "UIoff";
                    isUIdisplayed = true;
                }
            } );

            scene1.addEventListener( 'click', function () {
                if (isPosfixed) {
                    skipToFrame(0);
                }
            } );
            scene2.addEventListener( 'click', function () {
                if (isPosfixed) {
                    skipToFrame(720);
                }
            } );
            scene3.addEventListener( 'click', function () {
                if (isPosfixed) {
                    skipToFrame(1440);
                }
            } );
            scene4.addEventListener( 'click', function () {
                if (isPosfixed) {
                    skipToFrame(2160);
                }
            } );


            skipScene.appendChild(scene1);
            skipScene.appendChild(scene2);
            skipScene.appendChild(scene3);
            skipScene.appendChild(scene4);

            overlay.appendChild(fixParticlePos);
            // overlay.appendChild(skipScene);
            overlay.appendChild(hideUI);
            overlay.appendChild(log)
            overlay.appendChild( vinyl );
            overlay.appendChild( thumbnailVideo );
            overlay.appendChild( thumbnailBack );

            overlay.appendChild( svg );

            const path = document.createElementNS( 'http://www.w3.org/2000/svg', 'path' );
            path.setAttribute( 'd', 'M 12,12 L 28,28 M 28,12 12,28' );
            path.setAttribute( 'stroke', '#fff' );
            path.setAttribute( 'stroke-width', 2 );
            svg.appendChild( path );

            if ( sessionInit.optionalFeatures === undefined ) {

                sessionInit.optionalFeatures = [];

            }

            sessionInit.optionalFeatures.push( 'dom-overlay' );
            sessionInit.domOverlay = { root: overlay };

        }

        //

        let currentSession = null;

        async function onSessionStarted( session ) {

            session.addEventListener( 'end', onSessionEnded );

            renderer.xr.setReferenceSpaceType( 'local' );

            await renderer.xr.setSession( session );

            button.textContent = 'STOP AR';
            sessionInit.domOverlay.root.style.display = '';

            //
            
            // if (window.innerWidth > 640) {
            // 	document.body.appendChild ( renderer.domElement );
            // }

            //

            currentSession = session;

        }

        function onSessionEnded( /*event*/ ) {

            currentSession.removeEventListener( 'end', onSessionEnded );

            button.textContent = 'START AR';
            sessionInit.domOverlay.root.style.display = 'none';

            currentSession = null;

        }

        //

        button.style.display = '';

        button.style.cursor = 'pointer';
        button.style.left = 'calc(50% - 50px)';
        button.style.width = '100px';

        button.textContent = 'START AR';

        button.onmouseenter = function () {

            button.style.opacity = '1.0';

        };

        button.onmouseleave = function () {

            button.style.opacity = '0.5';

        };

        button.onclick = function () {

            if ( currentSession === null ) {

                navigator.xr.requestSession( 'immersive-ar', sessionInit ).then( onSessionStarted );

            } else {

                currentSession.end();

                if ( navigator.xr.offerSession !== undefined ) {

                    navigator.xr.offerSession( 'immersive-ar', sessionInit )
                        .then( onSessionStarted )
                        .catch( ( err ) => {

                            console.warn( err );

                        } );

                }

            }

        };

        if ( navigator.xr.offerSession !== undefined ) {

            navigator.xr.offerSession( 'immersive-ar', sessionInit )
                .then( onSessionStarted )
                .catch( ( err ) => {

                    console.warn( err );

                } );

        }

    }

    function disableButton() {

        button.style.display = '';

        button.style.cursor = 'auto';
        button.style.left = 'calc(50% - 75px)';
        button.style.width = '150px';

        button.onmouseenter = null;
        button.onmouseleave = null;

        button.onclick = null;

    }

    function showARNotSupported() {

        disableButton();

        button.textContent = 'AR NOT SUPPORTED';

    }

    function showARNotAllowed( exception ) {

        disableButton();

        console.warn( 'Exception when trying to call xr.isSessionSupported', exception );

        button.textContent = 'AR NOT ALLOWED';

    }

    function stylizeElement( element ) {

        element.style.position = 'absolute';
        element.style.bottom = '20px';
        element.style.padding = '12px 6px';
        element.style.border = '1px solid #fff';
        element.style.borderRadius = '4px';
        element.style.background = 'rgba(0,0,0,0.1)';
        element.style.color = '#fff';
        element.style.font = 'normal 13px sans-serif';
        element.style.textAlign = 'center';
        element.style.opacity = '0.5';
        element.style.outline = 'none';
        element.style.zIndex = '999';

    }

    if ( 'xr' in navigator ) {

        button.id = 'ARButton';
        button.style.display = 'none';

        stylizeElement( button );

        navigator.xr.isSessionSupported( 'immersive-ar' ).then( function ( supported ) {

            supported ? showStartAR() : showARNotSupported();

        } ).catch( showARNotAllowed );

        return button;

    } else {

        const message = document.createElement( 'a' );

        if ( window.isSecureContext === false ) {

            message.href = document.location.href.replace( /^http:/, 'https:' );
            message.innerHTML = 'WEBXR NEEDS HTTPS'; // TODO Improve message

        } else {

            message.href = 'https://immersiveweb.dev/';
            message.innerHTML = 'WEBXR NOT AVAILABLE';

        }

        message.style.left = 'calc(50% - 90px)';
        message.style.width = '180px';
        message.style.textDecoration = 'none';

        stylizeElement( message );

        return message;

    }

}



