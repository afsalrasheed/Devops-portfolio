import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";
import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js";
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js";

gsap.registerPlugin(ScrollTrigger);

const canvas = document.querySelector("#webgl");
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050b16, 0.022);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 13);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth / innerHeight < .65 ? 1.25 : 1.7));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
} catch (error) {
  console.error("WebGL background is unavailable; continuing without 3D effects.", error);
  canvas.hidden = true;
  renderer = null;
}

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

const dna = new THREE.Group();
scene.add(dna);

const helixTurns = 2.4;
const helixHeight = 7.6;
const helixRadius = .9;
const helixSegments = 240;
const strandMaterials = [
  new THREE.MeshBasicMaterial({ color: 0x3ecbff, transparent: true, opacity: .86, toneMapped: false }),
  new THREE.MeshBasicMaterial({ color: 0x368cff, transparent: true, opacity: .86, toneMapped: false })
];
const strandGlowMaterials = [
  new THREE.MeshBasicMaterial({ color: 0x32d4ff, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  new THREE.MeshBasicMaterial({ color: 0x368cff, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
];

function helixPoint(progress, phase) {
  const angle = progress * helixTurns * Math.PI * 2 + phase;
  return new THREE.Vector3(
    (progress - .5) * helixHeight,
    Math.cos(angle) * helixRadius,
    Math.sin(angle) * helixRadius
  );
}

for (let strand = 0; strand < 2; strand++) {
  const phase = strand * Math.PI;
  const points = Array.from({ length: helixSegments + 1 }, (_, index) =>
    helixPoint(index / helixSegments, phase)
  );
  const curve = new THREE.CatmullRomCurve3(points);
  const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, helixSegments, .075, 8, false), strandGlowMaterials[strand]);
  const core = new THREE.Mesh(new THREE.TubeGeometry(curve, helixSegments, .018, 6, false), strandMaterials[strand]);
  dna.add(glow, core);
}

const rungGeometry = new THREE.CylinderGeometry(.012, .012, helixRadius * 2, 6);
const rungMaterial = new THREE.MeshBasicMaterial({
  color: 0x83dcff,
  transparent: true,
  opacity: .52,
  toneMapped: false
});
const helixAxis = new THREE.Vector3(0, 1, 0);

for (let index = 0; index < 30; index++) {
  const progress = (index + .5) / 30;
  const first = helixPoint(progress, 0);
  const second = helixPoint(progress, Math.PI);
  const direction = second.clone().sub(first);
  const rung = new THREE.Mesh(rungGeometry, rungMaterial);
  rung.position.copy(first).add(second).multiplyScalar(.5);
  rung.quaternion.setFromUnitVectors(helixAxis, direction.normalize());
  dna.add(rung);
}

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
function setMenuOpen(isOpen) {
  navLinks.classList.toggle("open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
}
menuToggle.addEventListener("click", () => setMenuOpen(!navLinks.classList.contains("open")));
navLinks.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setMenuOpen(false)));
addEventListener("keydown", event => {
  if (event.key === "Escape") setMenuOpen(false);
});

document.querySelector("#year").textContent = new Date().getFullYear();

const clock = new THREE.Clock();
const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
function animate() {
  if (!renderer) return;
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();
  particles.rotation.y = elapsed * .008;
  dna.rotation.x = elapsed * .22;
  dna.rotation.z = Math.sin(elapsed * .17) * .06;
  renderer.render(scene, camera);
}
if (renderer && !prefersReducedMotion) animate();

function resizeScene() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  dna.position.set(0, 0, -1.5);
  const viewWidth = 2 * (camera.position.z - dna.position.z) *
    Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
  dna.scale.setScalar(viewWidth / helixHeight * .96);
  strandGlowMaterials.forEach(material => {
    material.opacity = camera.aspect < .65 ? .14 : .2;
  });
  if (renderer) {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, camera.aspect < .65 ? 1.25 : 1.7));
    renderer.setSize(innerWidth, innerHeight);
    if (prefersReducedMotion) renderer.render(scene, camera);
  }
  ScrollTrigger.refresh();
}
addEventListener("resize", resizeScene);

resizeScene();
document.documentElement.classList.add("motion-ready");
