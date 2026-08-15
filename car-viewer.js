/*
   Pranjal's F1 portfolio — 3D car showcase
   ------------------------------------------------
   Loads car-model/scene.gltf into an orbit-controllable viewer.

   Requires an import map in the page's <head> (Three.js has no bundler here,
   so the browser needs to know where to fetch it from):

     <script type="importmap">
     {
       "imports": {
         "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
         "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
       }
     }
     </script>
     <script type="module" src="car-viewer.js"></script>

   And this markup wherever you want the showcase (e.g. Driver or Race page):

     <section class="car-showcase">
       <div class="car-canvas-wrap" id="carViewer">
         <canvas id="carCanvas"></canvas>
         <p class="car-loading" id="carLoading">LOADING TELEMETRY… 0%</p>
       </div>
       <p class="model-credit">
         This work is based on "2008 Ferrari F2008"
         (https://sketchfab.com/3d-models/2008-ferrari-f2008-0476bd73b8d84e0e99d5197140bc22d6)
         by Dave Love SketchFab (https://sketchfab.com/Tyler_Dave),
         licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/).
       </p>
     </section>

   The model only loads once #carViewer scrolls into view, so it doesn't
   slow down the initial page load on Garage/Driver/etc.
*/

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const MODEL_URL = "car-model/scene.gltf";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function initViewer(container) {
    const canvas = container.querySelector("#carCanvas") || container.querySelector("canvas");
    const loadingEl = container.querySelector("#carLoading") || container.querySelector(".car-loading");

    const scene = new THREE.Scene();
    scene.background = null; // transparent — shows the carbon-black page behind it

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
    camera.position.set(4.5, 1.8, 4.5);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // --- lighting: cool key light + a Ferrari-red rim, so the livery pops ---
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xE10600, 2.2);
    rimLight.position.set(-6, 2, -4);
    scene.add(rimLight);

    const fill = new THREE.HemisphereLight(0xffffff, 0x0a0a0a, 0.6);
    scene.add(fill);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.5;
    controls.maxDistance = 9;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.52; // keep the camera above the ground plane
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 1.1;
    controls.target.set(0, 0.4, 0);

    function resize() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const loader = new GLTFLoader();
    loader.load(
        MODEL_URL,
        function (gltf) {
            const model = gltf.scene;

            // center + normalize scale so any export size fits the same view
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();
            box.getSize(size);
            box.getCenter(center);

            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 3.2 / maxDim;
            model.scale.setScalar(scale);

            box.setFromObject(model);
            box.getCenter(center);
            model.position.sub(center);
            model.position.y += size.y * scale * 0.02;

            scene.add(model);

            if (loadingEl) {
                loadingEl.style.opacity = "0";
                setTimeout(function () { loadingEl.style.display = "none"; }, 400);
            }
        },
        function (progress) {
            if (loadingEl && progress.lengthComputable) {
                const pct = Math.round((progress.loaded / progress.total) * 100);
                loadingEl.textContent = "LOADING TELEMETRY\u2026 " + pct + "%";
            }
        },
        function (error) {
            if (loadingEl) loadingEl.textContent = "MODEL FAILED TO LOAD — CHECK car-model/ PATH";
            console.error("GLTF load error:", error);
        }
    );

    (function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    })();
}

function bootWhenVisible() {
    const container = document.getElementById("carViewer");
    if (!container) return; // page doesn't have the showcase, nothing to do

    let started = false;
    const observer = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting && !started) {
                    started = true;
                    initViewer(container);
                    observer.disconnect();
                }
            });
        },
        { rootMargin: "200px" }
    );
    observer.observe(container);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootWhenVisible);
} else {
    bootWhenVisible();
}
