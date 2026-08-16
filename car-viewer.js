

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const MODEL_URL = "f2008.glb";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


const DRIVER_BIO = {
    title: "THE DRIVER",
    name: "Pranjal Chaudhary",
    department: "Mechanical Engineering",
    body: "Mechanical engineering by degree, web development by choice. I like building things, breaking them, fixing them, and occasionally asking why I started at 3 AM.",
    hobbies: [
        "Watching F1",
        "Anime",
        "Binge-watching movies",
        "Web development",
        "Building weird side quests"
    ]
};

const HOTSPOTS = [
    {
        match: ["cockpit", "glass"],
        title: DRIVER_BIO.title,
        body: DRIVER_BIO.body
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

// shared state so nav clicks (outside initViewer's closure) can drive the camera
var viewerRefs = {
    camera: null,
    controls: null,
    carModel: null,
    cockpitTarget: null,
    ready: false,
    readyCallbacks: [],
    tween: null // { startPos, endPos, startTarget, endTarget, startTime, duration }
};

function onCarReady(callback) {
    if (viewerRefs.ready) callback();
    else viewerRefs.readyCallbacks.push(callback);
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function flyCameraTo(targetPos, lookAtPos, duration, onComplete) {
    if (!viewerRefs.camera || !viewerRefs.controls) return;

    if (reduceMotion) {
        viewerRefs.camera.position.copy(targetPos);
        viewerRefs.controls.target.copy(lookAtPos);
        if (typeof onComplete === "function") onComplete();
        return;
    }

    viewerRefs.controls.autoRotate = false;

    viewerRefs.tween = {
        startPos: viewerRefs.camera.position.clone(),
        endPos: targetPos.clone(),
        startTarget: viewerRefs.controls.target.clone(),
        endTarget: lookAtPos.clone(),
        startTime: performance.now(),
        duration: duration || 1200,
        onComplete: onComplete || null
    };
}

function zoomToCockpit(onComplete) {
    if (!viewerRefs.carModel) return;

    var lookAt = viewerRefs.cockpitTarget || new THREE.Vector3(0, 0.5, 0);

    // Put the camera just above and to the side of the cockpit so the
    // movement feels like a deliberate "camera rig" move, not a jump.
    var camPos = lookAt.clone().add(new THREE.Vector3(0.9, 0.45, 1.25));

    flyCameraTo(camPos, lookAt, 1400, onComplete);
}

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

function ensureDriverPanel(container) {
    var panel = container.querySelector(".driver-profile-panel");
    if (panel) return panel;

    panel = document.createElement("aside");
    panel.className = "driver-profile-panel";
    panel.setAttribute("aria-label", "Driver profile");
    panel.innerHTML =
        '<div class="driver-panel-top">' +
            '<span class="driver-panel-kicker">COCKPIT // DRIVER PROFILE</span>' +
            '<button type="button" class="driver-panel-close" aria-label="Close driver profile">×</button>' +
        '</div>' +
        '<h2 class="driver-panel-name"></h2>' +
        '<p class="driver-panel-dept"></p>' +
        '<p class="driver-panel-body"></p>' +
        '<div class="driver-hobbies"></div>' +
        '<div class="driver-panel-footer"><span>STATUS</span><strong>READY TO BUILD</strong></div>';

    container.appendChild(panel);

    panel.querySelector(".driver-panel-close").addEventListener("click", function () {
        panel.classList.remove("is-open");
        container.classList.remove("is-cockpit");
    });

    return panel;
}

function showDriverPanel(container) {
    var panel = ensureDriverPanel(container);

    panel.querySelector(".driver-panel-name").textContent = DRIVER_BIO.name;
    panel.querySelector(".driver-panel-dept").textContent = DRIVER_BIO.department;
    panel.querySelector(".driver-panel-body").textContent = DRIVER_BIO.body;

    var hobbies = panel.querySelector(".driver-hobbies");
    hobbies.innerHTML = "";
    DRIVER_BIO.hobbies.forEach(function (hobby) {
        var chip = document.createElement("span");
        chip.className = "driver-hobby";
        chip.textContent = hobby;
        hobbies.appendChild(chip);
    });

    container.classList.add("is-cockpit");
    panel.classList.add("is-open");
}

function goToDriverProfile() {
    if (!viewerContainer) return;

    var section = document.getElementById("showcase") || viewerContainer;
    section.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start"
    });

    startViewer();

    onCarReady(function () {
        zoomToCockpit(function () {
            showDriverPanel(viewerContainer);
        });
    });
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

    viewerRefs.camera = camera;
    viewerRefs.controls = controls;

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
            viewerRefs.carModel = model;

            // find cockpit/glass meshes specifically so we know where to zoom
            var cockpitBox = new THREE.Box3();
            var foundCockpit = false;
            model.traverse(function (obj) {
                if (!obj.isMesh || !obj.material) return;
                var mn = (obj.material.name || "").toLowerCase();
                if (mn.indexOf("cockpit") !== -1 || mn.indexOf("glass") !== -1) {
                    cockpitBox.expandByObject(obj);
                    foundCockpit = true;
                }
            });
            viewerRefs.cockpitTarget = foundCockpit
                ? cockpitBox.getCenter(new THREE.Vector3())
                : new THREE.Vector3(0, size.y * scale * 0.3, 0);

            viewerRefs.ready = true;
            viewerRefs.readyCallbacks.forEach(function (cb) { cb(); });
            viewerRefs.readyCallbacks = [];

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

        if (viewerRefs.tween) {
            var tween = viewerRefs.tween;
            var elapsed = performance.now() - tween.startTime;
            var progress = Math.min(1, elapsed / tween.duration);
            var eased = easeInOutCubic(progress);

            camera.position.lerpVectors(tween.startPos, tween.endPos, eased);
            controls.target.lerpVectors(tween.startTarget, tween.endTarget, eased);

            if (progress >= 1) {
                viewerRefs.tween = null;
                if (typeof tween.onComplete === "function") {
                    var callback = tween.onComplete;
                    tween.onComplete = null;
                    callback();
                }
            }
        }

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

    var driverLink = document.getElementById("navDriverLink");
    if (driverLink) {
        driverLink.addEventListener("click", function (event) {
            event.preventDefault();
            goToDriverProfile();
        });
    }
}

window.f1Viewer = {
    goToDriverProfile: goToDriverProfile,
    zoomToCockpit: function () {
        onCarReady(function () {
            zoomToCockpit();
        });
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
