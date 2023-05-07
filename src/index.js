import "./styles.css";
import {
  AmbientLight,
  Clock,
  Color,
  DirectionalLight,
  HemisphereLight,
  IcosahedronGeometry,
  Mesh,
  MeshPhongMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils";
import noise from "../src/shaders/noise.glsl";

console.clear();

let scene = new Scene();
scene.background = new Color(1, 0, 1).multiplyScalar(0.125);
let camera = new PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  1,
  1000
);
camera.position.set(0, 0, 10);
let renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.prepend(renderer.domElement);
window.addEventListener("resize", (event) => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;

let gu = {
  time: { value: 0 }
};

let light = new DirectionalLight(0xffffff, 0.25);
light.position.setScalar(1);
let light2 = new HemisphereLight(0xffff00, 0x0000ff, 0.375);
scene.add(light, light2, new AmbientLight(0xffffff, 0.5));

let g = new IcosahedronGeometry(1, 200);
g.deleteAttribute("normal");
g.deleteAttribute("uv");
g = mergeVertices(g);
g.computeVertexNormals();
console.log(g.attributes.position.count);
let m = new MeshPhongMaterial({
  color: 0xff167f,
  emissive: new Color(0x0000ff).multiplyScalar(0.05),
  shininess: 300,
  onBeforeCompile: (shader) => {
    shader.uniforms.time = gu.time;
    shader.vertexShader = `
      uniform float time;
      ${noise}
      float noise(vec3 p){
        float n = snoise(vec4(p, time));
        n = sin(n * 3.1415926 * 8.);
        n = n * 0.5 + 0.5;
        n *= n;
        return n;
      }
      vec3 getPos(vec3 p){
        return p * (4. + noise(p * 0.875) * 0.25);
      }
      ${shader.vertexShader}
    `
      .replace(
        `#include <beginnormal_vertex>`,
        `#include <beginnormal_vertex>
      
        vec3 p0 = getPos(position);
        
        // https://stackoverflow.com/a/39296939/4045502
        
        float theta = .1; 
        vec3 vecTangent = normalize(cross(p0, vec3(1.0, 0.0, 0.0)) + cross(p0, vec3(0.0, 1.0, 0.0)));
        vec3 vecBitangent = normalize(cross(vecTangent, p0));
        vec3 ptTangentSample = getPos(normalize(p0 + theta * normalize(vecTangent)));
        vec3 ptBitangentSample = getPos(normalize(p0 + theta * normalize(vecBitangent)));
        
        objectNormal = normalize(cross(ptBitangentSample - p0, ptTangentSample - p0));
        
        ///////////////////////////////////////////////
      `
      )
      .replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>
        transformed = p0;
      `
      );
    //console.log(shader.vertexShader);
  }
});
let o = new Mesh(g, m);
scene.add(o);

let clock = new Clock();

renderer.setAnimationLoop(() => {
  controls.update();
  let t = clock.getElapsedTime();
  gu.time.value = t * 0.1;
  renderer.render(scene, camera);
});
