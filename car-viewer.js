

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// single-file model — geometry is Draco-compressed, so DRACOLoader below is required
const MODEL_URL = "f2008.glb";
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

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
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
