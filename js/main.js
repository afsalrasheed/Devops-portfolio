import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";
import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js";
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js";

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
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

// Soft atmospheric star particles.
const particleCount = innerWidth < 650 ? 220 : 520;
const particlePositions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
  particlePositions[i*3] = (Math.random() - .5) * 18;
  particlePositions[i*3+1] = (Math.random() - .5) * 16;
  particlePositions[i*3+2] = (Math.random() - .5) * 10;
}
const particleGeo = new THREE.BufferGeometry();
particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({
  color: 0x9fdcff,
  size: .026,
  transparent: true,
  opacity: .58
}));
scene.add(particles);

const devopsSystem = new THREE.Group();
scene.add(devopsSystem);

const techNames = ["CLOUD", "DOCKER", "CONTAINER", "TERRAFORM", "CI/CD", "KUBERNETES", "AZURE", "YAML", "GIT", "LINUX"];
const techItems = [];

techNames.forEach((name, index) => {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 256;
  labelCanvas.height = 256;
  const context = labelCanvas.getContext("2d");
  context.clearRect(0, 0, 256, 256);
  context.fillStyle = "rgba(8, 28, 48, .82)";
  context.strokeStyle = index % 3 === 0 ? "rgba(255,155,87,.72)" : "rgba(112,224,232,.72)";
  context.lineWidth = 5;
  context.beginPath();
  context.roundRect(16, 16, 224, 224, 28);
  context.fill();
  context.stroke();
  context.fillStyle = index % 3 === 0 ? "#ffc18e" : "#a0e8f2";
  context.font = name.length > 7 ? "700 27px monospace" : "700 34px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(name, 128, 128, 190);

  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const item = new THREE.Mesh(
    new THREE.PlaneGeometry(.82, .82),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: .48,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  item.userData = {
    speed: .09 + (index % 5) * .018,
    phase: index * 1.43,
    lane: -3.8 + (index % 5) * 1.9
  };
  item.position.set(-9 + index * 1.8, item.userData.lane, -.8 - (index % 3) * .15);
  item.scale.setScalar(.72 + (index % 3) * .1);
  devopsSystem.add(item);
  techItems.push(item);
});

const clouds = [];
for (let i = 0; i < 5; i++) {
  const cloud = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: 0x76cdf4,
    transparent: true,
    opacity: .12,
    depthWrite: false
  });
  [[-.62, 0, .35], [0, .16, .48], [.58, 0, .36], [.95, -.12, .24]].forEach(([x, y, radius]) => {
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), material);
    bubble.position.set(x, y, 0);
    cloud.add(bubble);
  });
  cloud.userData = { speed: .045 + i * .008, phase: i * 2.1, lane: 3.4 - i * 1.72 };
  cloud.position.set(-9 + i * 4, cloud.userData.lane, -1.7);
  cloud.scale.setScalar(.8 + i * .12);
  devopsSystem.add(cloud);
  clouds.push(cloud);
}

gsap.utils.toArray(".reveal").forEach((el) => {
  ScrollTrigger.create({
    trigger: el,
    start: "top 88%",
    onEnter: () => el.classList.add("visible"),
    once: true
  });
});

if (!prefersReducedMotion) {
  gsap.to(".hero-title", { y: -35, opacity: .65, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
}

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
function animate() {
  if (!renderer) return;
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();
  particles.rotation.y = elapsed * .006;
  particles.position.y = Math.sin(elapsed * .08) * .12;
  techItems.forEach((item) => {
    const travel = elapsed * item.userData.speed + item.userData.phase;
    item.position.x = -10 + ((travel % 20 + 20) % 20);
    item.position.y = item.userData.lane + Math.sin(elapsed * .28 + item.userData.phase) * .22;
    item.rotation.z = Math.sin(elapsed * .16 + item.userData.phase) * .055;
    item.material.opacity = .42 + Math.sin(elapsed * .5 + item.userData.phase) * .07;
  });
  clouds.forEach((cloud) => {
    cloud.position.x = -11 + ((elapsed * cloud.userData.speed + cloud.userData.phase + 11) % 22);
    cloud.position.y = cloud.userData.lane + Math.sin(elapsed * .18 + cloud.userData.phase) * .28;
  });
  renderer.render(scene, camera);
}
if (renderer && !prefersReducedMotion) animate();

function resizeScene() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  devopsSystem.position.set(camera.aspect < .65 ? 0 : 1.15, 0, -1.2);
  devopsSystem.scale.setScalar(camera.aspect < .65 ? .58 : camera.aspect < 1.3 ? .72 : .82);
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
