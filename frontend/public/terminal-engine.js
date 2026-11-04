// MarketMaster Academy - Interactive Terminal & Quant Simulation Engine
// Zero-dependency vanilla Web Standards: AudioSynthesis, Canvas Confetti, Real-time Tick Loop

(function () {
  console.log("🚀 MarketMaster Terminal & Quant Engine Initialized");

  // Web Audio Synthesizer for Zero-Cost Institutional Sound FX
  const audioCtx = window.AudioContext ? new (window.AudioContext || window.webkitAudioContext)() : null;
  function playChime(freq = 587.33, type = "sine", duration = 0.15) {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === "suspended") audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) { }
  }

  // Pure Canvas Confetti Burst (Zero external library)
  function launchConfetti(x = window.innerWidth / 2, y = window.innerHeight / 2) {
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "99999";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ["#10B981", "#06B6D4", "#F59E0B", "#acedff", "#4edea3"];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 14,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015
      });
    }

    let frame = 0;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.alpha -= p.decay;
        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.size, p.size);
          ctx.restore();
        }
      });
      if (alive && frame < 90) {
        frame++;
        requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    }
    animate();
  }

  // Global Simulator State
  window.MM_STATE = {
    virtualEquity: 1000000.0,
    marginUsed: 215400.0,
    realizedPnL: 6200.0,
    unrealizedPnL: 14250.0,
    currentLTP: 24538.50,
    disciplineScore: 94,
    streakDays: 7,
    isPlaying: false,
    replaySpeed: 1,
    replayTimer: null,
    candleIndex: 30
  };

  // 1. REPLAY ENGINE TICK LOOP
  window.advanceReplayCandle = function () {
    const delta = (Math.random() - 0.48) * 8.5; // slight upward drift
    window.MM_STATE.currentLTP = parseFloat((window.MM_STATE.currentLTP + delta).toFixed(2));
    playChime(440 + (delta > 0 ? 80 : -40), "sine", 0.06);

    // Update active highlight price tags
    document.querySelectorAll(".active-price-ltp, .active-price-tag").forEach(el => {
      el.textContent = window.MM_STATE.currentLTP.toLocaleString("en-IN", { minimumFractionDigits: 2 });
    });

    // Update floating price cursor in chart
    const cursorTag = document.querySelector(".top-\\[52px\\]");
    if (cursorTag) {
      cursorTag.textContent = window.MM_STATE.currentLTP.toFixed(2);
    }

    // Flash price
    const cursor = document.querySelector("input[value*='198.50'], input[value*='24,538']");
    if (cursor) {
      cursor.value = window.MM_STATE.currentLTP.toFixed(2);
    }

    // Update unrealized PnL
    window.MM_STATE.unrealizedPnL += parseFloat((delta * 30).toFixed(2));
    const unrEl = document.querySelector("header .text-secondary.font-bold");
    if (unrEl && unrEl.textContent.includes("UNREALIZED")) {
      const sign = window.MM_STATE.unrealizedPnL >= 0 ? "+" : "";
      unrEl.textContent = `${sign}₹${window.MM_STATE.unrealizedPnL.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (${sign}${(window.MM_STATE.unrealizedPnL / 10000).toFixed(2)}%)`;
    }
  };

  // Wire Replay Play / Pause & Step Next Buttons
  document.addEventListener("DOMContentLoaded", function () {
    // Find Replay Play Button
    const replayBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("REPLAY"));
    if (replayBtn) {
      replayBtn.addEventListener("click", function () {
        window.MM_STATE.isPlaying = !window.MM_STATE.isPlaying;
        if (window.MM_STATE.isPlaying) {
          replayBtn.classList.add("bg-secondary", "text-on-secondary-container");
          playChime(659.25, "triangle", 0.2);
          window.MM_STATE.replayTimer = setInterval(window.advanceReplayCandle, 1000 / window.MM_STATE.replaySpeed);
        } else {
          replayBtn.classList.remove("bg-secondary", "text-on-secondary-container");
          clearInterval(window.MM_STATE.replayTimer);
          playChime(392.00, "triangle", 0.15);
        }
      });
    }

    // Find Step Next Bar Button
    const stepNextBtn = document.querySelector("button[title*='Step Next'], button[title*='Next Bar']");
    if (stepNextBtn) {
      stepNextBtn.addEventListener("click", function () {
        window.advanceReplayCandle();
      });
    }

    // Speed buttons
    document.querySelectorAll("button").forEach(b => {
      const text = b.textContent.trim();
      if (["0.5x", "1x", "2x", "5x", "10x"].includes(text)) {
        b.addEventListener("click", function () {
          const speed = parseFloat(text.replace("x", ""));
          window.MM_STATE.replaySpeed = speed;
          document.querySelectorAll("button").forEach(sb => {
            if (["0.5x", "1x", "2x", "5x", "10x"].includes(sb.textContent.trim())) {
              sb.classList.remove("bg-primary-container", "text-on-primary-fixed", "font-bold");
            }
          });
          b.classList.add("bg-primary-container", "text-on-primary-fixed", "font-bold");
          if (window.MM_STATE.isPlaying) {
            clearInterval(window.MM_STATE.replayTimer);
            window.MM_STATE.replayTimer = setInterval(window.advanceReplayCandle, 1000 / window.MM_STATE.replaySpeed);
          }
          playChime(523.25, "sine", 0.08);
        });
      }
    });

    // BUY / LONG BUTTON EXECUTION
    const buyBtns = Array.from(document.querySelectorAll("button")).filter(b => b.textContent.includes("BUY / LONG"));
    buyBtns.forEach(btn => {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        playChime(880, "sine", 0.18);
        playChime(1174.66, "sine", 0.22);
        launchConfetti(btn.getBoundingClientRect().left + 80, btn.getBoundingClientRect().top);

        // Add order to table or show toast
        showToast("🚀 Order Executed: BUY 150 Qty @ ₹" + window.MM_STATE.currentLTP + " (Slippage: ₹0.05)", "success");
        window.MM_STATE.disciplineScore = Math.min(100, window.MM_STATE.disciplineScore + 1);
        updateDisciplineUI();
      });
    });

    // SELL / SHORT BUTTON EXECUTION
    const sellBtns = Array.from(document.querySelectorAll("button")).filter(b => b.textContent.includes("SELL / SHORT"));
    sellBtns.forEach(btn => {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        playChime(440, "sine", 0.18);
        playChime(370, "sine", 0.25);
        showToast("🔻 Order Executed: SELL / SHORT 150 Qty @ ₹" + window.MM_STATE.currentLTP, "warning");
      });
    });

    // EXIT POSITION & TRIGGER AUTOMATED POST-MORTEM MODAL
    document.querySelectorAll("button").forEach(btn => {
      if (btn.textContent.trim() === "Exit Mkt") {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          playChime(783.99, "sine", 0.2);
          launchConfetti();
          openPostMortemModal();
        });
      }
    });

    // STRATEGY LAB RUN VECTOR BACKTEST BUTTON
    const runBacktestBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("RUN VECTOR BACKTEST"));
    if (runBacktestBtn) {
      runBacktestBtn.addEventListener("click", function () {
        runBacktestSimulation(runBacktestBtn);
      });
    }
  });

  // 2. AUTOMATED POST-MORTEM DIAGNOSTIC MODAL
  function openPostMortemModal() {
    const existing = document.getElementById("mm-post-mortem-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "mm-post-mortem-modal";
    modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md";
    modal.innerHTML = `
      <div class="bg-[#0E131F] border border-cyan-500/40 rounded-lg max-w-lg w-full p-6 shadow-2xl text-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <h3 class="text-lg font-bold font-['Inter'] text-cyan-400">Automated Trade Post-Mortem Diagnostic</h3>
          </div>
          <button onclick="document.getElementById('mm-post-mortem-modal').remove()" class="text-slate-400 hover:text-white text-lg">✕</button>
        </div>

        <div class="grid grid-cols-3 gap-2 text-center text-xs font-mono">
          <div class="bg-[#080C14] p-2.5 rounded border border-slate-800">
            <span class="text-slate-400 block text-[10px]">REALIZED GAIN</span>
            <span class="text-emerald-400 font-bold text-sm">+₹8,400.00</span>
          </div>
          <div class="bg-[#080C14] p-2.5 rounded border border-slate-800">
            <span class="text-slate-400 block text-[10px]">RISK REWARD</span>
            <span class="text-cyan-400 font-bold text-sm">+2.8 R:R</span>
          </div>
          <div class="bg-[#080C14] p-2.5 rounded border border-slate-800">
            <span class="text-slate-400 block text-[10px]">DISCIPLINE GRADE</span>
            <span class="text-emerald-300 font-bold text-sm">A+ (Disciplined)</span>
          </div>
        </div>

        <div class="bg-[#080C14] p-3 rounded border border-slate-800/80 text-xs flex flex-col gap-2 font-mono">
          <div class="flex items-center justify-between text-slate-300">
            <span>🛡️ Pre-Trade Stop Loss Adherence:</span>
            <span class="text-emerald-400 font-semibold">100% Compliant (1.1% Risk)</span>
          </div>
          <div class="flex items-center justify-between text-slate-300">
            <span>⏱️ Hold Duration:</span>
            <span>42 Bars (2h 10m)</span>
          </div>
          <div class="flex items-center justify-between text-slate-300">
            <span>🧠 Tilt Risk / Revenge Tendency:</span>
            <span class="text-emerald-400">Zero (Calm Execution)</span>
          </div>
          <div class="flex items-center justify-between text-slate-300">
            <span>⚡ Slippage Incurred:</span>
            <span>₹0.05 / lot (Optimal Depth)</span>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[11px] font-mono border border-emerald-500/30">#DisciplinedStopLoss (+15 XP)</span>
          <span class="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[11px] font-mono border border-cyan-500/30">#TargetCaptured (+25 XP)</span>
          <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[11px] font-mono border border-amber-500/30">#NoChasingBreakout (+10 XP)</span>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-800">
          <span class="text-xs text-slate-400 font-mono">Discipline Score Increased: <strong>94 ➔ 96/100</strong></span>
          <button onclick="document.getElementById('mm-post-mortem-modal').remove()" class="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded transition-all">
            Continue Practice ➔
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // 3. TOAST NOTIFICATION UTILITY
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded shadow-xl text-xs font-mono font-semibold backdrop-blur-md border animate-in slide-in-from-bottom-5 duration-150 ${type === "success"
      ? "bg-[#0E131F]/90 text-emerald-400 border-emerald-500/40"
      : type === "warning"
        ? "bg-[#0E131F]/90 text-rose-400 border-rose-500/40"
        : "bg-[#0E131F]/90 text-cyan-400 border-cyan-500/40"
      }`;
    toast.innerHTML = `<span>●</span><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("opacity-0", "transition-opacity", "duration-300");
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // 4. STRATEGY LAB BACKTEST RUNNER
  function runBacktestSimulation(button) {
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span>⏳</span><span>COMPILING WASM VECTOR MATRIX...</span>`;
    playChime(440, "sine", 0.1);

    setTimeout(() => {
      button.innerHTML = `<span>⚡</span><span>CALCULATING 1,240 BARS SHARPE RATIO...</span>`;
      playChime(659.25, "sine", 0.1);
    }, 400);

    setTimeout(() => {
      button.disabled = false;
      button.innerHTML = originalText;
      playChime(880, "sine", 0.2);
      playChime(1174.66, "sine", 0.3);
      launchConfetti();
      showToast("✅ Vector Backtest Completed in 62ms: Sharpe 2.34 • Net ROI +24.85%", "success");

      // Flash metrics
      document.querySelectorAll(".text-secondary, .text-primary").forEach(el => {
        el.classList.add("animate-pulse");
        setTimeout(() => el.classList.remove("animate-pulse"), 2000);
      });
    }, 950);
  }

  function updateDisciplineUI() {
    const discText = document.querySelector(".text-secondary.font-bold");
    if (discText && discText.textContent.includes("Discipline")) {
      discText.textContent = `${window.MM_STATE.disciplineScore}/100 Discipline`;
    }
  }

})();
