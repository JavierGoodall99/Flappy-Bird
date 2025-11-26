
import * as THREE from 'three';
import { COLORS } from '../constants';

export const setupThreeScene = (container: HTMLDivElement, width: number, height: number) => {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x6366F1, 0.0002); 

  // Create Background Gradient Texture
  const canvas = document.createElement('canvas');
  canvas.width = 2; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, COLORS.SKY_TOP);
    grad.addColorStop(1, COLORS.SKY_BOTTOM);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 512);
  }
  const bgTexture = new THREE.CanvasTexture(canvas);
  scene.background = bgTexture;

  // Camera Setup
  const fov = 40;
  const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 5000);
  const dist = height / (2 * Math.tan((fov * Math.PI) / 360));
  camera.position.set(0, 0, dist);
  camera.lookAt(0, 0, 0);

  // Renderer Setup
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(100, 200, 200);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048; 
  dirLight.shadow.mapSize.height = 2048;
  const d = 1000;
  dirLight.shadow.camera.left = -d; dirLight.shadow.camera.right = d; 
  dirLight.shadow.camera.top = d; dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(-50, 50, 100);
  scene.add(fillLight);

  return { scene, camera, renderer, bgTexture };
};
