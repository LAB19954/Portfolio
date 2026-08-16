/*
 * PRANJAL // F1 PORTFOLIO
 * Small interaction layer for navigation, the start-light intro,
 * and the Race / GitHub overlay.
 */

(function () {
    "use strict";

    var GITHUB_USERNAME = "LAB19064";
    var MODEL_URL = "https://sketchfab.com/3d-models/2008-ferrari-f2008-0476bd73b8d84e0e99d5197140bc22d6";
    var MODEL_CREATOR_URL = "https://sketchfab.com/Tyler_Dave";
    var MODEL_LICENSE_URL = "http://creativecommons.org/licenses/by/4.0/";
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function injectStartLights() {
        if (reduceMotion || sessionStorage.getItem("pranjal-start-seen")) return;

        var overlay = document.createElement("div");
        overlay.className = "start-lights";
        overlay.setAttribute("aria-hidden", "true");

        for (var i = 0; i < 5; i++) {
            var light = document.createElement("span");
            light.className = "light";
            overlay.appendChild(light);
        }

        document.body.appendChild(overlay);

        sessionStorage.setItem("pranjal-start-seen", "1");

        setTimeout(function () {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 3600);
    }

    function buildRaceOverlay() {
        var overlay = document.createElement("div");
        overlay.className = "race-overlay";
        overlay.setAttribute("aria-hidden", "true");

        overlay.innerHTML =
            '<div class="race-overlay-backdrop"></div>' +
            '<section class="race-dialog" role="dialog" aria-modal="true" aria-labelledby="raceDialogTitle">' +
                '<button class="race-close" type="button" aria-label="Close">×</button>' +
                '<div class="race-stage race-stage-credit is-active">' +
                    '<span class="race-kicker">RACE // MODEL CREDIT</span>' +
                    '<h2 id="raceDialogTitle">BEFORE THE GRID</h2>' +
                    '<p class="race-intro">The 3D car in the garage is the 2008 Ferrari F2008. This portfolio uses the public model as the interactive shell, credited to Dave Love on Sketchfab under CC-BY-4.0.</p>' +
                    '<div class="race-credit-card">' +
                        '<div><span>MODEL</span><strong>2008 FERRARI F2008</strong></div>' +
                        '<div><span>CREATOR</span><strong>DAVE LOVE / TYLER_DAVE</strong></div>' +
                        '<div><span>LICENSE</span><strong>CC-BY-4.0</strong></div>' +
                    '</div>' +
                    '<div class="race-actions">' +
                        '<a class="race-secondary" href="' + MODEL_URL + '" target="_blank" rel="noopener">VIEW MODEL SOURCE</a>' +
                        '<button class="race-primary" type="button" data-action="repos">SHOW MY GITHUB</button>' +
                    '</div>' +
                    '<p class="race-footnote">The credit shown here matches the attribution already present beneath the 3D model.</p>' +
                '</div>' +
                '<div class="race-stage race-stage-repos">' +
                    '<span class="race-kicker">RACE // PROJECT GARAGE</span>' +
                    '<div class="race-repo-head">' +
                        '<div>' +
                            '<h2>WHAT I\'M BUILDING</h2>' +
                            '<p>Public repositories pulled from GitHub, so the project list never goes stale.</p>' +
                        '</div>' +
                        '<a class="race-profile-link" href="https://github.com/' + GITHUB_USERNAME + '" target="_blank" rel="noopener">GITHUB ↗</a>' +
                    '</div>' +
                    '<div class="repo-grid" data-repo-grid>' +
                        '<p class="repo-loading">READING THE PIT WALL…</p>' +
                    '</div>' +
                    '<button class="race-back" type="button" data-action="back">← MODEL CREDIT</button>' +
                '</div>' +
            '</section>';

        document.body.appendChild(overlay);

        var dialog = overlay.querySelector(".race-dialog");
        var creditStage = overlay.querySelector(".race-stage-credit");
        var repoStage = overlay.querySelector(".race-stage-repos");
        var grid = overlay.querySelector("[data-repo-grid]");

        function close() {
            overlay.classList.remove("is-open");
            overlay.setAttribute("aria-hidden", "true");
            document.body.classList.remove("modal-open");
        }

        function showRepos() {
            creditStage.classList.remove("is-active");
            repoStage.classList.add("is-active");
            loadRepos(grid);
        }

        function showCredit() {
            repoStage.classList.remove("is-active");
            creditStage.classList.add("is-active");
        }

        overlay.addEventListener("click", function (event) {
            if (event.target === overlay || event.target.classList.contains("race-overlay-backdrop")) {
                close();
            }
        });

        overlay.querySelector(".race-close").addEventListener("click", close);
        overlay.querySelector('[data-action="repos"]').addEventListener("click", showRepos);
        overlay.querySelector('[data-action="back"]').addEventListener("click", showCredit);

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && overlay.classList.contains("is-open")) {
                close();
            }
        });

        overlay.open = function () {
            overlay.classList.add("is-open");
            overlay.setAttribute("aria-hidden", "false");
            document.body.classList.add("modal-open");
            creditStage.classList.add("is-active");
            repoStage.classList.remove("is-active");
            setTimeout(function () {
                var primary = overlay.querySelector(".race-primary");
                if (primary) primary.focus();
            }, 40);
        };

        return overlay;
    }

    function loadRepos(grid) {
        if (grid.dataset.loaded === "1") return;

        grid.dataset.loaded = "1";

        fetch("https://api.github.com/users/" + encodeURIComponent(GITHUB_USERNAME) + "/repos?sort=updated&direction=desc&per_page=8")
            .then(function (response) {
                if (!response.ok) throw new Error("GitHub returned " + response.status);
                return response.json();
            })
            .then(function (repos) {
                grid.innerHTML = "";

                repos
                    .filter(function (repo) { return !repo.fork; })
                    .slice(0, 6)
                    .forEach(function (repo, index) {
                        var card = document.createElement("a");
                        card.className = "repo-card";
                        card.href = repo.html_url;
                        card.target = "_blank";
                        card.rel = "noopener";
                        card.style.setProperty("--repo-order", index);

                        card.innerHTML =
                            '<div class="repo-number">0' + (index + 1) + '</div>' +
                            '<div class="repo-copy">' +
                                '<h3>' + escapeHtml(repo.name) + '</h3>' +
                                '<p>' + escapeHtml(repo.description || "No description yet. Open it and see what it does.") + '</p>' +
                            '</div>' +
                            '<div class="repo-meta">' +
                                '<span>' + escapeHtml(repo.language || "MISC") + '</span>' +
                                '<span>VIEW ↗</span>' +
                            '</div>';

                        grid.appendChild(card);
                    });

                if (!grid.children.length) {
                    grid.innerHTML = '<p class="repo-loading">No public repositories came back. The GitHub profile is still open above.</p>';
                }
            })
            .catch(function (error) {
                console.error("GitHub repo load failed:", error);
                grid.innerHTML =
                    '<p class="repo-loading">Couldn\'t pull the repo list right now. <a href="https://github.com/' +
                    GITHUB_USERNAME +
                    '" target="_blank" rel="noopener">Open GitHub directly ↗</a></p>';
            });
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function init() {
        injectStartLights();

        var raceOverlay = buildRaceOverlay();

        var raceLink = document.getElementById("navRaceLink");
        if (raceLink) {
            raceLink.addEventListener("click", function (event) {
                event.preventDefault();
                raceOverlay.open();
            });
        }

        // Make the page links feel intentional without taking away
        // the browser's normal navigation if JS is unavailable.
        document.querySelectorAll(".nav a").forEach(function (link) {
            if (link.id === "navRaceLink" || link.id === "navDriverLink") return;
            if (!link.href || link.href.indexOf("mailto:") === 0) return;

            link.addEventListener("click", function () {
                document.body.classList.add("page-leaving");
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
