/*
   PRANJAL // PORTFOLIO INTERACTION LAYER
   --------------------------------------
   One small file shared by every page.

   It handles three things:
   1. the little F1-style loading quote,
   2. smoother page-to-page navigation,
   3. live GitHub cards on the Race page.
*/

(function () {
    "use strict";

    var GITHUB_USERNAME = "LAB19064";
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var loadingQuotes = [
        "LIGHTS OUT. AND AWAY WE GO.",
        "THE LIMIT MOVES WHEN YOU DO.",
        "NO PERFECT LAP. JUST THE NEXT ONE.",
        "FIND THE LINE. THEN BUILD YOUR OWN.",
        "RACE THE LAP YOU HAVE, NOT THE ONE YOU WISHED FOR."
    ];

    function injectQuoteLoader() {
        if (reduceMotion) return;

        var loader = document.createElement("div");
        loader.className = "quote-loader";
        loader.setAttribute("aria-hidden", "true");

        var quote = loadingQuotes[Math.floor(Math.random() * loadingQuotes.length)];

        loader.innerHTML =
            '<div class="quote-loader-box">' +
                '<div class="quote-loader-lights" aria-hidden="true">' +
                    '<span></span><span></span><span></span><span></span><span></span>' +
                '</div>' +
                '<p class="quote-loader-kicker">PIT WALL // INITIALISING</p>' +
                '<p class="quote-loader-text">' + escapeHtml(quote) + '</p>' +
                '<p class="quote-loader-sub">coffee is optional · curiosity is not</p>' +
            '</div>';

        document.body.appendChild(loader);

        // Let the page breathe for a moment, then get out of the way.
        window.setTimeout(function () {
            loader.classList.add("is-done");
            window.setTimeout(function () {
                if (loader.parentNode) loader.parentNode.removeChild(loader);
            }, 700);
        }, 1550);
    }

    function setupPageNavigation() {
        document.querySelectorAll("a[href]").forEach(function (link) {
            var href = link.getAttribute("href");
            if (!href || href.charAt(0) === "#") return;
            if (document.body.dataset.page === "garage" && link.id === "navDriverLink") return;
            if (href.indexOf("mailto:") === 0) return;
            if (link.target === "_blank") return;
            if (href.indexOf("javascript:") === 0) return;

            var url;
            try {
                url = new URL(link.href, window.location.href);
            } catch (_) {
                return;
            }

            if (url.origin !== window.location.origin) return;

            link.addEventListener("click", function (event) {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

                event.preventDefault();
                document.body.classList.add("page-leaving");

                window.setTimeout(function () {
                    window.location.href = link.href;
                }, reduceMotion ? 0 : 220);
            });
        });
    }

    function loadGithubRepos() {
        var grid = document.getElementById("repoGrid");
        if (!grid) return;

        fetch(
            "https://api.github.com/users/" +
            encodeURIComponent(GITHUB_USERNAME) +
            "/repos?sort=updated&direction=desc&per_page=8"
        )
            .then(function (response) {
                if (!response.ok) throw new Error("GitHub returned " + response.status);
                return response.json();
            })
            .then(function (repos) {
                var publicRepos = repos
                    .filter(function (repo) { return !repo.fork; })
                    .slice(0, 8);

                grid.innerHTML = "";

                if (!publicRepos.length) {
                    grid.innerHTML =
                        '<p class="repo-loading">Nothing public showed up yet. <a href="https://github.com/' +
                        GITHUB_USERNAME +
                        '" target="_blank" rel="noopener">Open GitHub directly ↗</a></p>';
                    return;
                }

                publicRepos.forEach(function (repo, index) {
                    var card = document.createElement("a");
                    card.className = "repo-card";
                    card.href = repo.html_url;
                    card.target = "_blank";
                    card.rel = "noopener";
                    card.style.setProperty("--repo-order", index);

                    var number = String(index + 1).padStart(2, "0");
                    var language = repo.language || "MISC";
                    var description = repo.description || "No description yet. Sometimes the code explains it better anyway.";

                    card.innerHTML =
                        '<div class="repo-number">' + number + '</div>' +
                        '<div class="repo-copy">' +
                            '<h3>' + escapeHtml(repo.name) + '</h3>' +
                            '<p>' + escapeHtml(description) + '</p>' +
                        '</div>' +
                        '<div class="repo-meta">' +
                            '<span>' + escapeHtml(language) + '</span>' +
                            '<span>OPEN ↗</span>' +
                        '</div>';

                    grid.appendChild(card);
                });
            })
            .catch(function (error) {
                console.error("GitHub repo load failed:", error);
                grid.innerHTML =
                    '<p class="repo-loading">Couldn\'t read the garage right now. ' +
                    '<a href="https://github.com/' + GITHUB_USERNAME + '" target="_blank" rel="noopener">Open GitHub directly ↗</a></p>';
            });
    }

    function setupGarageFocus() {
        if (document.body.dataset.page !== "garage") return;
        if (!window.location.search.includes("focus=cockpit")) return;

        var tries = 0;
        var timer = window.setInterval(function () {
            tries += 1;
            if (window.f1Viewer && typeof window.f1Viewer.goToDriverProfile === "function") {
                window.clearInterval(timer);
                window.f1Viewer.goToDriverProfile();
            }
            if (tries > 80) window.clearInterval(timer);
        }, 100);
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
        injectQuoteLoader();
        setupPageNavigation();
        loadGithubRepos();
        setupGarageFocus();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
