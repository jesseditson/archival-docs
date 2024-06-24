import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const SECTION_ASSETS = [
  ["archival_Markdown", "archival_Video"],
  ["archival_JavaScript", "archival_Svelte"],
  ["archival_Rocket", "archival_Cloud"],
  ["archival_Git", "archival_Hammer"],
];

export const init = (canvas: HTMLCanvasElement, sections: HTMLElement[]) => {
  const cs = canvas.getBoundingClientRect();
  const tickFns: ((d: number) => void)[] = [];
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas,
    alpha: true,
  });
  const fov = 1;
  const aspect = cs.width / cs.height;
  const near = 20;
  const far = 35;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  const scene = new THREE.Scene();
  const clock = new THREE.Clock();
  let assets: THREE.Group | undefined;

  const updateMeshPositions = () => {
    if (!assets) {
      return;
    }
    sections.forEach((el, idx) => {
      const icons = SECTION_ASSETS.at(idx);
      const meshes = icons?.map((i) => assets!.getObjectByName(i));
      const setPosition = (
        mesh: THREE.Object3D | undefined,
        pos: { x: number; y: number }
      ) => {
        if (mesh) {
          mesh.castShadow = true;
          mesh.position.copy(fromScreen(pos, camera));
        }
      };
      setPosition(meshes?.at(0), { x: el.offsetLeft, y: el.offsetTop });
      setPosition(meshes?.at(1), {
        x: el.offsetLeft + el.offsetWidth,
        y: el.offsetTop + el.offsetHeight,
      });
    });
  };

  const color = 0xffffff;
  const intensity = 4;
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(-1, 2, 4);
  scene.add(light);

  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.ShadowMaterial();
  material.opacity = 0.5;
  const plane = new THREE.Mesh(geometry, material);
  plane.translateZ(-32);
  plane.receiveShadow = true;
  scene.add(plane);

  // const t = new THREE.SphereGeometry(0.1);
  // const mat = new THREE.MeshBasicMaterial({
  //   color: 0xff0000,
  // });
  // const s = new THREE.Mesh(t, mat);
  // s.translateZ(-35);
  // scene.add(s);
  // document.addEventListener("mousemove", (e) => {
  //   s.position.copy(fromScreen({ x: e.clientX, y: e.clientY }, camera));
  // });

  const gltfLoader = new GLTFLoader();
  const url = "assets/assets.glb";
  gltfLoader.load(url, (gltf) => {
    const root = gltf.scene;
    const mixer = new THREE.AnimationMixer(root);
    tickFns.push((dt) => {
      mixer.update(dt);
    });
    scene.add(root);
    assets = root;
    updateMeshPositions();
    gltf.animations.forEach((a) => mixer.clipAction(a).play());
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
      updateMeshPositions();
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
