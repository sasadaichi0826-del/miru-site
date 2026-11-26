// 星麦みる 公式サイト：全面壁紙ステージ（スクリーンセーバー）と合間帯
// data/site.json の wallpapers を読み、見えているセクションに合わせて壁紙の組を切り替える。
// 停止・縮小条件（指示書 P2-2）：
//   reduced-motion → 1枚静止 / 幅768px以下 → 1枚静止 / saveData・2g・3g → 壁紙ステージ自体を出さない
//   タブが裏にある間 → 切替タイマー停止
(async () => {
  const data = await fetch('data/site.json', { cache: 'no-cache' }).then(r => r.json()).catch(() => null);
  const cfg = data?.wallpapers;
  if (!cfg?.sets) return;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 768px)').matches;
  const conn = navigator.connection || {};
  const slow = conn.saveData === true || ['slow-2g', '2g', '3g'].includes(conn.effectiveType);
  const still = reduced || mobile; // 1枚静止
  const interval = cfg.intervalMs || 13500;
  document.documentElement.style.setProperty('--wall-fade', `${(cfg.fadeMs || 2500) / 1000}s`);

  // ---- 合間帯（インターリュード）：壁紙の有無にかかわらず、つなぎコピーとして出す ----
  (cfg.interludes || []).forEach((it, i) => {
    const after = document.getElementById(it.after);
    if (!after || !it.image) return;
    const line = String(it.line || '').split('<br>').map(esc).join('<br>');
    // 低速回線では大きな画像を読まず、ぼかし用の小画像だけを背景にする
    const big = slow ? '' : `<img src="${esc(it.image.src)}" alt="" loading="lazy" decoding="async">`;
    after.insertAdjacentHTML('afterend',
      `<section class="interlude" id="interlude-${i + 1}" aria-label="${esc(String(it.line).replace(/<br>/g, ''))}">
        <div class="il-bg" style="background-image:url('${esc(it.image.thumb)}')">${big}</div>
        <div class="il-text"><p class="il-line">${line}</p>${it.sub ? `<p class="il-sub">${esc(it.sub)}</p>` : ''}</div>
      </section>`);
  });
  const seenIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('seen'); seenIO.unobserve(e.target); } }), { threshold: .35 });
  document.querySelectorAll('.interlude').forEach(b => seenIO.observe(b));

  if (slow) return; // 壁紙ステージは出さない（現行背景のまま）

  // ---- 壁紙ステージ：2枚のレイヤーを交互にクロスフェード ----
  const stage = document.createElement('div');
  stage.className = 'wall' + (still ? ' still' : '');
  stage.setAttribute('aria-hidden', 'true');
  stage.innerHTML = '<div class="wall-slot"><img alt="" decoding="async"></div><div class="wall-slot"><img alt="" decoding="async"></div><div class="wall-veil"></div>';
  document.body.prepend(stage);
  document.body.classList.add('has-wall');
  const slots = [...stage.querySelectorAll('.wall-slot')];
  let front = 0, setName = null, idx = 0, timer = null;
  const cache = new Map();
  const preload = src => {
    if (!cache.has(src)) cache.set(src, new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = im.onerror = () => res(); im.src = src; }));
    return cache.get(src);
  };
  const show = async item => {
    const next = slots[1 - front];
    const img = next.querySelector('img');
    next.style.backgroundImage = `url("${item.thumb}")`; // blur-up：まず小画像
    img.classList.remove('ready');
    img.src = item.src;
    await preload(item.src);
    img.classList.add('ready');
    next.classList.remove('kb'); void next.offsetWidth;
    if (!still) next.classList.add('kb');
    next.classList.add('on');
    slots[front].classList.remove('on');
    front = 1 - front;
  };
  const tick = () => {
    const list = cfg.sets[setName] || [];
    if (list.length < 2 || document.hidden) return;
    idx = (idx + 1) % list.length;
    show(list[idx]);
    preload(list[(idx + 1) % list.length].src); // 先読みは次の1枚だけ
  };
  const restart = () => { clearInterval(timer); timer = null; if (!still && !document.hidden) timer = setInterval(tick, interval); };
  const useSet = name => {
    if (!cfg.sets[name] || name === setName) return;
    if (still && setName) return; // 静止モードでは最初の1枚のまま
    setName = name; idx = 0;
    const list = cfg.sets[name];
    show(list[0]);
    if (!still && list[1]) preload(list[1].src);
    restart();
    stage.dataset.set = name;
  };
  document.addEventListener('visibilitychange', restart);

  // ---- 見えているセクションに合わせて組を切り替える ----
  const alias = { home: '.hero', novel: '#story', footer: 'footer' };
  const map = cfg.sectionSets || {};
  const targets = Object.entries(map).map(([key, set]) => ({ el: document.querySelector(alias[key] || `#${key}`), set })).filter(t => t.el);
  const vis = new Map();
  const io = new IntersectionObserver(es => {
    es.forEach(e => vis.set(e.target, e.intersectionRatio));
    let best = null, bestR = 0;
    targets.forEach(t => { const r = vis.get(t.el) || 0; if (r > bestR) { bestR = r; best = t; } });
    if (best && bestR > .05) useSet(best.set);
  }, { threshold: [0, .1, .25, .5, .75, 1] });
  targets.forEach(t => io.observe(t.el));
  useSet(map.home || Object.keys(cfg.sets)[0]);

  // ---- 合間帯のパララックス（transform のみ。background-attachment:fixed は使わない） ----
  if (still) return;
  const bands = [...document.querySelectorAll('.interlude')];
  let ticking = false;
  const move = () => {
    ticking = false;
    const vh = innerHeight;
    bands.forEach(b => {
      const r = b.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = (r.top + r.height / 2 - vh / 2) / vh;
      b.querySelector('.il-bg').style.transform = `translate3d(0, ${p * -18}%, 0) scale(1.15)`;
      b.querySelector('.il-text').style.transform = `translate3d(0, ${p * 30}px, 0)`;
    });
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(move); } }, { passive: true });
  move();
})();
