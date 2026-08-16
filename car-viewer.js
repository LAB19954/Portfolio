

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const MODEL_URL = "f2008.glb";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const HOTSPOTS = [
    {
        match: ["cockpit", "glass"],
        title: "THE DRIVER",
        body: "Pranjal Chaudhary — B.Tech at IIT Gandhinagar, builds fast, detail-obsessed web experiences. This whole site is one of them."
    },
    {
        match: ["side_left", "side_right", "side", "susbody", "suspcar", "calliper"],
        title: "SKILLS",
        body: "HTML / CSS / JS, real-time apps with Firebase, and 3D on the web with Three.js — like the car you're looking at right now."
    },
    {
        match: ["front_nose"],
        title: "PROJECTS",
        body: "Campus web platforms, real-time multiplayer experiences, and interactive sites built from scratch — this portfolio included."
    },
    {
        match: ["tread"],
        title: "EXPERIENCE",
        body: "Iterative builder — ship, expand, refine, repeat. Ask me about the projects on the Race page."
    },
    {
        match: ["steeringwheel", "steer_carbon"],
        title: "GET IN TOUCH",
        body: "Want to build something together? Head to the Manager page for contact details."
    },
    {
        match: [], // catch-all: carbon, carbon2, wood, tcam, mirror, cover, material
        title: "CHASSIS",
        body: "2008 Ferrari F2008 — modeled by Dave Love (Sketchfab), CC-BY-4.0. Every panel on this car is clickable."
    }
];

function findHotspot(materialName) {
    const name = (materialName || "").toLowerCase();
    for (var i = 0; i < HOTSPOTS.length - 1; i++) {
        var hs = HOTSPOTS[i];
        for (var j = 0; j < hs.match.length; j++) {
            if (name.indexOf(hs.match[j]) !== -1) return hs;
        }
    }
    return HOTSPOTS[HOTSPOTS.length - 1]; // catch-all
}

var viewerStarted = false;
var viewerContainer = null;

function ensureInfoPanel(container) {
    var panel = container.querySelector(".car-info-panel");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.className = "car-info-panel";
    panel.innerHTML =
        '<button type="button" class="car-info-close" aria-label="Close">\u00d7</button>' +
        '<p class="car-info-title"></p>' +
        '<p class="car-info-body"></p>';
    container.appendChild(panel);

    panel.querySelector(".car-info-close").addEventListener("click", function () {
        panel.classList.remove("is-open");
    });

    return panel;
}

function showInfoPanel(container, hotspot) {
    var panel = ensureInfoPanel(container);
    panel.querySelector(".car-info-title").textContent = hotspot.title;
    panel.querySelector(".car-info-body").textContent = hotspot.body;
    panel.classList.add("is-open");
}

function initViewer(container) {
    var canvas = container.querySelector("#carCanvas") || container.querySelector("canvas");
    var loadingEl = container.querySelector("#carLoading") || container.querySelector(".car-loading");
    var hintEl = container.querySelector("#carHint") || container.querySelector(".car-hint");

    var scene = new THREE.Scene();
    scene.background = null;

    var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
    camera.position.set(4.5, 1.8, 4.5);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    var keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    var rimLight = new THREE.DirectionalLight(0xE10600, 2.2);
    rimLight.position.set(-6, 2, -4);
    scene.add(rimLight);

    var fill = new THREE.HemisphereLight(0xffffff, 0x0a0a0a, 0.6);
    scene.add(fill);

    var controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.5;
    controls.maxDistance = 9;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 1.1;
    controls.target.set(0, 0.4, 0);

    function resize() {
        var w = container.clientWidth;
        var h = container.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    var resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    var dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");

    var loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    var carModel = null;

    loader.load(
        MODEL_URL,
        function (gltf) {
            var model = gltf.scene;

            var box = new THREE.Box3().setFromObject(model);
            var size = new THREE.Vector3();
            var center = new THREE.Vector3();
            box.getSize(size);
            box.getCenter(center);

            var maxDim = Math.max(size.x, size.y, size.z);
            var scale = 3.2 / maxDim;
            model.scale.setScalar(scale);

            box.setFromObject(model);
            box.getCenter(center);
            model.position.sub(center);
            model.position.y += size.y * scale * 0.02;

            scene.add(model);
            carModel = model;

            if (loadingEl) {
                loadingEl.style.opacity = "0";
                setTimeout(function () { loadingEl.style.display = "none"; }, 400);
            }
            if (hintEl) hintEl.classList.add("is-visible");
        },
        function (progress) {
            if (loadingEl && progress.lengthComputable) {
                var pct = Math.round((progress.loaded / progress.total) * 100);
                loadingEl.textContent = "LOADING TELEMETRY\u2026 " + pct + "%";
            }
        },
        function (error) {
            if (loadingEl) loadingEl.textContent = "MODEL FAILED TO LOAD — CHECK f2008.glb IS NEXT TO YOUR HTML AND YOU'RE VIEWING VIA A LOCAL SERVER, NOT file://";
            console.error("GLTF load error:", error);
        }
    );

    // --- click-to-explore: raycast against the car, open the matching info panel ---
    var raycaster = new THREE.Raycaster();
    var pointer = new THREE.Vector2();
    var downPos = null;

    function setPointer(event) {
        var rect = canvas.getBoundingClientRect();
        var clientX = event.clientX !== undefined ? event.clientX : (event.changedTouches && event.changedTouches[0].clientX);
        var clientY = event.clientY !== undefined ? event.clientY : (event.changedTouches && event.changedTouches[0].clientY);
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        return { x: clientX, y: clientY };
    }

    canvas.addEventListener("pointerdown", function (event) {
        downPos = setPointer(event);
    });

    canvas.addEventListener("pointermove", function (event) {
        if (!carModel) return;
        var pos = setPointer(event);
        raycaster.setFromCamera(pointer, camera);
        var hits = raycaster.intersectObject(carModel, true);
        canvas.style.cursor = hits.length > 0 ? "pointer" : "grab";
        void pos;
    });

    canvas.addEventListener("pointerup", function (event) {
        if (!carModel || !downPos) return;
        var upPos = setPointer(event);
        var moved = Math.hypot(upPos.x - downPos.x, upPos.y - downPos.y);
        downPos = null;
        if (moved > 6) return; // it was a drag to orbit, not a click

        raycaster.setFromCamera(pointer, camera);
        var hits = raycaster.intersectObject(carModel, true);
        if (hits.length === 0) return;

        var hit = hits[0].object;
        var materialName = hit.material && hit.material.name;
        var hotspot = findHotspot(materialName);
        showInfoPanel(container, hotspot);
    });

    (function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    })();
}

function startViewer() {
    if (viewerStarted || !viewerContainer) return;
    viewerStarted = true;
    initViewer(viewerContainer);
}

function init() {
    viewerContainer = document.getElementById("carViewer");
    if (!viewerContainer) return; // this page doesn't have the showcase

    // load once it scrolls into view...
    var observer = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    startViewer();
                    observer.disconnect();
                }
            });
        },
        { rootMargin: "200px" }
    );
    observer.observe(viewerContainer);

    // ...or immediately if ENTER GARAGE is clicked, whichever comes first
    var enterBtn = document.getElementById("enterGarageBtn");
    if (enterBtn) {
        enterBtn.addEventListener("click", function () {
            var section = document.getElementById("showcase") || viewerContainer;
            section.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
            startViewer();
        });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
