// 水滴点击音效 - Web Audio API 合成，无需外部文件
(function () {
  let ctx = null;
  let lastPlay = 0;
  const DEBOUNCE_MS = 60;

  // 静音状态，持久化
  let muted = localStorage.getItem('sound_muted') === '1';

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function playDrop() {
    if (muted) return;
    const now = Date.now();
    if (now - lastPlay < DEBOUNCE_MS) return;
    lastPlay = now;

    try {
      const ac = getCtx();
      if (ac.state === 'suspended') ac.resume();

      const t = ac.currentTime;

      // 主振荡器（基频）
      const osc1 = ac.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, t);
      osc1.frequency.exponentialRampToValueAtTime(440, t + 0.08);

      // 二次谐波振荡器（2倍频，音量较低）
      const osc2 = ac.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1760, t);
      osc2.frequency.exponentialRampToValueAtTime(880, t + 0.08);

      const gain1 = ac.createGain();
      gain1.gain.setValueAtTime(0.16, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

      const gain2 = ac.createGain();
      gain2.gain.setValueAtTime(0.07, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.10);

      const filter = ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 900;
      filter.Q.value = 1.8;

      const master = ac.createGain();
      master.gain.value = 1.0;

      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(filter);
      gain2.connect(filter);
      filter.connect(master);
      master.connect(ac.destination);

      osc1.start(t); osc1.stop(t + 0.16);
      osc2.start(t); osc2.stop(t + 0.13);
    } catch (e) {
      // 静默失败
    }
  }

  // ── 静音开关按钮 ───────────────────────────────────────────────
  function createMuteBtn() {
    const btn = document.createElement('button');
    btn.id = 'soundMuteBtn';
    btn.title = muted ? '开启音效' : '关闭音效';
    btn.textContent = muted ? '🔇' : '🔊';
    btn.setAttribute('style',
      'position:fixed !important;' +
      'bottom:7.5rem !important;' +
      'right:1.2rem !important;' +
      'z-index:9999 !important;' +
      'width:2.6rem !important;' +
      'height:2.6rem !important;' +
      'border-radius:50% !important;' +
      'border:1px solid #444 !important;' +
      'background:#222 !important;' +
      'color:#ccc !important;' +
      'font-size:1.1rem !important;' +
      'cursor:pointer !important;' +
      'display:flex !important;' +
      'align-items:center !important;' +
      'justify-content:center !important;' +
      'opacity:0.8 !important;' +
      'transition:opacity 0.2s !important;' +
      'padding:0 !important;' +
      'line-height:1 !important;' +
      'box-shadow:0 2px 8px rgba(0,0,0,0.4) !important;'
    );
    btn.addEventListener('mouseenter', () => btn.style.setProperty('opacity', '1', 'important'));
    btn.addEventListener('mouseleave', () => btn.style.setProperty('opacity', '0.8', 'important'));
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      muted = !muted;
      localStorage.setItem('sound_muted', muted ? '1' : '0');
      btn.textContent = muted ? '🔇' : '🔊';
      btn.title = muted ? '开启音效' : '关闭音效';
      if (!muted) playDrop();
    });
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createMuteBtn);
  } else {
    createMuteBtn();
  }

  // ── 事件委托 ───────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    // 静音按钮自己已处理，跳过
    if (e.target.closest('#soundMuteBtn')) return;

    const target = e.target.closest('button, a[href], [role="button"]');
    if (!target) return;

    if (
      target.tagName === 'A' &&
      target.href &&
      !target.target &&
      target.getAttribute('href') !== '#' &&
      !target.getAttribute('href').startsWith('javascript:') &&
      !target.getAttribute('href').startsWith('mailto:') &&
      !e.ctrlKey && !e.metaKey && !e.shiftKey
    ) {
      e.preventDefault();
      playDrop();
      const url = target.href;
      setTimeout(function () { location.href = url; }, 140);
    } else {
      playDrop();
    }
  }, true);
})();
