import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { cloudMaterial } from "./cloud";

const SECTION_ASSETS = [
  ["archival_Markdown", "archival_Video"],
  ["archival_JavaScript", "archival_Svelte"],
  ["archival_Cloud", "archival_Rocket"],
  ["archival_Git", "archival_Hammer"],
];
const MODEL_SCALE = 0.3;
const LOGO_SCALE = 0.02;
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const CIRCLE = Math.PI * 2;

const EL_PADDING_X = 30;
const EL_PADDING_Y = 20;
const elPos = (el: HTMLElement) => {
  const ws = { x: window.scrollX, y: window.scrollY };
  const [eol, eot, eow, eoh] = [
    el.offsetLeft + EL_PADDING_X,
    el.offsetTop + EL_PADDING_Y,
    el.offsetWidth - EL_PADDING_X * 2,
    el.offsetHeight - EL_PADDING_Y,
  ];
  const tl = { x: eol - ws.x, y: eot - ws.y };
  const tr = { ...tl, x: tl.x + eow };
  const bl = { ...tl, y: tl.y + eoh / 2 };
  const br = { x: tr.x, y: bl.y };
  return {
    tl,
    tr,
    bl,
    br,
    center: {
      x: tl.x + el.offsetWidth / 2,
      y: tl.y + el.offsetHeight / 2,
    },
  };
};

const addDot = (pos: { x: number; y: number }) => {
  const d = document.createElement("div");
  d.style.backgroundColor = "red";
  d.style.width = "10px";
  d.style.height = "10px";
  d.style.position = "absolute";
  d.style.top = pos.y + "px";
  d.style.left = pos.x + "px";
  document.body.appendChild(d);
};

export const init = (
  canvas: HTMLCanvasElement,
  sections: HTMLElement[],
  elements: { logo: HTMLElement }
) => {
  const cs = canvas.getBoundingClientRect();
  const tickFns: ((d: number) => void)[] = [];
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas,
    alpha: true,
  });
  renderer.shadowMap.enabled = true;
  // renderer.shadowMap.type = THREE.PCFShadowMap;

  // HDRI
  new RGBELoader()
    .setDataType(THREE.HalfFloatType)
    .setPath("/assets/")
    .load("env.hdr", function (texture) {
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;

      scene.environment = envMap;

      texture.dispose();
      pmremGenerator.dispose();
    });
  0;
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const fov = 1;
  const aspect = cs.width / cs.height;
  const near = 0.1;
  const far = 20;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  const cameraPositioner = new THREE.PerspectiveCamera(fov, aspect, near, far);
  const scene = new THREE.Scene();
  const clock = new THREE.Clock();
  const initialCamera = fromScreen({ x: 0, y: 0 }, cameraPositioner);
  let lastY = 0;
  tickFns.push(() => {
    if (window.scrollY !== lastY) {
      lastY = window.scrollY;
      const nextPos = fromScreen(
        { x: window.scrollX, y: window.scrollY },
        cameraPositioner
      );
      camera.position.setY(nextPos.sub(initialCamera).y);
    }
  });
  let assets: THREE.Group | undefined;

  const meshLights: THREE.DirectionalLight[][] = [];

  const initIcons = () => {
    sections.forEach((el, idx) => {
      const icons = SECTION_ASSETS.at(idx);
      const meshes = icons?.map((i) => assets!.getObjectByName(i));
      meshLights[idx] = [];
      const makeLight = () => {
        const color = 0xffffff;
        const intensity = 0.6;
        const light = new THREE.DirectionalLight(color, intensity);
        light.shadow.radius = 8;
        light.shadow.blurSamples = 5;
        light.shadow.camera.scale.set(0.004, 0.004, 0.004);
        light.castShadow = true;
        meshLights[idx].push(light);
        scene.add(light);
        scene.add(light.target);
        // const cameraHelper = new THREE.CameraHelper(light.shadow.camera);
        // scene.add(cameraHelper);
      };

      const initMesh = (idx: number) => {
        const mesh = meshes!.at(idx)! as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.scale.set(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);
        if (mesh.name === "archival_Cloud") {
          const cm = cloudMaterial();
          mesh.material = cm;
          tickFns.push(() => {
            cm.uniforms.cameraPos.value.copy(camera.position);
            // mesh.rotation.z = -performance.now() / 7500;
            cm.uniforms.frame.value++;
          });
          scene.add(mesh);
        }
        makeLight();
      };

      initMesh(0);
      initMesh(1);
      updateIconPositions();
    });
  };

  const updateIconPositions = () => {
    if (!assets) {
      return;
    }
    sections.forEach((el, idx) => {
      const icons = SECTION_ASSETS.at(idx);
      const meshes = icons?.map((i) => assets!.getObjectByName(i));
      const setPosition = (i: number, pos: { x: number; y: number }) => {
        const mesh = meshes?.at(i);
        if (mesh) {
          mesh.position.copy(fromScreen(pos, camera).setZ(-16));
        }
        const light = meshLights.at(idx)?.at(i);
        if (light) {
          light.position.copy(fromScreen(pos, camera).setZ(-15));
          light.target.position.copy(fromScreen(pos, camera).setZ(-16));
        }
      };
      const pos = elPos(el);
      // console.log(idx, idx % 2, pos);
      // addDot(pos.tl);
      // addDot(pos.br);
      // addDot(pos.tr);
      // addDot(pos.bl);
      setPosition(0, idx % 2 ? pos.tl : pos.tr);
      setPosition(1, idx % 2 ? pos.br : pos.bl);
    });
  };

  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.ShadowMaterial();
  material.opacity = 0.1;
  const plane = new THREE.Mesh(geometry, material);
  plane.translateZ(-16.8);
  plane.receiveShadow = true;
  scene.add(plane);

  // const t = new THREE.SphereGeometry(0.02);
  // const mat = new THREE.MeshPhongMaterial({
  //   color: 0xff0000,
  // });
  // const s = new THREE.Mesh(t, mat);
  // s.translateZ(-35);
  // scene.add(s);
  // s.castShadow = true;
  // s.receiveShadow = true;
  // document.addEventListener("mousemove", (e) => {
  //   s.position.copy(fromScreen({ x: e.clientX, y: e.clientY }, camera));
  // });

  const gltfLoader = new GLTFLoader();
  gltfLoader.load("assets/assets.glb", (gltf) => {
    const root = gltf.scene;
    // const mixer = new THREE.AnimationMixer(root);
    // tickFns.push((dt) => {
    //   mixer.update(dt);
    // });
    scene.add(root);
    assets = root;
    initIcons();
    updateIconPositions();
    // gltf.animations.forEach((a) => mixer.clipAction(a).play());
  });

  clock.start();
  return (time: number) => {
    const deltaTime = clock.getDelta();
    tickFns.forEach((t) => {
      t(deltaTime);
    });
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      updateIconPositions();
    }
    renderer.render(scene, camera);
  };
};

function fromScreen(
  pos: { x: number; y: number },
  camera: THREE.Camera
): THREE.Vector3 {
  // calculate pointer position in normalized device coordinates
  // (-1 to +1) for both components
  const [x, y] = [
    (pos.x / window.innerWidth) * 2 - 1,
    -(pos.y / window.innerHeight) * 2 + 1,
  ];
  return new THREE.Vector3(x, y, 1).unproject(camera);
}

function resizeRendererToDisplaySize(renderer: THREE.Renderer) {
  const canvas = renderer.domElement;
  const pixelRatio = window.devicePixelRatio;
  const width = Math.floor(canvas.clientWidth * pixelRatio);
  const height = Math.floor(canvas.clientHeight * pixelRatio);
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}
