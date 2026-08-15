/*
   Pranjal's F1 portfolio — page transition
   ------------------------------------------------
   What this does:
   1. Injects a full-screen "wipe" overlay with an SVG car + your name
      as a livery decal, riding at the leading edge.
   2. When someone clicks an internal nav link, the car sweeps in from
      the left and covers the whole screen — THEN we navigate.
   3. On the next page's load, the overlay starts already covering the
      screen (no flash) and the car continues sweeping off to the right,
      revealing the new page. Same motion, split across two page loads.
   4. Respects prefers-reduced-motion (skips straight to navigation).

   Setup: add this before </body> on every page:
     <script src="transition.js"></script>
   No other HTML edits needed — the overlay is built in JS.
   Requires style.css (the .page-transition rules) to already be loaded.
*/

(function () {
    "use strict";

    var DUR = 550; // ms, must match the CSS transition duration
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var DRIVER_NAME = "PRANJAL CHAUDHARY";
    var DRIVER_ROLE = "DRIVER // FULL-STACK";

    var CAR_SVG =
        '<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg">' +
            '<g fill="none" fill-rule="evenodd">' +
                // rear wing
                '<rect x="4" y="30" width="10" height="26" rx="2" fill="#0a0a0a"/>' +
                '<rect x="2" y="28" width="14" height="5" rx="1.5" fill="#E10600"/>' +
                // main body wedge
                '<path d="M14 62 C40 40, 90 34, 140 34 L230 34 C255 34, 268 44, 282 52 L282 66 C260 70, 220 72, 170 72 L60 72 C38 72, 22 68, 14 62 Z" fill="#E10600"/>' +
                // cockpit
                '<path d="M150 34 C158 22, 178 20, 192 28 L198 34 Z" fill="#0a0a0a"/>' +
                // sidepod stripe (decal sits visually on this band)
                '<rect x="60" y="52" width="150" height="10" fill="#0a0a0a" opacity="0.55"/>' +
                // front wing
                '<rect x="278" y="58" width="18" height="6" rx="1.5" fill="#0a0a0a"/>' +
                '<rect x="280" y="56" width="4" height="10" fill="#FFD400"/>' +
                // wheels
                '<circle cx="70" cy="74" r="17" fill="#0a0a0a"/>' +
                '<circle cx="70" cy="74" r="7" fill="#3a3a3a"/>' +
                '<circle cx="228" cy="74" r="17" fill="#0a0a0a"/>' +
                '<circle cx="228" cy="74" r="7" fill="#3a3a3a"/>' +
            '</g>' +
        '</svg>';

    function buildOverlay() {
        var overlay = document.createElement("div");
        overlay.className = "page-transition";
        overlay.setAttribute("aria-hidden", "true");

        overlay.innerHTML =
            '<div class="wipe-panel">' +
                '<div class="speed-lines"></div>' +
                '<div class="car-livery">' +
                    CAR_SVG +
                    '<div class="decal">' +
                        '<span class="decal-name">' + DRIVER_NAME + '</span>' +
                        '<span class="decal-role">' + DRIVER_ROLE + '</span>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);
        return overlay;
    }

    function isInternalNavLink(a) {
        if (!a.href) return false;
        if (a.target && a.target !== "" && a.target !== "_self") return false;
        if (a.hasAttribute("download")) return false;
        var url;
        try {
            url = new URL(a.href, window.location.href);
        } catch (e) {
            return false;
        }
        if (url.origin !== window.location.origin) return false;
        if (url.pathname === window.location.pathname) return false; // already here
        return true;
    }

    function init() {
        var overlay = buildOverlay();

        if (reduceMotion) {
            // No animation — just clear any stale flag and get out of the way.
            sessionStorage.removeItem("ftIncoming");
            return;
        }

        // --- Arriving on this page as part of a transition already in flight ---
        if (sessionStorage.getItem("ftIncoming") === "1") {
            sessionStorage.removeItem("ftIncoming");

            overlay.classList.add("is-active"); // start already covering, no flash
            // Force layout so the browser registers the "covered" state
            // before we animate away from it.
            // eslint-disable-next-line no-unused-expressions
            overlay.offsetHeight;

            requestAnimationFrame(function () {
                overlay.classList.remove("is-active");
                overlay.classList.add("is-exiting");
            });

            setTimeout(function () {
                overlay.classList.remove("is-exiting");
            }, DUR + 50);
        }

        // --- Wire up nav links for the next transition ---
        var navLinks = document.querySelectorAll("nav a[href], .nav a[href]");
        navLinks.forEach(function (link) {
            if (!isInternalNavLink(link)) return;

            link.addEventListener("click", function (e) {
                e.preventDefault();
                var destination = link.href;

                overlay.classList.add("is-active"); // sweep in, cover the screen

                setTimeout(function () {
                    sessionStorage.setItem("ftIncoming", "1");
                    window.location.href = destination;
                }, DUR);
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
