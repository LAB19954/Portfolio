
(function () {
    "use strict";

    var DUR = 550; 
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
        if (url.pathname === window.location.pathname) return false; 
        return true;
    }

    function init() {
        var overlay = buildOverlay();

        if (reduceMotion) {
           
            sessionStorage.removeItem("ftIncoming");
            return;
        }

       
        if (sessionStorage.getItem("ftIncoming") === "1") {
            sessionStorage.removeItem("ftIncoming");

            overlay.classList.add("is-active"); 
          
            overlay.offsetHeight;

            requestAnimationFrame(function () {
                overlay.classList.remove("is-active");
                overlay.classList.add("is-exiting");
            });

            setTimeout(function () {
                overlay.classList.remove("is-exiting");
            }, DUR + 50);
        }


        var navLinks = document.querySelectorAll("nav a[href], .nav a[href]");
        navLinks.forEach(function (link) {
            if (!isInternalNavLink(link)) return;

            link.addEventListener("click", function (e) {
                e.preventDefault();
                var destination = link.href;

                overlay.classList.add("is-active"); 

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
