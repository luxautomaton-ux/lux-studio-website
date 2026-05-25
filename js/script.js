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

  // --- 2. TACTILE WEB AUDIO API SYNTHESIZER ---
  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.activeSource = null;
      this.analyser = null;
      this.isPlaying = false;
      this.currentTrack = null;
      this.schedulerTimer = null;
      this.step = 0;
      this.bpm = 120;
      
      // Node storage
      this.oscillators = [];
      this.modulators = [];
      this.envelopes = [];
      this.nodesToClean = [];
    }

    trackNode(node, isOsc = false) {
      if (isOsc) {
        this.oscillators.push(node);
      } else {
        this.nodesToClean.push(node);
      }
    }

    cleanNode(node, isOsc = false) {
      try {
        node.disconnect();
      } catch (e) {}
      if (isOsc) {
        const idx = this.oscillators.indexOf(node);
        if (idx !== -1) this.oscillators.splice(idx, 1);
      } else {
        const idx = this.nodesToClean.indexOf(node);
        if (idx !== -1) this.nodesToClean.splice(idx, 1);
      }
    }

    init() {
      if (this.ctx) return;
      // Initialize AudioContext
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      // Create master chain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
      
      // Create analyser node for responsive real-time waveforms
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);
      
      // Compressor to protect hearing
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.setValueAtTime(-2, this.ctx.currentTime);
      limiter.knee.setValueAtTime(12, this.ctx.currentTime);
      limiter.ratio.setValueAtTime(20, this.ctx.currentTime);
      limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
      limiter.release.setValueAtTime(0.08, this.ctx.currentTime);

      this.masterGain.connect(this.analyser);
      this.analyser.connect(limiter);
      limiter.connect(this.ctx.destination);
    }

    async resume() {
      if (this.ctx && this.ctx.state === "suspended") {
        await this.ctx.resume();
      }
    }

    stopAll() {
      this.isPlaying = false;
      if (this.schedulerTimer) {
        clearInterval(this.schedulerTimer);
        this.schedulerTimer = null;
      }
      
      // Stop and disconnect all active nodes
      this.oscillators.forEach(osc => {
        try { osc.stop(); } catch(e) {}
      });
      this.oscillators = [];
      
      this.nodesToClean.forEach(node => {
        try { node.disconnect(); } catch(e) {}
      });
      this.nodesToClean = [];
      this.step = 0;
    }

    play(track, onStepCallback) {
      this.init();
      this.resume();
      this.stopAll();

      this.isPlaying = true;
      this.currentTrack = track;
      this.bpm = track.bpm || 115;
      
      const stepDuration = 60 / this.bpm / 4; // 16th notes
      
      this.schedulerTimer = setInterval(() => {
        if (!this.isPlaying) return;
        this.scheduleStep(stepDuration);
        if (onStepCallback) {
          onStepCallback(this.step);
        }
        this.step = (this.step + 1) % 32; // Loop 32 steps (8 beats)
      }, stepDuration * 1000);
    }

    scheduleStep(stepDuration) {
      const now = this.ctx.currentTime;
      
      // Periodically purge old finished nodes from the audio graph to prevent memory/CPU buildup and static/crackling noise
      if (this.oscillators.length > 24) {
        const finishedOscs = this.oscillators.splice(0, this.oscillators.length - 12);
        finishedOscs.forEach(osc => {
          try { osc.disconnect(); } catch (e) {}
        });
      }
      if (this.nodesToClean.length > 36) {
        const finishedNodes = this.nodesToClean.splice(0, this.nodesToClean.length - 18);
        finishedNodes.forEach(node => {
          try { node.disconnect(); } catch (e) {}
        });
      }

      const beat = Math.floor(this.step / 4);
      const stepInBeat = this.step % 4;

      if (this.currentTrack.id === "retro") {
        // Retro Synth Wave: Kick, Snare, Driving bass, Lead melody
        // Kick on beats 0, 1, 2, 3
        if (stepInBeat === 0) {
          this.synthesizeKick(now);
        }
        // Snare on beats 1, 3
        if (beat === 1 && stepInBeat === 0 || beat === 3 && stepInBeat === 0) {
          this.synthesizeSnare(now);
        }
        // Hihat on offbeats
        if (this.step % 2 === 1) {
          this.synthesizeHihat(now);
        }
        // Synthesize Bass Line (Driving 16th notes)
        const bassNotes = [32.70, 32.70, 38.89, 38.89, 29.14, 29.14, 34.65, 38.89]; // C1, Eb1, Bb0, D1
        const bassFreq = bassNotes[beat % bassNotes.length];
        this.synthesizeBass(bassFreq, now, stepDuration * 0.95);

        // Synth Lead melody
        const melodyPattern = [
          130.81, 0, 164.81, 196.00, 261.63, 0, 196.00, 164.81,
          146.83, 0, 174.61, 220.00, 293.66, 0, 220.00, 174.61,
          130.81, 0, 164.81, 196.00, 261.63, 0, 196.00, 164.81,
          196.00, 220.00, 261.63, 293.66, 329.63, 0, 392.00, 0
        ];
        const leadFreq = melodyPattern[this.step];
        if (leadFreq > 0) {
          this.synthesizeLead(leadFreq, now, stepDuration * 0.8);
        }
      } 
      else if (this.currentTrack.id === "lofi") {
        // Lofi Rhodes: Chords on beat 0, vinyl crackles
        // Soft crackle in background
        if (this.step % 8 === 0) {
          this.synthesizeCrackle(now);
        }
        // Lofi chords on beats 0 & 2
        if (this.step === 0) {
          // Cmaj9 chord (C3, E3, G3, B3, D4)
          [130.81, 164.81, 196.00, 246.94, 293.66].forEach(freq => {
            this.synthesizeRhodes(freq, now, stepDuration * 7.5);
          });
        } else if (this.step === 8) {
          // Am9 chord (A2, C3, E3, G3, B3)
          [110.00, 130.81, 164.81, 196.00, 246.94].forEach(freq => {
            this.synthesizeRhodes(freq, now, stepDuration * 7.5);
          });
        } else if (this.step === 16) {
          // Fmaj9 chord (F2, A3, C3, E3, G3)
          [87.31, 110.00, 130.81, 164.81, 196.00].forEach(freq => {
            this.synthesizeRhodes(freq, now, stepDuration * 7.5);
          });
        } else if (this.step === 24) {
          // G9sus4 chord (G2, C3, D3, F3, A3)
          [98.00, 130.81, 146.83, 174.61, 220.00].forEach(freq => {
            this.synthesizeRhodes(freq, now, stepDuration * 7.5);
          });
        }

        // Soft dust kick and clap
        if (stepInBeat === 0 && (beat === 0 || beat === 2)) {
          this.synthesizeLofiKick(now);
        }
        if (stepInBeat === 0 && (beat === 1 || beat === 3)) {
          this.synthesizeLofiClap(now);
        }
      }
      else if (this.currentTrack.id === "ambient") {
        // Stellar Ambient: Slow evolving pads & synth bells
        if (this.step === 0) {
          // Slow C minor pad (C2, G2, C3, Eb3, G3)
          [65.41, 98.00, 130.81, 155.56, 196.00].forEach(freq => {
            this.synthesizePad(freq, now, stepDuration * 15.5);
          });
        } else if (this.step === 16) {
          // Slow Ab major pad (Ab2, Eb3, Ab3, C4, Eb4)
          [103.83, 155.56, 207.65, 261.63, 311.13].forEach(freq => {
            this.synthesizePad(freq, now, stepDuration * 15.5);
          });
        }

        // Sparkling synth bells
        const bellPattern = [
          0, 0, 523.25, 0, 0, 587.33, 0, 0,
          0, 0, 659.25, 0, 0, 783.99, 0, 0,
          0, 0, 523.25, 0, 0, 587.33, 0, 0,
          0, 0, 880.00, 0, 0, 987.77, 0, 0
        ];
        const bellFreq = bellPattern[this.step];
        if (bellFreq > 0) {
          this.synthesizeBell(bellFreq, now, stepDuration * 2);
        }
      } else if (this.currentTrack.id.startsWith("generated-")) {
        // AI Generated Custom Composition Route
        // Kick on beats 0, 1, 2, 3
        if (stepInBeat === 0) {
          this.synthesizeKick(now);
        }
        // Snare on beats 1, 3
        if ((beat === 1 && stepInBeat === 0) || (beat === 3 && stepInBeat === 0)) {
          this.synthesizeSnare(now);
        }
        // Hihat on offbeats
        if (this.step % 2 === 1) {
          this.synthesizeHihat(now);
        }
        // Symmetrical minor bass progression
        const bassNotes = [32.70, 38.89, 43.65, 48.99]; // C1, Eb1, F1, G1
        const bassFreq = bassNotes[beat % bassNotes.length];
        this.synthesizeBass(bassFreq, now, stepDuration * 0.95);

        // Procedural Melody playing custom generated scales pattern!
        if (this.currentTrack.melodyPattern) {
          const leadFreq = this.currentTrack.melodyPattern[this.step];
          if (leadFreq > 0) {
            this.synthesizeLead(leadFreq * 1.5, now, stepDuration * 0.85);
          }
        }
      }
    }

    // --- INSTRUMENT SYNTHESIS METHODS ---

    synthesizeKick(time) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);

      gain.gain.setValueAtTime(1.0, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.16);

      osc.start(time);
      osc.stop(time + 0.17);

      this.oscillators.push(osc);
      this.nodesToClean.push(gain);
    }

    synthesizeSnare(time) {
      // Noise component
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = 1000;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.14);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      // Tone component
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, time);
      osc.frequency.exponentialRampToValueAtTime(100, time + 0.08);

      oscGain.gain.setValueAtTime(0.5, time);
      oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);

      noise.start(time);
      noise.stop(time + 0.15);
      osc.start(time);
      osc.stop(time + 0.11);

      this.oscillators.push(osc);
      this.nodesToClean.push(noise, noiseGain, noiseFilter, oscGain);
    }

    synthesizeHihat(time) {
      // hihat made of highpass noise
      const bufferSize = this.ctx.sampleRate * 0.04;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 7500;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      source.start(time);
      source.stop(time + 0.04);
      
      this.nodesToClean.push(source, filter, gain);
    }

    synthesizeBass(freq, time, duration) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, time);

      // Lowpass filter for analog warm feel
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(220, time);
      filter.frequency.exponentialRampToValueAtTime(140, time + duration);

      gain.gain.setValueAtTime(0.35, time);
      gain.gain.linearRampToValueAtTime(0.2, time + duration * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + duration);

      this.oscillators.push(osc);
      this.nodesToClean.push(filter, gain);
    }

    synthesizeLead(freq, time, duration) {
      const osc = this.ctx.createOscillator();
      const sub = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const delay = this.ctx.createDelay();
      const delayGain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, time);
      
      sub.type = "triangle";
      sub.frequency.setValueAtTime(freq / 2, time); // sub oscillator

      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.005, time + duration);

      delay.delayTime.setValueAtTime(0.18, time); // Echo delay
      delayGain.gain.setValueAtTime(0.35, time);

      osc.connect(gain);
      sub.connect(gain);
      gain.connect(this.masterGain);

      // Connect delay
      gain.connect(delay);
      delay.connect(delayGain);
      delayGain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + duration);
      sub.start(time);
      sub.stop(time + duration);

      this.oscillators.push(osc, sub);
      this.nodesToClean.push(gain, delay, delayGain);
    }

    synthesizeRhodes(freq, time, duration) {
      // Rhodes chord: warm sine + triangle blend
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(freq + 1, time); // slight detune

      gain.gain.setValueAtTime(0.24, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + duration);
      osc2.start(time);
      osc2.stop(time + duration);

      this.oscillators.push(osc, osc2);
      this.nodesToClean.push(gain);
    }

    synthesizeLofiKick(time) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.frequency.setValueAtTime(80, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.18);

      gain.gain.setValueAtTime(0.65, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.19);

      osc.start(time);
      osc.stop(time + 0.2);

      this.oscillators.push(osc);
      this.nodesToClean.push(gain);
    }

    synthesizeLofiClap(time) {
      // Dust clap hihat combo
      const bufferSize = this.ctx.sampleRate * 0.1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.35;
      }
      
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1200;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.14, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      source.start(time);
      source.stop(time + 0.1);
      
      this.nodesToClean.push(source, filter, gain);
    }

    synthesizeCrackle(time) {
      // Low fidelity vinyl crackle
      const bufferSize = this.ctx.sampleRate * 0.3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Spark bursts
        data[i] = Math.random() < 0.001 ? (Math.random() * 2 - 1) * 0.2 : 0;
      }
      
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 2000;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.29);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      source.start(time);
      source.stop(time + 0.3);
      
      this.nodesToClean.push(source, filter, gain);
    }

    synthesizePad(freq, time, duration) {
      // Ambient warm strings pad
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, time);

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(freq * 1.5, time); // perfect fifth

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(250, time);
      filter.frequency.exponentialRampToValueAtTime(380, time + duration * 0.5);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.24, time + duration * 0.2); // long attack
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + duration);
      osc2.start(time);
      osc2.stop(time + duration);

      this.oscillators.push(osc, osc2);
      this.nodesToClean.push(filter, gain);
    }

    synthesizeBell(freq, time, duration) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const delay = this.ctx.createDelay();
      const delayGain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      delay.delayTime.setValueAtTime(0.22, time);
      delayGain.gain.setValueAtTime(0.4, time);

      osc.connect(gain);
      gain.connect(this.masterGain);

      gain.connect(delay);
      delay.connect(delayGain);
      delayGain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + duration);

      this.oscillators.push(osc);
      this.nodesToClean.push(gain, delay, delayGain);
    }
  }

  // Define local mock tracks with detailed data & lyrics
  const trackDatabase = [
    {
      id: "retro",
      title: "Cybernetic Horizon",
      genre: "Retro Synth Wave",
      bpm: 120,
      lyrics: [
        "Initializing core matrix...",
        "Neon pulses through the wire...",
        "We are the ghost in the machine...",
        "Ascending into digital fire...",
        "Reconstructed frequencies lock...",
        "The rhythm takes absolute control...",
        "Oscillating through the virtual block...",
        "A synthetic masterpiece within the soul..."
      ]
    },
    {
      id: "lofi",
      title: "Rainy Studio Chords",
      genre: "Warm Lofi Rhodes",
      bpm: 90,
      lyrics: [
        "Rain splatters on the single pane...",
        "Warm vintage Rhodes takes away the pain...",
        "Dust and crackle spinning round...",
        "A lofi haven in this quiet town...",
        "Sipping coffee as the step moves slow...",
        "Subtle basslines drifting below...",
        "Slowing down the chaotic speed...",
        "Local intelligence is all we need..."
      ]
    },
    {
      id: "ambient",
      title: "Stellar Drift",
      genre: "Ambient Pad Voyage",
      bpm: 110,
      lyrics: [
        "Floating into deep space...",
        "Zero gravity, endless grace...",
        "Stars shimmer in cosmic pads...",
        "Bells echoing the dreams we had...",
        "Stellar drift, quiet breeze...",
        "Oscillators at perfect ease...",
        "Timeless harmony, infinite light...",
        "Vaporizing in the celestial night..."
      ]
    }
  ];

  // Initialize AudioEngine
  const engine = new AudioEngine();

  // --- 3. DOM SELECTION ---
  const promptInput = document.getElementById("prompt-input");
  const generateBtn = document.getElementById("generate-btn");
  const progressionContainer = document.getElementById("progression-container");
  const progressionPercent = document.getElementById("progression-percent");
  const progressionFill = document.getElementById("progression-fill");
  const progressionStatus = document.getElementById("progression-status");
  const trackCards = document.querySelectorAll(".track-card");
  
  // Player bar selectors
  const playerBar = document.getElementById("player-bar");
  const playerDisk = document.getElementById("player-disk");
  const playerTitle = document.getElementById("player-title");
  const playerGenre = document.getElementById("player-genre");
  const playerPlayBtn = document.getElementById("player-play-btn");
  const playerPlayIcon = document.getElementById("player-play-icon");
  const playerPauseIcon = document.getElementById("player-pause-icon");
  const playerCurrentTime = document.getElementById("player-current-time");
  const playerProgressFill = document.getElementById("player-progress-fill");
  const playerProgressBar = document.getElementById("player-progress-bar");
  
  // Lyrics selectors
  const lyricsTitle = document.getElementById("lyrics-title");
  const lyricsScroller = document.getElementById("lyrics-scroller");

  let playingTrack = null;
  let simulatedSeconds = 0;
  let playerInterval = null;

  // --- 4. INTERACTIVE PLAYGROUND ACTIONS ---
  
  // Dynamic Song Generation Engine
  if (generateBtn) {
    generateBtn.addEventListener("click", () => {
      const promptText = promptInput ? promptInput.value.trim() : "";
      if (!promptText) return;

      // Start progression
      generateBtn.disabled = true;
      if (progressionContainer) progressionContainer.style.display = "block";
      
      const steps = [
        "Analyzing lyrics cadence...",
        "Designing local synthesizer profiles...",
        "Injecting ACE-step ADG guidance parameters...",
        "Correcting transients and harmonic bounds...",
        "Rendering master release track output..."
      ];

      let progress = 0;
      const interval = setInterval(() => {
        progress += 2;
        if (progressionPercent) progressionPercent.textContent = `${progress}%`;
        if (progressionFill) progressionFill.style.width = `${progress}%`;
        
        // Dynamic status updates
        const statusIdx = Math.min(Math.floor(progress / 20), steps.length - 1);
        if (progressionStatus) progressionStatus.textContent = steps[statusIdx];

        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            if (progressionContainer) progressionContainer.style.display = "none";
            generateBtn.disabled = false;
            if (promptInput) promptInput.value = "";
            
            // Generate customized song details
            const cleanTitle = promptText.length > 24 ? promptText.substring(0, 21) + "..." : promptText;
            const trackId = "generated-" + Date.now();
            const genre = promptText.toLowerCase().includes("ambient") ? "AI Ambient Space" : promptText.toLowerCase().includes("lofi") ? "AI Chill Lofi" : "AI Retro Synthwave";
            
            const newTrack = {
              id: trackId,
              title: cleanTitle,
              genre: genre,
              bpm: promptText.toLowerCase().includes("lofi") ? 92 : promptText.toLowerCase().includes("ambient") ? 105 : 122,
              lyrics: [
                `Prompt: "${promptText}"`,
                "Neural synthesis sequence locked...",
                "Decoding melodic pitch bounds...",
                "Assembling dynamic baseline path...",
                "Running transient compression filters...",
                "Spatial stereo imaging: 100% active...",
                "Synthesized waveform loop: perfect.",
                "Hit play and watch the spectrum glow!"
              ]
            };

            // Custom scale sequence generation
            const scales = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00];
            newTrack.melodyPattern = Array.from({length: 32}, () => Math.random() < 0.7 ? scales[Math.floor(Math.random() * scales.length)] : 0);

            // Save to database
            trackDatabase.push(newTrack);

            // Create and append dynamic track card
            const tracksGrid = document.querySelector(".tracks-grid");
            if (tracksGrid) {
              const newCard = document.createElement("div");
              newCard.className = "track-card";
              newCard.setAttribute("data-track", trackId);
              newCard.innerHTML = `
                <div class="record-art-container">
                  <div class="record-vinyl">
                    <div class="record-center">
                      <div class="record-hole"></div>
                    </div>
                    <div class="track-play-overlay">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                </div>
                <div class="track-details">
                  <h5 class="track-title">${newTrack.title}</h5>
                  <span class="track-genre">${newTrack.genre}</span>
                </div>
              `;
              
              // Attach click event to the new card
              newCard.addEventListener("click", () => {
                document.querySelectorAll(".track-card").forEach(c => {
                  c.classList.remove("active");
                  const v = c.querySelector(".record-vinyl");
                  if (v) v.classList.remove("spinning");
                });
                newCard.classList.add("active");
                
                if (playingTrack && playingTrack.id === newTrack.id && engine.isPlaying) {
                  pauseTrack();
                } else {
                  playTrack(newTrack, newCard);
                }
              });

              tracksGrid.appendChild(newCard);
              newCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
              
              // Dynamic click trigger to auto-play!
              setTimeout(() => {
                newCard.click();
              }, 400);
            }
          }, 600);
        }
      }, 60);
    });
  }

  // Track Card clicks
  trackCards.forEach(card => {
    card.addEventListener("click", () => {
      const trackId = card.getAttribute("data-track");
      const trackData = trackDatabase.find(t => t.id === trackId);
      if (!trackData) return;

      // Remove active states from other cards dynamically
      document.querySelectorAll(".track-card").forEach(c => {
        c.classList.remove("active");
        const v = c.querySelector(".record-vinyl");
        if (v) v.classList.remove("spinning");
      });

      // Add active state to selected card
      card.classList.add("active");

      // Handle play/pause toggles
      if (playingTrack && playingTrack.id === trackData.id && engine.isPlaying) {
        // Pause
        pauseTrack();
      } else {
        // Play
        playTrack(trackData, card);
      }
    });
  });

  // Player Bar Play/Pause click
  if (playerPlayBtn) {
    playerPlayBtn.addEventListener("click", () => {
      if (!playingTrack) {
        // Default to first track
        const firstCard = trackCards[0];
        if (firstCard) firstCard.click();
      } else {
        if (engine.isPlaying) {
          pauseTrack();
        } else {
          // Find matching card
          const card = document.querySelector(`.track-card[data-track="${playingTrack.id}"]`);
          playTrack(playingTrack, card);
        }
      }
    });
  }

  function playTrack(track, card) {
    playingTrack = track;
    engine.play(track, (step) => {
      // Sync timeline & lyrics
      updateStepTimeline(step, track);
    });

    // Update bottom player
    if (playerBar) playerBar.classList.add("visible");
    if (playerDisk) playerDisk.classList.add("spinning");
    if (playerTitle) playerTitle.textContent = track.title;
    if (playerGenre) playerGenre.textContent = track.genre;

    // Toggle icons
    if (playerPlayIcon) playerPlayIcon.style.display = "none";
    if (playerPauseIcon) playerPauseIcon.style.display = "block";

    // Spin vinyl in the card
    if (card) {
      const v = card.querySelector(".record-vinyl");
      if (v) v.classList.add("spinning");
    }

    // Load lyrics into scroller
    mountLyrics(track);

    // Track simulated timer
    if (playerInterval) clearInterval(playerInterval);
    simulatedSeconds = 0;
    playerInterval = setInterval(() => {
      if (!engine.isPlaying) return;
      simulatedSeconds += 1;
      updatePlayerSeconds(simulatedSeconds);
    }, 1000);
  }

  function pauseTrack() {
    engine.stopAll();
    if (playerDisk) playerDisk.classList.remove("spinning");
    if (playerPlayIcon) playerPlayIcon.style.display = "block";
    if (playerPauseIcon) playerPauseIcon.style.display = "none";
    
    // Stop spin on card
    if (playingTrack) {
      const card = document.querySelector(`.track-card[data-track="${playingTrack.id}"]`);
      if (card) {
        const v = card.querySelector(".record-vinyl");
        if (v) v.classList.remove("spinning");
      }
    }

    if (playerInterval) clearInterval(playerInterval);
  }

  function mountLyrics(track) {
    if (!lyricsScroller) return;
    lyricsScroller.innerHTML = "";
    if (lyricsTitle) lyricsTitle.textContent = `Lyrics: ${track.title}`;

    track.lyrics.forEach((line, idx) => {
      const p = document.createElement("p");
      p.className = "lyrics-line";
      p.id = `lyric-line-${idx}`;
      p.textContent = line;
      lyricsScroller.appendChild(p);
    });
  }

  function updateStepTimeline(step, track) {
    // There are 32 steps (loop), 8 lines of lyrics (4 steps per line)
    const lineIndex = Math.floor(step / 4) % track.lyrics.length;
    
    // Highlight active lyric line
    const activeLines = document.querySelectorAll(".lyrics-line");
    activeLines.forEach(l => l.classList.remove("active"));
    
    const activeLineElement = document.getElementById(`lyric-line-${lineIndex}`);
    if (activeLineElement) {
      activeLineElement.classList.add("active");
      
      // Scroll only the lyrics-scroller container to keep the overall browser window stationary
      if (lyricsScroller) {
        const containerHeight = lyricsScroller.clientHeight;
        const lineOffsetTop = activeLineElement.offsetTop;
        const lineOffsetHeight = activeLineElement.clientHeight;
        
        lyricsScroller.scrollTo({
          top: lineOffsetTop - (containerHeight / 2) + (lineOffsetHeight / 2),
          behavior: "smooth"
        });
      }
    }

    // Sync visual sound bars on bottom player
    const fillPercent = (step / 31) * 100;
    if (playerProgressFill) {
      playerProgressFill.style.width = `${fillPercent}%`;
    }
  }

  function updatePlayerSeconds(secs) {
    const min = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    const formattedTime = `${min}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
    if (playerCurrentTime) {
      playerCurrentTime.textContent = formattedTime;
    }
  }

  // Interactive progress bar seek (pure visual)
  if (playerProgressBar) {
    playerProgressBar.addEventListener("click", (e) => {
      const rect = playerProgressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const pct = (clickX / width) * 100;
      if (playerProgressFill) {
        playerProgressFill.style.width = `${pct}%`;
      }
    });
  }

  // --- 5. REAL-TIME WAVEFORM SPECTRUM VISUALIZER INJECTOR ---
  const playerMainRow = document.querySelector(".player-main-row");
  if (playerMainRow) {
    // Create visualizer container & canvas if not already present
    if (!document.getElementById("visualizer-canvas")) {
      const container = document.createElement("div");
      container.className = "player-visualizer-container";
      
      const canvas = document.createElement("canvas");
      canvas.id = "visualizer-canvas";
      canvas.className = "visualizer-canvas";
      
      container.appendChild(canvas);
      
      // Insert visualizer container right after the player-song-info details
      const songInfo = playerMainRow.querySelector(".player-song-info");
      if (songInfo) {
        songInfo.parentNode.insertBefore(container, songInfo.nextSibling);
      } else {
        playerMainRow.prepend(container);
      }
    }
  }

  // Visualizer drawing loop
  const visualizerCanvas = document.getElementById("visualizer-canvas");
  let canvasCtx = null;
  if (visualizerCanvas) {
    canvasCtx = visualizerCanvas.getContext("2d");
    
    // Explicit sizing for canvas drawing resolution
    const resizeCanvas = () => {
      visualizerCanvas.width = visualizerCanvas.clientWidth * window.devicePixelRatio;
      visualizerCanvas.height = visualizerCanvas.clientHeight * window.devicePixelRatio;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
  }

  function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    if (!canvasCtx || !visualizerCanvas) return;

    const width = visualizerCanvas.width;
    const height = visualizerCanvas.height;

    // Clear canvas frame
    canvasCtx.clearRect(0, 0, width, height);

    if (engine.analyser && engine.isPlaying) {
      engine.analyser.getByteFrequencyData(engine.dataArray);
      
      const barWidth = (width / engine.bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < engine.bufferLength; i++) {
        barHeight = (engine.dataArray[i] / 255) * height * 0.82;

        // Symmetric gold-red HSL gradients matching the brand theme
        const hue = 12 + (i / engine.bufferLength) * 22; // Red to Gold
        canvasCtx.fillStyle = `hsla(${hue}, 100%, 55%, 0.85)`;
        canvasCtx.shadowBlur = 10;
        canvasCtx.shadowColor = `hsla(${hue}, 100%, 50%, 0.4)`;

        const yPos = (height - barHeight) / 2;
        canvasCtx.beginPath();
        canvasCtx.roundRect(x, yPos, barWidth - 2.5, barHeight, 3);
        canvasCtx.fill();

        x += barWidth;
      }
    } else {
      // Sleek idle heartbeat wave animation
      canvasCtx.fillStyle = "rgba(255, 46, 0, 0.18)";
      const barWidth = width / 16;
      for (let i = 0; i < 16; i++) {
        const barHeight = 4 + Math.sin(Date.now() * 0.0025 + i * 0.8) * 3;
        canvasCtx.beginPath();
        canvasCtx.roundRect(i * barWidth, (height - barHeight) / 2, barWidth - 3, barHeight, 2.5);
        canvasCtx.fill();
      }
    }
  }

  // Trigger draw frame recursion
  if (visualizerCanvas) {
    drawVisualizer();
  }
});
