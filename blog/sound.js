// 水滴点击音效 - Web Audio API 合成，无需外部文件
(function () {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function playDrop() {
    try {
      const ac = getCtx();
      if (ac.state === 'suspended') ac.resume();

      const now = ac.currentTime;

      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const filter = ac.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);

      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 2;

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      // 静默失败，不影响页面功能
    }
  }

  // 事件委托：所有按钮和链接均触发音效
  document.addEventListener('click', function (e) {
    const target = e.target.closest('button, a[href], [role="button"]');
    if (!target) return;

    // 对会跳转当前页的链接：先播音效再导航
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
