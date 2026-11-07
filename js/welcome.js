
/* EXCABASE — Cinematic Welcome Montage */
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const videoA = document.getElementById("welcomeVideoA");
    const videoB = document.getElementById("welcomeVideoB");
    const startButton = document.getElementById("welcomeStart");

    if (!videoA || !videoB) return;

    const videoFiles = [
        "../assets/videos/welcome-1.mp4",
        "../assets/videos/welcome-2.mp4",
        "../assets/videos/welcome-3.mp4",
        "../assets/videos/welcome-4.mp4",
    
    ];

    const CROSSFADE = 0.8;
    const FALLBACK_DURATION = 10;
    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    let activeVideo = videoA;
    let standbyVideo = videoB;
    let currentIndex = 0;
    let transitioning = false;
    let transitionTimer = null;
    let failedCount = 0;

    function clearTransitionTimer() {
        if (transitionTimer !== null) {
            clearTimeout(transitionTimer);
            transitionTimer = null;
        }
    }

    function prepareVideo(video, index) {
        video.pause();
        video.src = videoFiles[index];
        video.muted = true;
        video.playsInline = true;
        video.load();
    }

    async function playVideo(video) {
        try {
            await video.play();
            failedCount = 0;
            return true;
        } catch (error) {
            console.warn("Video tidak dapat diputar:", error);
            return false;
        }
    }

    async function nextVideo() {
        if (transitioning || reducedMotion) return;

        transitioning = true;
        clearTransitionTimer();

        const nextIndex = (currentIndex + 1) % videoFiles.length;
        prepareVideo(standbyVideo, nextIndex);

        const ready = await playVideo(standbyVideo);

        if (!ready) {
            transitioning = false;
            failedCount++;

            if (failedCount < videoFiles.length) {
                currentIndex = nextIndex;
                transitionTimer = setTimeout(nextVideo, 1000);
            }
            return;
        }

        standbyVideo.classList.add("is-active");
        activeVideo.classList.remove("is-active");

        const previousVideo = activeVideo;
        activeVideo = standbyVideo;
        standbyVideo = previousVideo;
        currentIndex = nextIndex;

        setTimeout(() => {
            standbyVideo.pause();
            standbyVideo.removeAttribute("src");
            standbyVideo.load();
            transitioning = false;
            scheduleNextVideo();
        }, CROSSFADE * 1000);
    }

    function scheduleNextVideo() {
        if (reducedMotion) return;

        clearTransitionTimer();

        const duration = Number.isFinite(activeVideo.duration)
            ? activeVideo.duration
            : FALLBACK_DURATION;

        const remaining = Math.max(
            1,
            duration - activeVideo.currentTime - CROSSFADE
        );

        transitionTimer = setTimeout(
            nextVideo,
            remaining * 1000
        );
    }

    async function initializeMontage() {
        if (reducedMotion) return;

        prepareVideo(activeVideo, currentIndex);

        const started = await playVideo(activeVideo);

        if (started) {
            scheduleNextVideo();
        } else {
            transitionTimer = setTimeout(nextVideo, 1000);
        }
    }

    document.addEventListener("visibilitychange", () => {
        if (reducedMotion) return;

        if (document.hidden) {
            clearTransitionTimer();
            activeVideo.pause();
        } else if (!transitioning) {
            playVideo(activeVideo).then(started => {
                if (started) scheduleNextVideo();
            });
        }
    });

    if (startButton) {
        startButton.addEventListener("click", () => {
            try {
                sessionStorage.setItem(
                    "excabase_welcome_seen",
                    "true"
                );
            } catch (error) {
                console.warn("Session storage tidak tersedia:", error);
            }
        });
    }

    initializeMontage();
});
