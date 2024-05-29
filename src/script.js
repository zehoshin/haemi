import * as THREE from 'three'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import { ARButton } from 'three/addons/webxr/ARButton.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'

const overlay = document.createElement( 'div' );

const settings = {
    //amount
    textureWidth: 30,
    textureHeight: 30, 

    //simul
    speed: 0.5,
    dieSpeed: 0.001,
    radius: 1.5,
    curlSize: 0.015,
    attraction: -2.0,
    tornadoStrength: 2.0,
    circleRadius: 600,
    circleHeight: 60,

    //color
    lightIntensity: 0.7,
    glowIntensity: 0.2,
    metalness: 0.0,
    roughness: 1.0,
    color1: '#e8ff38',
    color2: '#f514cc',
    parOpacity: 0.0,
    
    //scale
    currentModel: 'flower',
    currentScene: 'scene1',
    scaleFactor: 1.2,
    varScaleFactor: 0.6,
    wholeScale: 0.006,

    //glow
    falloff: 0.0,
    glowInternalRadius: 0.0,
    glowColor: '#66ff00',
    glowSharpness: 0.0,
    opacity: 0.00,
};


//frame animation
let hasAnimationPlayed = false;
let speedFlag = true;
let dieSpeedFlag = true;
let radiusFlag = true;
let opacityFlag = true;
let circleRadiusFlag = true;
let colorFlag = true;
let colorFactor = 0.0;
let lightFlag = true;

let TEXTURE_WIDTH = settings.textureWidth;
let TEXTURE_HEIGHT = settings.textureHeight;
let AMOUNT = TEXTURE_WIDTH * TEXTURE_HEIGHT;

const models = [];
const modelNames = ['flower', 'flower'];
const modelPaths = [
    './src/models/flower.glb',
    './src/models/flower.glb', 
];

const sceneNames = ['scene1', 'scene2', 'scene3', 'scene4'];
const scenePaths = {
    'scene1': './src/models/scene1.glb',
    'scene2': './src/models/scene2.glb',
    'scene3': './src/models/scene3.glb',
    'scene4': './src/models/scene4.glb'
};

let camera, simulCamera, scene, simulScene, renderer, controls, gui;
const loader = new GLTFLoader();

let time = Date.now();
let dt;

//particles
let particleMesh;
let glowMesh;
const yPos = 0.5;

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
let onAR = false;

const alphaTex = new THREE.TextureLoader().load( "./src/flower_alpha.png" );


init();

function init() {
    //set Render Scene

    scene = new THREE.Scene();
    // if (window.innerWidth > 640) {
    // scene.background = new THREE.Color( 0x000000 );
    // }

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set( 0.6865024336032471, 6.012524566357743, -0.8411735019088319 );
    camera.rotation.set( -1.7097976663107175, 0.11259917101419144, 2.464943241451086 );

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
    document.getElementById('forCanvas').appendChild ( renderer.domElement );
    // }
    
    //webXR

    // controller = renderer.xr.getController( 0 );
    // controller.addEventListener( 'select', onSelect );
    // scene.add( controller );


    reticle = new THREE.Mesh(
        // new THREE.RingGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ),
        new THREE.PlaneGeometry(0.15,0.15).rotateX(-Math.PI/2),
        new THREE.MeshBasicMaterial({
            alphaMap: alphaTex,
            transparent: true,
            opacity: 0.5
		 })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add( reticle );

    //light

    const defaultLight = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 3 );
    defaultLight.position.set( 0.5, 1, 0.25 );
    scene.add( defaultLight );

    //controls

    controls = new OrbitControls( camera, renderer.domElement );
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE
        // RIGHT: THREE.MOUSE.PAN
    }
    controls.update();
    window.addEventListener('resize', onWindowResize, false);

    overlay.id = 'overlay';
    overlay.style.display = 'none';
    document.body.appendChild( overlay );

    //GUI
    // initGUI();

    //init Simulator & Particles & Glow
    initSimulator();
    loadParticlesGLB();
    initGlowMesh();

    // if (window.innerWidth > 640) {
    //     loadGLBScene('scene1')
    // }
    
    animate();
    document.getElementById('forButton').appendChild( createButton( renderer, { requiredFeatures: [ 'hit-test' ] } ));
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
            const model = gltf.scene.children[0];
            models.push(model);

            console.log(`${path} loaded and added to models array.`);

            if (models.length >= modelPaths.length) {
                initParticles();
            }
        });
    });
    console.log(models);
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
    // const geometries = [];
    // model.traverse((child) => {
    //     if (child.isMesh) {
    //         geometries.push(child.geometry);
    //     }
    // });
    // const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
    const geometry = model.geometry;
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
    const mesh = new THREE.InstancedMesh(geometry, material, AMOUNT);

    colorIndices = new Float32Array(AMOUNT);
    glowTimings = new Float32Array(AMOUNT);  

    for (let i = 0; i < AMOUNT; i++) {
        colorIndices[i] = Math.random();
        glowTimings[i] = Math.random() * 100.0;
    }

    geometry.setAttribute('colorIndex', new THREE.InstancedBufferAttribute(colorIndices, 1));
    geometry.setAttribute('glowTiming', new THREE.InstancedBufferAttribute(glowTimings, 1)); 

    mesh.position.y += yPos;
    return mesh;
}

function updateParticleMesh(model) {
    if (particleMesh && glowMesh) {
        scene.remove(particleMesh);
        scene.remove(glowMesh);
    }
    particleMesh = createParticleMesh(model);
    scene.add(particleMesh);
    initGlowMesh();
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
    glowMesh.position.y += yPos;

    scene.add(glowMesh);
}

function animate() {
    renderer.setAnimationLoop( render );

}
  
function render(timestamp, frame) {
    controls.update();
    TWEEN.update(); 

    let newTime = Date.now();
    dt = newTime - time;
    time = newTime;

    initAnimation = Math.min(initAnimation + dt * 0.00025, 1);
    updateSimulator(dt);
    updateParticles(dt);

    if (particleMesh && !hasAnimationPlayed && glowMesh) {
        playAnimation();
        hasAnimationPlayed = true;
    }

    animationFrame();

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
function animationFrame() {
    if (settings.parOpacity <= 1) {
            settings.parOpacity += 0.01
    }

    if (speedFlag) {
        settings.speed += 0.0005;
        if (settings.speed >= 0.75) {
            settings.speed = 0.75;
            speedFlag = false;
        }
    } else {
        settings.speed -= 0.0005;
        if (settings.speed <= 0.25) {
            settings.speed = 0.25;
            speedFlag = true;
        }
    }

    if (dieSpeedFlag) {
        settings.dieSpeed -= 0.0001;
        if (settings.dieSpeed <= 0.001) {
            settings.dieSpeed = 0.001;
            dieSpeedFlag = false;
        }
    } else {
        settings.dieSpeed += 0.000001;
        if (settings.dieSpeed >= 0.003) {
            settings.dieSpeed = 0.003;
            dieSpeedFlag = true;
        }
    }

    if (radiusFlag) {
        settings.radius += 0.005;
        if (settings.radius >= 4.0) {
            settings.radius = 4.0;
            radiusFlag = false;
        }
    } else {
        settings.radius -= 0.005;
        if (settings.radius <= 1.0) {
            settings.radius = 1.0;
            radiusFlag = true;
        }
    }

    settings.opacity = 0.02;
    settings.glowInternalRadius = 0.0;

    // if (opacityFlag) {
    //     settings.opacity += 0.00025;
    //     if (settings.opacity >= 0.04) {
    //         settings.opacity = 0.04;
    //         opacityFlag = false;
    //     }
    // } else {
    //     settings.opacity -= 0.00025;
    //     if (settings.opacity <= 0.02) {
    //         settings.opacity = 0.02;
    //         opacityFlag = true;
    //     }
    // }
    
    if (onAR) {
        settings.opacity = 0.02;
        settings.glowInternalRadius = 0.0;

        if (opacityFlag) {
            settings.opacity += 0.00025;
            if (settings.opacity >= 0.04) {
                settings.opacity = 0.04;
                opacityFlag = false;
            }
        } else {
            settings.opacity -= 0.00025;
            if (settings.opacity <= 0.02) {
                settings.opacity = 0.02;
                opacityFlag = true;
            }
        }
    } else {
        settings.opacity = 0.2;
        settings.glowInternalRadius = 5.0;
        if (opacityFlag) {
            settings.opacity += 0.00025;
            if (settings.opacity >= 0.2) {
                settings.opacity = 0.2;
                opacityFlag = false;
            }
        } else {
            settings.opacity -= 0.00025;
            if (settings.opacity <= 0.075) {
                settings.opacity = 0.075;
                opacityFlag = true;
            }
        }
    }

    if (circleRadiusFlag) {
        settings.circleRadius += 1;
        if (settings.circleRadius >= 900) {
            settings.circleRadius = 900;
            circleRadiusFlag = false;
        }
    } else {
        settings.circleRadius -= 1;
        if (settings.circleRadius <= 300) {
            settings.circleRadius = 300;
            circleRadiusFlag = true;
        }
    }

    if (lightFlag) {
        settings.lightIntensity += 0.001;
        if (settings.lightIntensity >= 1.4) {
            settings.lightIntensity = 1.4;
            lightFlag = false;
        }
    } else {
        settings.lightIntensity -= 0.001;
        if (settings.lightIntensity <= 0.7) {
            settings.lightIntensity = 0.7;
            lightFlag = true;
        }
    }

    if (colorFlag) {
        colorFactor += 0.002;
        if (colorFactor >= 1.0) {
            colorFactor = 1.0;
            colorFlag = false;
        }
    } else {
        colorFactor -= 0.002;
        if (colorFactor <= 0.0) {
            colorFactor = 0.0;
            colorFlag = true;
        }
    }

    settings.color1 = interpolateColor('#ffde38', '#a7f547', colorFactor);
    settings.color2 = interpolateColor('#dc2eff', '#f514cc', colorFactor);
    settings.glowColor = interpolateColor('#7300ff', '#ffa200', colorFactor);
}


function playAnimation() {
    updateParticleMesh(models[1])
}

function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    const num = parseInt(hex, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

function rgbToHex(r, g, b) {
    const toHex = n => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function interpolateColor(color1, color2, factor) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    const r = Math.round(rgb1.r + factor * (rgb2.r - rgb1.r));
    const g = Math.round(rgb1.g + factor * (rgb2.g - rgb1.g));
    const b = Math.round(rgb1.b + factor * (rgb2.b - rgb1.b));
    
    return rgbToHex(r, g, b);
}


//#########EVENT LISTENER#############
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


function onSelect() {
    if (reticle.visible) {
        // Increase opacity to 1
        new TWEEN.Tween(reticle.material)
        .to({ opacity: 1 }, 1000) // 1 second duration
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onComplete(() => {
            // Decrease opacity back to 0.5
            new TWEEN.Tween(reticle.material)
                .to({ opacity: 0.5 }, 1000) // 1 second duration
                .easing(TWEEN.Easing.Quadratic.InOut)
                .start();
        })
        .start();

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
    onAR = true;
    if(!particleMesh && !glowMesh) {
        scene.add(particleMesh);
        scene.add(glowMesh);
    }
} );

renderer.xr.addEventListener( 'sessionend', function ( event ) {
    console.log('offAR')
} );

function loadGLBScene(sceneName) {
    // Clear existing models
    if (glbModel) {
        scene.remove(glbModel);
    }

    loader.load(scenePaths[sceneName], function (gltf) {
        glbModel = gltf.scene;
        let scaleFactor = 1;
        glbModel.position.y = -0.5;
        glbModel.position.z = 6;
        glbModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
        scene.add(glbModel);
    });
}

function removeScene() {
    scene.remove(glbModel)
}

function initGUI() {
    gui = new GUI();

    const animationFolder = gui.addFolder( 'animation' );

    const sceneFolder = gui.addFolder( 'scene' );
    const amountFolder = gui.addFolder( 'amount' );
    const simulFolder = gui.addFolder( 'simul' );
    const modelFolder = gui.addFolder( 'model' );
    const colorFolder = gui.addFolder( 'color' );
    const scaleFolder = gui.addFolder( 'scale' );
    const glowFolder = gui.addFolder( 'glow' );

    animationFolder.add({ play: playAnimation }, 'play').name('Play');
    
    sceneFolder.add({ Scene1: () => loadGLBScene('scene1') }, 'Scene1').name('Scene 1');
    sceneFolder.add({ Scene2: () => loadGLBScene('scene2') }, 'Scene2').name('Scene 2');
    sceneFolder.add({ Scene3: () => loadGLBScene('scene3') }, 'Scene3').name('Scene 3');
    sceneFolder.add({ Scene4: () => loadGLBScene('scene4') }, 'Scene4').name('Scene 4');
    sceneFolder.add({ remove: () => removeScene() }, 'remove').name('remove');

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


let isUIdisplayed = true;

function createButton( renderer, sessionInit = {} ) {

    const button = document.createElement( 'button' );
    const svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
    svg.setAttribute( 'width', 38 );
    svg.setAttribute( 'height', 38 );
    svg.style.position = 'absolute';
    svg.style.right = '20px';
    svg.style.top = '20px';
    svg.style.zIndex = '999';
    const path = document.createElementNS( 'http://www.w3.org/2000/svg', 'path' );
    path.setAttribute( 'd', 'M 12,12 L 28,28 M 28,12 12,28' );
    path.setAttribute( 'stroke', '#fff' );
    path.setAttribute( 'stroke-width', 2 );
    svg.appendChild( path );

    let altAR = false;

    function showStartAR( /*device*/ ) {

        if ( sessionInit.domOverlay === undefined ) {

            // const overlay = document.createElement( 'div' );
            overlay.id = 'overlay';
            overlay.style.display = 'none';
            document.body.appendChild( overlay );

            svg.addEventListener( 'click', function () {
                currentSession.end();
            } );

            const fixParticlePos = document.createElement("div");
            fixParticlePos.id = "fixParticlePos";

            fixParticlePos.addEventListener( 'click', function () {
                onSelect();
            } );

            // const hideUI = document.createElement("div");
            // hideUI.id = "hideUI";

            // hideUI.addEventListener( 'click', function () {
            //     if (isUIdisplayed) {
            //         fixParticlePos.style.display = 'none';
            //         reticle.visible = false;
            //         isUIdisplayed = false;
            //     } else {
            //         fixParticlePos.style.display = 'block';
            //         reticle.visible = true;
            //         isUIdisplayed = true;
            //     }
            // } );

            overlay.appendChild(fixParticlePos);
            // overlay.appendChild(hideUI);

            overlay.appendChild( svg );

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
        button.style.left = 'calc(50% - 75px)';
        button.style.width = '150px';

        button.textContent = 'START AR';

        button.onmouseenter = function () {

            button.style.opacity = '1.0';

        };

        button.onmouseleave = function () {

            button.style.opacity = '1.0';

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

        // button.onclick = null;
        button.onclick = function() {
            document.getElementById('forClose').appendChild(svg);
            document.getElementById('text').style = 'animation: fade_out 1s ease-in-out forwards';
            document.getElementById('background').style = 'animation: fade_in 2s ease-in-out forwards';
    
            // Define the initial and target positions and rotations
            const initialPosition = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
            const targetPosition = { x: 3.688544880029717, y: 1.1276707950370315, z: -3.144522580730786 };
            const initialRotation = { x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z };
            const targetRotation = { x: -2.797264323083368, y: 0.8348568737350391, z: 2.881794815855286 };
    
            // Create tweens for position and rotation
            const positionTween = new TWEEN.Tween(initialPosition)
                .to(targetPosition, 2000) // Duration of 2 seconds
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate(() => {
                    camera.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
                });
    
            const rotationTween = new TWEEN.Tween(initialRotation)
                .to(targetRotation, 2000) // Duration of 2 seconds
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate(() => {
                    camera.rotation.set(initialRotation.x, initialRotation.y, initialRotation.z);
                });
    
            // Start the tweens
            positionTween.start();
            rotationTween.start();
    
            // Add an event listener to revert changes on svg click
            svg.addEventListener("click", function () {
                document.getElementById('forClose').removeChild(svg);
                document.getElementById('text').style = 'animation: fade_in 1s ease-in-out forwards';
                document.getElementById('background').style = 'animation: fade_out 2s ease-in-out forwards';
    
                // Define the initial and target positions and rotations for revert
                const revertInitialPosition = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
                const revertTargetPosition = { x: 0.6865024336032471, y: 6.012524566357743, z: -0.8411735019088319 };
                const revertInitialRotation = { x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z };
                const revertTargetRotation = { x: -1.7097976663107175, y: 0.11259917101419144, z: 2.464943241451086 };
    
                // Create tweens for reverting position and rotation
                const revertPositionTween = new TWEEN.Tween(revertInitialPosition)
                    .to(revertTargetPosition, 2000) // Duration of 2 seconds
                    .easing(TWEEN.Easing.Quadratic.InOut)
                    .onUpdate(() => {
                        camera.position.set(revertInitialPosition.x, revertInitialPosition.y, revertInitialPosition.z);
                    });
    
                const revertRotationTween = new TWEEN.Tween(revertInitialRotation)
                    .to(revertTargetRotation, 2000) // Duration of 2 seconds
                    .easing(TWEEN.Easing.Quadratic.InOut)
                    .onUpdate(() => {
                        camera.rotation.set(revertInitialRotation.x, revertInitialRotation.y, revertInitialRotation.z);
                    });
    
                // Start the revert tweens
                revertPositionTween.start();
                revertRotationTween.start();
            });
        };

    }

    function showARNotSupported() {

        disableButton();

        button.textContent = 'START'; //AR NOT SUPPORTED



    }

    function showARNotAllowed( exception ) {

        disableButton();

        console.warn( 'Exception when trying to call xr.isSessionSupported', exception );

        button.textContent = 'START'; //AR NOT ALLOWED

    }

    function stylizeElement( element ) {

        element.style.position = 'relative';
        // element.style.bottom = '200px';
        element.style.padding = '12px 10px 16px 12px';
        element.style.border = '1px solid #fff';
        element.style.borderRadius = '30px';
        element.style.background = 'rgba(0,0,0,0.1)';
        element.style.color = '#fff';
        element.style.font = '500 22px Noto Sans KR, sans-serif';
        element.style.textAlign = 'center';
        element.style.opacity = '1.0';
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



