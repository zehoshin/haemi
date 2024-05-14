import * as THREE from 'three';
import { ARButton } from 'three/addons/controls/ARButton.js';

let camera, scene, renderer;
let controller;
let defaultEnvironment;

init();
animate();

function init() {

    const container = document.createElement( 'div' );
    document.body.appendChild( container );

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );

    const defaultLight = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 1 );
    defaultLight.position.set( 0.5, 1, 0.25 );
    scene.add( defaultLight );

    //

    renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.xr.enabled = true;
    container.appendChild( renderer.domElement );

    document.body.appendChild( ARButton.createButton( renderer ) );

    //

    const ballGeometry = new THREE.SphereGeometry( 0.175, 32, 32 );
    const ballGroup = new THREE.Group();
    ballGroup.position.z = - 2;

    const rows = 3;
    const cols = 3;

    for ( let i = 0; i < rows; i ++ ) {

        for ( let j = 0; j < cols; j ++ ) {

            const ballMaterial = new THREE.MeshStandardMaterial( {
                color: 0xdddddd,
                roughness: i / rows,
                metalness: j / cols
            } );
            const ballMesh = new THREE.Mesh( ballGeometry, ballMaterial );
            ballMesh.position.set( ( i + 0.5 - rows * 0.5 ) * 0.4, ( j + 0.5 - cols * 0.5 ) * 0.4, 0 );
            ballGroup.add( ballMesh );

        }

    }

    scene.add( ballGroup );

    //


}



//

function animate() {

    renderer.setAnimationLoop( render );

}

function render() {

    renderer.render( scene, camera );

}
