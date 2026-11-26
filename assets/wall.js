// 星麦みる 公式サイト：全面壁紙ステージ（スクリーンセーバー）と合間帯
// data/site.json の wallpaper を読み、見えているセクションに合わせて壁紙の組を切り替える。
(async () => {
  const data = await fetch('data/site.json', { cache: 'no-cache' }).then(r => r.json()).catch(() => null);
  const cfg = data?.wallpaper;
  if (!cfg?.sets) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const root = document.documentElement;
  root.style.setProperty('--wall-fade', `${cfg.fade || 2.5}s`);

  // ---- 壁紙レイヤー：2枚のスロットを交互にクロスフェード ----
  const wall = document.createElement('div');
  wall.className = 'wall';
  wall.setAttribute('aria-hidden', 'true');
  wall.innerHTML = '<div class="wall-slot"><img alt=""></div><div class="wall-slot"><img alt=""></div><div class="wall-veil"></div>';
  document.body.prepend(wall);
  document.body.classList.add('has-wall');
  const slots = [...wall.querySelectorAll('.wall-slot')];
  let front = 0, setName = null, idx = 0, timer = null;
  const loaded = new Map();
  const preload = src => {
    if (!loaded.has(src)) loaded.set(src, new Promise(res => { const im = new Image(); im.onload = im.onerror = () => res(); im.src = src; }));
    return loaded.get(src);
  };

  const show = async item => {
    const next = slots[1 - front];
    const img = next.querySelector('img');
    // blur-up：先に小さな画像をぼかして敷き、本画像が届いたら差し替える
    next.style.backgroundImage = `url("${item.tiny}")`;
    img.classList.remove('ready');
    img.src = item.src;
    await preload(item.src);
    img.classList.add('ready');
    next.classList.remove('kb'); void next.offsetWidth;
    if (!reduced) next.classList.add('kb');
    next.classList.add('on');
    slots[front].classList.remove('on');
    front = 1 - front;
  };
  const tick = () => {
    const list = cfg.sets[setName] || [];
    if (!list.length) return;
    idx = (idx + 1) % list.length;
    show(list[idx]);
    preload(list[(idx + 1) % list.length].src);
  };
  const useSet = name => {
    if (!cfg.sets[name] || name === setName) return;
    setName = name; idx = 0;
    const list = cfg.sets[name];
    show(list[0]);
    if (list[1]) preload(list[1].src);
    clearInterval(timer);
    if (!reduced && list.length > 1) timer = setInterval(tick, (cfg.interval || 13) * 1000);
    wall.dataset.set = name;
  };

  // ---- 合間帯（インターリュード） ----
  (cfg.interludes || []).forEach((it, i) => {
    const after = document.getElementById(it.after);
    if (!after) return;
    const line = String(it.line || '').split('<br>').map(esc).join('<br>');
    after.insertAdjacentHTML('afterend',
      `<section class="interlude" id="interlude-${i + 1}" aria-label="${esc(String(it.line).replace(/<br>/g, ''))}" data-wall="${esc(it.set || '')}">
        <div class="il-bg" style="background-image:url('${esc(it.image.tiny)}')"><img src="${esc(it.image.src)}" alt="" loading="lazy"></div>
        <div class="il-text"><p class="il-line">${line}</p>${it.sub ? `<p class="il-sub">${esc(it.sub)}</p>` : ''}</div>
      </section>`);
  });

  // ---- 見えているセクションに合わせて組を切り替える ----
  const map = cfg.sections || {};
  const targets = [...document.querySelectorAll('main > section[id], .hero')]
    .map(el => ({ el, set: map[el.id || 'top'] || (el.classList.contains('hero') ? map.top : null) }))
    .filter(t => t.set);
  const vis = new Map();
  const io = new IntersectionObserver(es => {
    es.forEach(e => vis.set(e.target, e.intersectionRatio));
    let best = null, bestR = 0;
    targets.forEach(t => { const r = vis.get(t.el) || 0; if (r > bestR) { bestR = r; best = t; } });
    if (best) useSet(best.set);
  }, { threshold: [0, .15, .3, .5, .7, 1] });
  targets.forEach(t => io.observe(t.el));
  // フッター付近は星空へ
  const foot = document.querySelector('footer');
  if (foot && cfg.sets.end) new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) useSet('end'); }), { threshold: .3 }).observe(foot);
  useSet(map.top || Object.keys(cfg.sets)[0]);

  // ---- 合間帯：一言が見えたら浮かび上がる ----
  const seenIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('seen'); seenIO.unobserve(e.target); } }), { threshold: .35 });
  document.querySelectorAll('.interlude').forEach(b => seenIO.observe(b));

  // ---- 合間帯のパララックス（背景が遅れて動く） ----
  if (reduced) return;
  const bands = [...document.querySelectorAll('.interlude')];
  let ticking = false;
  const move = () => {
    ticking = false;
    const vh = innerHeight;
    bands.forEach(b => {
      const r = b.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = (r.top + r.height / 2 - vh / 2) / vh; // -1〜1
      b.querySelector('.il-bg').style.transform = `translate3d(0, ${p * -18}%, 0) scale(1.15)`;
      b.querySelector('.il-text').style.transform = `translate3d(0, ${p * 30}px, 0)`;
    });
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(move); } }, { passive: true });
  move();
})();
