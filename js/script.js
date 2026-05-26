/**
 * LUX STUDIO - Immersive Cybernetic Audio Engine & Interactions
 * Developed by Lux Automaton
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- 1. PARTICLES & HERO SOUND WAVE BARS ---
  const particlesHost = document.querySelector(".particles");
  if (particlesHost) {
    const count = 50;
    for (let i = 0; i < count; i += 1) {
      const p = document.createElement("span");
      p.className = "particle";
      const size = Math.floor(Math.random() * 4) + 2;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = `${Math.random() * 100}%`;
      p.style.animationDelay = `${Math.random() * 8}s`;
      p.style.animationDuration = `${8 + Math.random() * 8}s`;
      particlesHost.appendChild(p);
    }
  }

  const bars = document.querySelectorAll(".hero-bars");
  bars.forEach((barHost) => {
    barHost.innerHTML = "";
    for (let i = 0; i < 30; i += 1) {
      const line = document.createElement("span");
      line.style.animation = `wave ${0.75 + Math.random() * 0.45}s ease-in-out infinite`;
      line.style.animationDelay = `${i * 0.04}s`;
      line.style.height = `${15 + Math.random() * 85}%`;
      barHost.appendChild(line);
    }
  });

  // --- 2. CUSTOM PREMIUM VIDEO PLAYER CONTROLS ---
  const video = document.getElementById("explainer-video");
  const container = document.getElementById("video-player-container");
  const centerPlayBtn = document.getElementById("video-center-play-btn");
  const playBtn = document.getElementById("video-play-btn");
  const playIcon = document.getElementById("video-play-icon");
  const pauseIcon = document.getElementById("video-pause-icon");
  const progressBar = document.getElementById("video-progress-bar");
  const progressFill = document.getElementById("video-progress-fill");
  const timeCurrent = document.getElementById("video-time-current");
  const timeTotal = document.getElementById("video-time-total");
  const volumeBtn = document.getElementById("video-volume-btn");
  const volumeMutedIcon = document.getElementById("video-volume-muted-icon");
  const volumeLowIcon = document.getElementById("video-volume-low-icon");
  const volumeHighIcon = document.getElementById("video-volume-high-icon");
  const volumeSlider = document.getElementById("video-volume-slider");
  const volumeFill = document.getElementById("video-volume-fill");
  const fullscreenBtn = document.getElementById("video-fullscreen-btn");
  const controlsOverlay = document.getElementById("video-controls-overlay");

  if (video && container) {
    let controlsTimeout = null;

    // Helper to format time (e.g. 95 -> "1:35")
    const formatTime = (timeInSeconds) => {
      const minutes = Math.floor(timeInSeconds / 60);
      const seconds = Math.floor(timeInSeconds % 60);
      return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    };

    // Toggle Play/Pause
    const togglePlay = () => {
      if (video.paused) {
        video.play().catch(err => console.log("Video play failed:", err));
      } else {
        video.pause();
      }
    };

    // Update play/pause UI state
    video.addEventListener("play", () => {
      if (centerPlayBtn) centerPlayBtn.classList.add("fade-out");
      if (playIcon) playIcon.style.display = "none";
      if (pauseIcon) pauseIcon.style.display = "block";
      showControlsTemporarily();
    });

    video.addEventListener("pause", () => {
      if (centerPlayBtn) centerPlayBtn.classList.remove("fade-out");
      if (playIcon) playIcon.style.display = "block";
      if (pauseIcon) pauseIcon.style.display = "none";
      if (controlsOverlay) controlsOverlay.classList.add("visible");
    });

    // Wire play button clicks
    if (centerPlayBtn) centerPlayBtn.addEventListener("click", togglePlay);
    if (playBtn) playBtn.addEventListener("click", togglePlay);
    video.addEventListener("click", togglePlay);

    // Update progress bar & current time
    video.addEventListener("timeupdate", () => {
      if (video.duration) {
        const percentage = (video.currentTime / video.duration) * 100;
        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (timeCurrent) timeCurrent.textContent = formatTime(video.currentTime);
      }
    });

    // Load total duration when metadata is ready
    video.addEventListener("loadedmetadata", () => {
      if (timeTotal) timeTotal.textContent = formatTime(video.duration);
    });

    // Make sure duration is correct if loadedmetadata was already fired before script execution
    if (video.readyState >= 1) {
      if (timeTotal) timeTotal.textContent = formatTime(video.duration);
    }

    // Seek functionality
    const seek = (e) => {
      const rect = progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const seekTime = (clickX / width) * video.duration;
      video.currentTime = seekTime;
    };

    if (progressBar) {
      let isDragging = false;
      progressBar.addEventListener("mousedown", (e) => {
        isDragging = true;
        seek(e);
      });
      document.addEventListener("mousemove", (e) => {
        if (isDragging) seek(e);
      });
      document.addEventListener("mouseup", () => {
        isDragging = false;
      });
      progressBar.addEventListener("touchstart", (e) => {
        isDragging = true;
        const touch = e.touches[0];
        seek(touch);
      }, { passive: true });
      document.addEventListener("touchmove", (e) => {
        if (isDragging) {
          const touch = e.touches[0];
          seek(touch);
        }
      }, { passive: true });
      document.addEventListener("touchend", () => {
        isDragging = false;
      });
    }

    // Volume controls
    let lastVolume = 1.0;
    const updateVolumeUI = (vol) => {
      if (volumeFill) volumeFill.style.width = `${vol * 100}%`;
      
      // Hide all volume icons
      if (volumeMutedIcon) volumeMutedIcon.style.display = "none";
      if (volumeLowIcon) volumeLowIcon.style.display = "none";
      if (volumeHighIcon) volumeHighIcon.style.display = "none";

      if (vol === 0 || video.muted) {
        if (volumeMutedIcon) volumeMutedIcon.style.display = "block";
      } else if (vol < 0.5) {
        if (volumeLowIcon) volumeLowIcon.style.display = "block";
      } else {
        if (volumeHighIcon) volumeHighIcon.style.display = "block";
      }
    };

    const setVolume = (vol) => {
      const clampedVol = Math.max(0, Math.min(1, vol));
      video.volume = clampedVol;
      video.muted = clampedVol === 0;
      updateVolumeUI(clampedVol);
      if (clampedVol > 0) lastVolume = clampedVol;
    };

    // Volume Slider Drag / Click
    const handleVolumeSliderClick = (e) => {
      const rect = volumeSlider.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      setVolume(clickX / width);
    };

    if (volumeSlider) {
      let isVolumeDragging = false;
      volumeSlider.addEventListener("mousedown", (e) => {
        isVolumeDragging = true;
        handleVolumeSliderClick(e);
      });
      document.addEventListener("mousemove", (e) => {
        if (isVolumeDragging) handleVolumeSliderClick(e);
      });
      document.addEventListener("mouseup", () => {
        isVolumeDragging = false;
      });
    }

    // Mute/Unmute toggle
    if (volumeBtn) {
      volumeBtn.addEventListener("click", () => {
        if (video.muted || video.volume === 0) {
          video.muted = false;
          setVolume(lastVolume || 1.0);
        } else {
          video.muted = true;
          updateVolumeUI(0);
        }
      });
    }

    // Fullscreen Toggle with WebKit/iOS support
    const toggleFullscreen = () => {
      const isFullscreen = document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement || 
                           document.msFullscreenElement;

      if (!isFullscreen) {
        if (container.requestFullscreen) {
          container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          container.webkitRequestFullscreen();
        } else if (container.mozRequestFullScreen) {
          container.mozRequestFullScreen();
        } else if (container.msRequestFullscreen) {
          container.msRequestFullscreen();
        } else if (video.webkitEnterFullscreen) {
          // Fallback for iOS Safari on iPhone
          video.webkitEnterFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      }
    };

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener("click", toggleFullscreen);
    }

    // Auto Fullscreen on Mobile Landscape Rotation
    const handleOrientationChange = () => {
      // Only execute on mobile / tablet screens
      const isMobile = window.matchMedia("(max-width: 991px)").matches;
      if (!isMobile) return;

      const isLandscape = screen.orientation ? 
        screen.orientation.type.includes("landscape") : 
        (window.innerWidth > window.innerHeight);

      const isFullscreen = document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement || 
                           document.msFullscreenElement;

      if (isLandscape) {
        if (!isFullscreen) {
          if (container.requestFullscreen) {
            container.requestFullscreen().catch(err => console.log("Orientation fullscreen error:", err));
          } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen().catch(err => console.log("Orientation fullscreen error:", err));
          } else if (video.webkitEnterFullscreen) {
            video.webkitEnterFullscreen();
          }
        }
      } else {
        // Exit fullscreen if we are currently fullscreen
        if (isFullscreen) {
          const isPlayerFullscreen = document.fullscreenElement === container || 
                                     document.webkitFullscreenElement === container ||
                                     document.mozFullScreenElement === container ||
                                     document.msFullscreenElement === container;
          if (isPlayerFullscreen) {
            if (document.exitFullscreen) {
              document.exitFullscreen().catch(err => console.log("Orientation exit fullscreen error:", err));
            } else if (document.webkitExitFullscreen) {
              document.webkitExitFullscreen().catch(err => console.log("Orientation exit fullscreen error:", err));
            }
          }
        }
      }
    };

    if (screen.orientation) {
      screen.orientation.addEventListener("change", handleOrientationChange);
    } else {
      window.addEventListener("resize", handleOrientationChange);
    }


    // Auto-hide controls overlay while video is playing
    const showControlsTemporarily = () => {
      if (controlsOverlay) controlsOverlay.classList.add("visible");
      clearTimeout(controlsTimeout);
      if (!video.paused) {
        controlsTimeout = setTimeout(() => {
          if (controlsOverlay) controlsOverlay.classList.remove("visible");
        }, 2500);
      }
    };

    container.addEventListener("mousemove", showControlsTemporarily);
    container.addEventListener("click", showControlsTemporarily);
    video.addEventListener("play", showControlsTemporarily);
  }

  // --- 8. DYNAMIC PREMIUM MOBILE MENU INJECTION ---
  const topbarRow = document.querySelector(".topbar-row");
  const originalNav = document.querySelector(".nav");
  
  if (topbarRow && originalNav) {
    // 1. Get branding and navigation details dynamically
    const brandImg = topbarRow.querySelector(".brand img");
    const logoSrc = brandImg ? brandImg.getAttribute("src") : "images/Lux Studio icon.png";
    const exploreBtn = topbarRow.querySelector("div:last-child a.btn");
    const exploreHref = exploreBtn ? exploreBtn.getAttribute("href") : "features.html";
    
    // 2. Create the Hamburger Trigger button
    const trigger = document.createElement("button");
    trigger.className = "mobile-menu-trigger";
    trigger.setAttribute("aria-label", "Toggle navigation menu");
    trigger.innerHTML = "<span></span>";
    topbarRow.appendChild(trigger);
    
    // 3. Create the Fullscreen Glassmorphic Overlay Menu
    const overlay = document.createElement("div");
    overlay.className = "mobile-overlay-menu";
    
    overlay.innerHTML = `
      <div class="mobile-menu-header">
        <img class="mobile-menu-logo" src="${logoSrc}" alt="LUX STUDIO Logo">
        <div class="mobile-menu-brand-name">LUX STUDIO</div>
      </div>
      <div class="mobile-menu-links"></div>
      <div class="mobile-menu-footer">
        <a class="btn btn-primary" href="${exploreHref}">Explore Platform</a>
        <div class="mobile-menu-copyright">Developed by Lux Automaton · LUX STUDIO</div>
      </div>
    `;
    
    // 4. Populate overlay links from the existing desktop navigation
    const overlayLinksContainer = overlay.querySelector(".mobile-menu-links");
    const navLinks = originalNav.querySelectorAll("a");
    
    navLinks.forEach((link) => {
      const clone = document.createElement("a");
      clone.className = "mobile-menu-link";
      clone.setAttribute("href", link.getAttribute("href"));
      clone.textContent = link.textContent;
      if (link.classList.contains("active")) {
        clone.classList.add("is-active");
      }
      overlayLinksContainer.appendChild(clone);
    });
    
    // 5. Append overlay to body
    document.body.appendChild(overlay);
    
    // 6. Handle click events for menu toggle
    const toggleMenu = () => {
      const isActive = trigger.classList.toggle("is-active");
      overlay.classList.toggle("is-active", isActive);
      document.body.classList.toggle("mobile-menu-open", isActive);
    };
    
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu();
    });
    
    // Close menu when clicking on any link
    overlay.querySelectorAll(".mobile-menu-link, .mobile-menu-footer a").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (trigger.classList.contains("is-active")) {
          toggleMenu();
        }
      });
    });
  }
});
