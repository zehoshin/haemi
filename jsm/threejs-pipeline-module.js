const {dat} = window
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Vector2,
  MathUtils,
  DataTexture,
  RGBFormat,
  Color,
  WebGLRenderTarget,
  ReinhardToneMapping,
  AmbientLight,
} from 'three'

import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { TexturePass } from 'three/addons/postprocessing/TexturePass.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/AlphaUnrealBloomPass.js'

// unreal bloom configuration
const params = {
  exposure: 1,
  strength: 1.5,
  threshold: 0,
  radius: 0,
}

export const threejsPipelineModule = () => {
  let scene3
  let isSetup = false
  let combinePass
  let bloomPass
  const cameraTextureCopyPosition = new Vector2(0, 0)
  let cameraTexture
  let sceneTarget
  let copyPass

  let width
  let height

  // add shaders to the document

  const combineShaderFrag = document.getElementById('ppFragmentShader').textContent
  const combineShaderVert = document.getElementById('ppVertexShader').textContent
  const combineShader = {
    uniforms: {
      cameraTexture: {value: undefined},
      tDiffuse: {value: null},
      useAdditiveBlend: {value: false},
    },
    fragmentShader: combineShaderFrag,
    vertexShader: combineShaderVert,
  }

  const xrScene = () => scene3

  const trySetup = ({canvas, canvasWidth, canvasHeight, GLctx}) => {
    if (isSetup) {
      return
    }
    isSetup = true

    width = canvasWidth
    height = canvasHeight

    const scene = new Scene()
    const camera = new PerspectiveCamera(
      60.0 /* initial field of view; will get set based on device info later. */,
      canvasWidth / canvasHeight,
      0.01,
      1000
    )
    scene.add(camera)

    const renderer = new WebGLRenderer({
      canvas,
      context: GLctx,
      alpha: true,
      antialias: true,
    })
    renderer.debug.checkShaderErrors = false  // speeds up loading new materials
    renderer.autoClear = false
    renderer.autoClearDepth = false
    renderer.setClearColor(0xffffff, 0)
    renderer.toneMapping = ReinhardToneMapping
    renderer.toneMappingExposure = params.exposure
    // renderer.setSize(canvasWidth, canvasHeight)

    sceneTarget = new WebGLRenderTarget(canvasWidth, canvasHeight, {
      generateMipmaps: false,
    })

    // Bloom Composer
    const bloomComposer = new EffectComposer(renderer)
    bloomComposer.renderToScreen = false

    // Copy scene into bloom
    copyPass = new TexturePass(sceneTarget.texture)
    bloomComposer.addPass(copyPass)

    // Bloom Pass
    bloomPass = new UnrealBloomPass(
      new Vector2(canvasWidth, canvasHeight),
      1.5,
      0.4,
      0.85
    )
    bloomPass.clearColor = new Color(0xffffff)
    bloomPass.threshold = params.threshold
    bloomPass.strength = params.strength
    bloomPass.radius = params.radius

    bloomComposer.addPass(bloomPass)

    // Final composer
    const composer = new EffectComposer(renderer)
    composer.addPass(copyPass)

    // Combine scene and camerafeed pass
    combinePass = new ShaderPass(combineShader)
    combinePass.clear = false
    combinePass.renderToScreen = true
    composer.addPass(combinePass)
    scene.add(new AmbientLight(0x404040, 3))
    scene3 = {scene, camera, renderer, bloomComposer, composer}

    window.scene3 = scene3
    window.XR8.Threejs.xrScene = xrScene

    const gui = new dat.GUI({width: 250})
    gui.add(params, 'exposure', 0.1, 2).onChange((value) => {
      renderer.toneMappingExposure = value ** 4
    })
    gui.add(bloomPass, 'threshold', 0, 1)
    gui.add(bloomPass, 'strength', 0, 3)
    gui.add(bloomPass, 'radius', 0, 1)
  }

  return {
    name: 'customthreejs',
    onStart: args => trySetup(args),
    onDetach: () => {
      isSetup = false
    },
    onUpdate: ({processCpuResult}) => {
      const realitySource =
        processCpuResult.reality || processCpuResult.facecontroller

      if (!realitySource) {
        return
      }

      const {rotation, position, intrinsics} = realitySource
      const {camera} = scene3

      for (let i = 0; i < 16; i++) {
        camera.projectionMatrix.elements[i] = intrinsics[i]
      }

      // Fix for broken raycasting in r103 and higher. Related to:
      //   https://github.com/mrdoob/three.js/pull/15996
      // Note: camera.projectionMatrixInverse wasn't introduced until r96 so check before setting
      // the inverse
      if (camera.projectionMatrixInverse) {
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
      }

      if (rotation) {
        camera.setRotationFromQuaternion(rotation)
      }
      if (position) {
        camera.position.set(position.x, position.y, position.z)
      }
    },
    onCanvasSizeChange: ({
      canvasWidth,
      canvasHeight,
      videoWidth,
      videoHeight,
    }) => {
      if (!isSetup) {
        return
      }
      cameraTexture = new DataTexture(
        new Uint8Array(canvasWidth * canvasHeight * 3),
        canvasWidth,
        canvasHeight,
        RGBFormat
      )

      const {renderer} = scene3
      renderer.setSize(canvasWidth, canvasHeight)
      const pixelRatio = MathUtils.clamp(window.devicePixelRatio, 1, 2)
      renderer.pixelRatio = pixelRatio

      // Update render pass sizes
      scene3.bloomComposer.setSize(
        canvasWidth * pixelRatio,
        canvasHeight * pixelRatio
      )
      scene3.bloomComposer.passes.forEach((pass) => {
        if (pass.setSize) {
          pass.setSize(canvasWidth * pixelRatio, canvasHeight * pixelRatio)
        }
      })
      scene3.composer.setSize(
        canvasWidth * pixelRatio,
        canvasHeight * pixelRatio
      )
      scene3.composer.passes.forEach((pass) => {
        if (pass.setSize) {
          pass.setSize(canvasWidth * pixelRatio, canvasHeight * pixelRatio)
        }
      })
      if (bloomPass && combinePass && sceneTarget && copyPass) {
        combinePass.uniforms.cameraTexture = {value: cameraTexture}
        combinePass.uniforms.bloomTexture = {
          value: bloomPass.renderTargetsHorizontal[0],
        }
        sceneTarget.setSize(
          canvasWidth * pixelRatio,
          canvasHeight * pixelRatio
        )
        copyPass.uniforms.tDiffuse = {value: sceneTarget.texture}
      }
    },
    onRender: () => {
      if (cameraTexture) {
        scene3.renderer.copyFramebufferToTexture(
          cameraTextureCopyPosition,
          cameraTexture
        )
      }
      if (sceneTarget) {
        scene3.renderer.setRenderTarget(sceneTarget)
      }
      scene3.renderer.clear()
      scene3.renderer.clearDepth()
      scene3.renderer.render(scene3.scene, scene3.camera)
      scene3.renderer.setRenderTarget(null)

      scene3.bloomComposer.render()
      scene3.composer.render()
    },
    // Get a handle to the xr scene, camera, renderer, and composers
    xrScene,
  }
}
