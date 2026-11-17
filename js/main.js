import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";
import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js";
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js";

gsap.registerPlugin(ScrollTrigger);

const canvas = document.querySelector("#webgl");
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050b16, 0.022);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 13);

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

scene.add(new THREE.AmbientLight(0x8ebbd8, 1.25));
const blueLight = new THREE.PointLight(0x168cff, 110, 30);
blueLight.position.set(-4, 3, 5); scene.add(blueLight);
const cyanLight = new THREE.PointLight(0x19e1ff, 65, 24);
cyanLight.position.set(-8, -2, 3); scene.add(cyanLight);

const world = new THREE.Group();
scene.add(world);

// Electric-blue DNA strands with glowing cyan rungs and traveling energy pulses.
const strandMat = new THREE.MeshStandardMaterial({
  color: 0x07549b,
  metalness: .76,
  roughness: .22,
  emissive: 0x006dff,
  emissiveIntensity: 1.35
});
const rungMat = new THREE.MeshStandardMaterial({
  color: 0x21aaff,
  metalness: .58,
  roughness: .2,
  emissive: 0x00aaff,
  emissiveIntensity: 1.6
});
const strandGlow = new THREE.MeshBasicMaterial({ color: 0x087bff, transparent: true, opacity: .1, depthWrite: false });
const electricBlue = new THREE.MeshBasicMaterial({ color: 0x168dff, transparent: true, opacity: .92 });
const electricCyan = new THREE.MeshBasicMaterial({ color: 0x78f4ff, transparent: true, opacity: .95 });
const jointGeo = new THREE.SphereGeometry(.085, 16, 12);
const jointPulses = [];
const movingLights = [];

const helixPoints = [[], []];
const glowMaterials = [electricBlue, electricCyan];
const turnCount = 4.8;
const strandLength = 12.5;
const strandRadius = 1.12;
const strandSteps = 360;
const rungGeo = new THREE.CylinderGeometry(.025, .025, 1, 10);
const rungBase = new THREE.Vector3(0, 1, 0);

for (let i = 0; i <= strandSteps; i++) {
  const progress = i / strandSteps;
  const angle = progress * Math.PI * 2 * turnCount;
  const x = (progress - .5) * strandLength;
  for (let strand = 0; strand < 2; strand++) {
    const theta = angle + strand * Math.PI;
    helixPoints[strand].push(new THREE.Vector3(
      x,
      Math.cos(theta) * strandRadius,
      Math.sin(theta) * strandRadius
    ));
  }

  if (i % 12 === 0 && i < strandSteps) {
    const a = helixPoints[0][i];
    const b = helixPoints[1][i];
    const direction = new THREE.Vector3().subVectors(b, a);
    const rung = new THREE.Mesh(rungGeo, rungMat);
    rung.position.copy(a).add(b).multiplyScalar(.5);
    rung.quaternion.setFromUnitVectors(rungBase, direction.clone().normalize());
    rung.scale.y = direction.length();
    world.add(rung);

    [a, b].forEach((point, strand) => {
      const joint = new THREE.Mesh(jointGeo, glowMaterials[strand]);
      joint.position.copy(point);
      world.add(joint);
      jointPulses.push({ mesh: joint });
    });
  }
}

const strandCurves = helixPoints.map((points, strand) => {
  const curve = new THREE.CatmullRomCurve3(points);
  const aura = new THREE.Mesh(new THREE.TubeGeometry(curve, 900, .29, 12, false), strandGlow);
  world.add(aura);

  const metal = new THREE.Mesh(new THREE.TubeGeometry(curve, 900, .15, 14, false), strandMat);
  world.add(metal);

  const highlightPoints = points.map(point => new THREE.Vector3(point.x, point.y, point.z + .1));
  const highlight = new THREE.CatmullRomCurve3(highlightPoints);
  world.add(new THREE.Mesh(new THREE.TubeGeometry(highlight, 900, .026, 8, false), glowMaterials[strand]));

  const collarGeo = new THREE.TorusGeometry(.17, .032, 8, 24);
  for (let i = 36; i < strandSteps; i += 72) {
    const tangent = curve.getTangentAt(i / strandSteps);
    const collar = new THREE.Mesh(collarGeo, glowMaterials[strand]);
    collar.position.copy(points[i]);
    collar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    world.add(collar);
  }

  return curve;
});

strandCurves.forEach((curve, strand) => {
  for (let i = 0; i < 2; i++) {
    const light = new THREE.Mesh(new THREE.SphereGeometry(.075, 14, 12), glowMaterials[strand]);
    world.add(light);
    movingLights.push({ mesh: light, curve, offset: i * .5, speed: strand ? .055 : .07 });
  }
});

// Ambient data particles.
const particleCount = 420;
const particlePositions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
  particlePositions[i*3] = (Math.random() - .5) * 16;
  particlePositions[i*3+1] = (Math.random() - .5) * 15;
  particlePositions[i*3+2] = (Math.random() - .5) * 9;
}
const particleGeo = new THREE.BufferGeometry();
particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: 0x8acfff, size: .022, transparent: true, opacity: .48 }));
scene.add(particles);

// Keep the glowing strands prominent while leaving room for the hero copy.
function layoutScene() {
  const mobile = innerWidth < 700;
  world.position.set(mobile ? .05 : -6.2, mobile ? .1 : -.05, -.6);
  world.scale.setScalar(mobile ? .52 : 1.08);
  camera.position.x = 0;
}
layoutScene();

const motion = { rotation: 0, cameraZ: 13, drift: 0 };
gsap.to(motion, {
  rotation: .28,
  cameraZ: 11.6,
  drift: .45,
  ease: "none",
  scrollTrigger: {
    trigger: "main",
    start: "top top",
    end: "bottom bottom",
    scrub: 1.2
  }
});

gsap.utils.toArray(".reveal").forEach((el) => {
  ScrollTrigger.create({
    trigger: el,
    start: "top 88%",
    onEnter: () => el.classList.add("visible"),
    once: true
  });
});

gsap.to(".hero-title", { y: -35, opacity: .65, ease: "none",
  scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

const progress = document.querySelector("#progress");
addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
}, { passive: true });

const menuToggle = document.querySelector("#menuToggle");
const navLinks = document.querySelector("#navLinks");
menuToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
navLinks.querySelectorAll("a").forEach(a => a.addEventListener("click", () => navLinks.classList.remove("open")));

document.querySelector("#year").textContent = new Date().getFullYear();

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();
  world.rotation.y = motion.rotation + Math.sin(elapsed * .18) * .08;
  world.rotation.x = Math.sin(elapsed * .16) * .045;
  world.rotation.z = -.37 + Math.sin(elapsed * .13) * .025 - motion.drift * .06;
  world.position.y = (innerWidth < 700 ? .1 : -.05) + Math.sin(elapsed * .32) * .12 - motion.drift * .08;
  jointPulses.forEach(({ mesh }, index) => {
    const pulse = 1 + Math.sin(elapsed * 2.6 - index * .18) * .12;
    mesh.scale.setScalar(pulse);
  });
  movingLights.forEach(({ mesh, curve, offset, speed }) => {
    mesh.position.copy(curve.getPointAt((elapsed * speed + offset) % 1));
  });
  camera.position.z += (motion.cameraZ - camera.position.z) * .035;
  particles.rotation.y = elapsed * .008;
  blueLight.position.x = -4 + Math.sin(elapsed * .4) * 1.2;
  cyanLight.position.x = -8 + Math.sin(elapsed * .3) * .8;
  cyanLight.position.y = -2 + Math.cos(elapsed * .35);
  renderer.render(scene, camera);
}
animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  layoutScene();
  ScrollTrigger.refresh();
});

document.documentElement.classList.add("motion-ready");
