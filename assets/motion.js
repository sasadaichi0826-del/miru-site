// 星麦みる 公式サイト：動きの層（P2-3）
// - 出現演出は GSAP ScrollTrigger に一本化（app.js から呼ばれる）
// - セクション見出しの星座ラインをスクロール連動で描く（stroke-dashoffset）
// - canvas 粒子：ヒーローの星屑と音楽室の泡だけ。最大60個、モバイルと reduced-motion では無効、画面外では停止
// アニメーションは transform / opacity（と SVG の stroke-dashoffset）のみ。
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 768px)').matches;
  const gsap = window.gsap, ST = window.ScrollTrigger;
  if (!gsap || !ST) return; // 予備の出現処理は app.js 側にある
  gsap.registerPlugin(ST);

  window.miruMotion = (secs, reveal) => {
    if (reduced) { secs.forEach(reveal); return; }
    secs.forEach(sec => {
      // 出現：セクション上端が画面の88%に来たら（飛ばして通過した場合も onEnter が呼ばれる）
      ST.create({ trigger: sec, start: 'top 88%', once: true, onEnter: () => reveal(sec) });
      // 星座ライン：スクロールに合わせて描く
      const path = sec.querySelector('.const path');
      if (path) {
        const len = Math.ceil(path.getTotalLength());
        gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, {
          strokeDashoffset: 0, ease: 'none',
          scrollTrigger: { trigger: sec, start: 'top 92%', end: 'top 35%', scrub: .6 }
        });
      }
    });
    // ページ途中から開いたとき（#profile/tsukimi など）に、上のセクションも表示しておく
    requestAnimationFrame(() => secs.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * .88) reveal(s); }));
    // 画像の読み込みで高さが変わるので、読み込み完了後に位置を計算し直す
    addEventListener('load', () => ST.refresh(), { once: true });
  };

  // ---- canvas 粒子 ----
  if (reduced || mobile) return;
  const particles = (host, kind) => {
    if (!host) return;
    const cv = document.createElement('canvas');
    cv.className = `particles particles-${kind}`;
    cv.setAttribute('aria-hidden', 'true');
    host.prepend(cv);
    const ctx = cv.getContext('2d');
    const N = kind === 'stars' ? 34 : 26; // 2つ合わせて60個
    let w = 0, h = 0, dpr = Math.min(devicePixelRatio || 1, 2), raf = 0, on = false;
    const ps = [];
    const resize = () => { w = host.clientWidth; h = host.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const spawn = p => Object.assign(p || {}, kind === 'stars'
      ? { x: Math.random() * w, y: Math.random() * h, r: .6 + Math.random() * 1.6, t: Math.random() * 6.28, s: .01 + Math.random() * .03, vy: -.05 - Math.random() * .1 }
      : { x: Math.random() * w, y: h + Math.random() * h * .5, r: 2 + Math.random() * 7, t: Math.random() * 6.28, s: .02, vy: -.25 - Math.random() * .6 });
    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.t += p.s; p.y += p.vy;
        if (kind === 'stars') {
          if (p.y < -4) { spawn(p); p.y = h + 4; }
          const a = .35 + .65 * Math.abs(Math.sin(p.t));
          ctx.fillStyle = `rgba(255,236,250,${a})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        } else {
          p.x += Math.sin(p.t) * .4;
          if (p.y < -p.r * 2) spawn(p);
          ctx.strokeStyle = 'rgba(255,217,230,.55)'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.5)';
          ctx.beginPath(); ctx.arc(p.x - p.r * .35, p.y - p.r * .35, p.r * .22, 0, 6.283); ctx.fill();
        }
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (on || document.hidden) return; on = true; raf = requestAnimationFrame(frame); };
    const stop = () => { on = false; cancelAnimationFrame(raf); };
    resize();
    for (let i = 0; i < N; i++) ps.push(spawn());
    addEventListener('resize', resize, { passive: true });
    // 画面外・タブが裏のときは止める
    new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? start() : stop()))).observe(host);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : (host.getBoundingClientRect().bottom > 0 && host.getBoundingClientRect().top < innerHeight && start())));
  };
  const boot = () => { particles(document.querySelector('.hero'), 'stars'); particles(document.querySelector('#music'), 'bubbles'); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
