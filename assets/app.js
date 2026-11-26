// 星麦みる 公式サイト：data/site.json を読み込んで「地球観察ノート」として描画する
(async () => {
  const data = await fetch('data/site.json', { cache: 'no-cache' }).then(r => r.json());
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const get = path => path.split('.').reduce((o, k) => o?.[k], data);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

  // 画像：一覧用は Pages 配信の thumb、拡大はドライブ
  const driveId = v => {
    if (!v) return '';
    const m = String(v).match(/\/d\/([\w-]+)|[?&]id=([\w-]+)/);
    return m ? (m[1] || m[2]) : String(v).trim();
  };
  const driveImg = (v, w = 1600) => `https://drive.google.com/thumbnail?id=${driveId(v)}&sz=w${w}`;
  const driveVideo = v => `https://drive.google.com/file/d/${driveId(v)}/preview`;
  const imgSrc = (item, w) => (w <= 800 && item.thumb) ? item.thumb : item.drive ? driveImg(item.drive, w) : (item.src || item.thumb || '');
  const fmtDate = d => d ? d.replaceAll('-', '.') : '';
  const ext = url => url && !url.startsWith('#') ? ' target="_blank" rel="noopener"' : '';
  const img = (g, w, cls = '', eager = false) => `<img${cls ? ` class="${cls}"` : ''} src="${esc(imgSrc(g, w))}" alt="${esc(g.alt || g.title || '')}" loading="${eager ? 'eager' : 'lazy'}" decoding="async" referrerpolicy="no-referrer">`;

  const G = data.gallery || [];
  const byCat = c => G.filter(g => g.category === c && (g.thumb || g.src || g.drive));
  const byTitle = t => G.find(g => g.title === t);
  const thumbed = G.filter(g => g.thumb);
  // 配列から重ならないように n 件を等間隔で選ぶ
  const pickN = (arr, n, seed = 0) => {
    const k = Math.min(n, arr.length); if (!k) return [];
    const step = arr.length / k;
    return Array.from({ length: k }, (_, i) => arr[(Math.floor(i * step) + seed) % arr.length]);
  };

  const icons = {
    youtube: '<svg viewBox="0 0 24 24"><path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8ZM10 15V9l5.2 3Z"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L2 3h6.4l4.4 5.8Zm-1.1 16.2h1.7L7.4 4.7H5.5Z"/></svg>',
    note: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6Zm8 1.5V8h3.5M8.5 11h8M8.5 14h8M8.5 17h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    music: '<svg viewBox="0 0 24 24"><path d="M9 18.5a2.5 2.5 0 1 1-2.5-2.5c.5 0 1 .1 1.5.4V5l11-2v12.5a2.5 2.5 0 1 1-2.5-2.5c.5 0 1 .1 1.5.4V6.4L9 8Z"/></svg>',
    stamp: '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16l-5.4 3 1.2-6-4.5-4.2 6.1-.7Z"/></svg>'
  };
  const linkColors = ['#f08aa8', '#9b8ad6', '#7cc4a4', '#8fb8ea', '#f0b860'];

  $$('[data-bind]').forEach(el => el.textContent = get(el.dataset.bind) ?? '');

  // ---- ライトボックス（Codex版：前後・キーボード・スワイプ） ----
  const box = $('#lightbox');
  let lbItems = [], lbIdx = 0;
  const renderLightbox = () => {
    const item = lbItems[lbIdx]; if (!item) return;
    const im = box.querySelector('img');
    im.src = imgSrc(item, 800);
    const full = imgSrc(item, 2000);
    if (full !== im.src) { const pre = new Image(); pre.referrerPolicy = 'no-referrer'; pre.onload = () => { if (lbItems[lbIdx] === item) im.src = full; }; pre.src = full; }
    im.alt = item.alt || item.title || '';
    $('#lb-cat').textContent = item.category || 'キービジュアル';
    $('#lb-count').textContent = lbItems.length > 1 ? `${lbIdx + 1} / ${lbItems.length}` : '';
    $('#lb-title').textContent = item.title || '';
    $('#lb-note').textContent = item.note || '';
    $('#lb-prev').hidden = $('#lb-next').hidden = lbItems.length < 2;
  };
  const openLightbox = (items, index = 0) => { lbItems = items; lbIdx = (index + items.length) % items.length; renderLightbox(); if (!box.open) box.showModal(); };
  const stepLightbox = dir => { if (lbItems.length < 2) return; lbIdx = (lbIdx + dir + lbItems.length) % lbItems.length; renderLightbox(); };
  $('#lb-prev').onclick = () => stepLightbox(-1);
  $('#lb-next').onclick = () => stepLightbox(1);
  box.addEventListener('click', e => (e.target === box || e.target.matches('.close')) && box.close());
  let lbX = 0;
  box.addEventListener('touchstart', e => { lbX = e.changedTouches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - lbX; if (Math.abs(dx) > 40) stepLightbox(dx < 0 ? 1 : -1); }, { passive: true });

  // ---- ヒーロー ----
  const p = data.profile;
  $('#hero-name').innerHTML = `${esc(p.name.slice(0, 2))}<span>${esc(p.name.slice(2))}</span>`;
  const t = p.tagline;
  $('#tagline').innerHTML = t.slice(0, -1).map(esc).join('<br>') + `<br><em>${esc(t.at(-1))}</em>`;
  const quickKeys = ['x', 'youtube', 'note'];
  $('#quick-links').innerHTML = data.links.filter(l => quickKeys.includes(l.icon))
    .sort((a, b) => quickKeys.indexOf(a.icon) - quickKeys.indexOf(b.icon))
    .map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener"><span class="qi" style="background:${linkColors[data.links.indexOf(l) % 5]}">${icons[l.icon]}</span>${esc(l.label)}</a>`).join('');

  // スライド：heroSlides（立ち絵以外）＋キービジュアルで補う
  const cutout = p.heroImage?.src || 'assets/img/miru-front.webp';
  let slides = (p.heroSlides || []).filter(s => s.src !== cutout);
  for (const g of byCat('キービジュアル')) { if (slides.length >= 8) break; if (!slides.some(s => driveId(s.drive) && driveId(s.drive) === driveId(g.drive))) slides.push(g); }
  let heroIdx = 0, heroPlaying = !reduced && slides.length > 1, heroTimer = null;
  const heroImg = $('#hero-img'), heroDots = $('#hero-dots'), heroPlayBtn = $('#hero-play');
  const showHero = (idx, animate = true) => {
    if (!slides.length) return;
    heroIdx = (idx + slides.length) % slides.length;
    const s = slides[heroIdx], b1 = slides[(heroIdx + 1) % slides.length], b2 = slides[(heroIdx + 2) % slides.length];
    const apply = () => {
      heroImg.src = imgSrc(s, 800); heroImg.alt = s.alt || s.title || '';
      $('#pola-b1').src = imgSrc(b1, 800); $('#pola-b2').src = imgSrc(b2, 800);
      $('#hero-cap').textContent = s.title || '';
      $('#hero-bubble').textContent = s.caption || 'きょうも、地球観察ちゅう。';
      heroDots.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-current', i === heroIdx));
    };
    if (!animate || reduced) { apply(); return; }
    $('#hero-stage').classList.add('flip');
    setTimeout(() => { apply(); $('#hero-stage').classList.remove('flip'); }, 260);
  };
  heroDots.innerHTML = slides.map((s, i) => `<button type="button" aria-label="${esc(s.title || `画像 ${i + 1}`)}"></button>`).join('');
  const restartHero = () => { clearInterval(heroTimer); if (heroPlaying && slides.length > 1) heroTimer = setInterval(() => showHero(heroIdx + 1), 5000); };
  heroDots.addEventListener('click', e => { const i = [...heroDots.children].indexOf(e.target); if (i >= 0) { showHero(i); restartHero(); } });
  $('#hero-prev').onclick = () => { showHero(heroIdx - 1); restartHero(); };
  $('#hero-next').onclick = () => { showHero(heroIdx + 1); restartHero(); };
  heroPlayBtn.onclick = () => {
    heroPlaying = !heroPlaying;
    heroPlayBtn.setAttribute('aria-pressed', heroPlaying); heroPlayBtn.textContent = heroPlaying ? '❚❚' : '▶';
    heroPlayBtn.setAttribute('aria-label', heroPlaying ? '自動切り替えを一時停止' : '自動切り替えを再開');
    restartHero();
  };
  $('#hero-stage').onclick = () => openLightbox(slides, heroIdx);
  if (slides.length < 2) $('#hero-controls').hidden = true;
  showHero(0, false); restartHero();

  // ---- フィルム帯（流れる写真） ----
  const film = (el, items) => {
    if (!items.length) return;
    const html = items.map(g => `<figure data-film="${G.indexOf(g)}">${img(g, 400)}</figure>`).join('');
    el.innerHTML = html + html; // ループ用に2周分
  };
  const filmA = [...byCat('みるの日常'), ...pickN(byCat('地球観察帖｜おめかし'), 8, 1), ...pickN(byCat('お部屋観察'), 5, 2)].filter(g => g.thumb);
  const filmB = [...pickN(byCat('街の観察'), 10, 3), ...pickN(byCat('物語のイラスト'), 6, 1), ...pickN(byCat('立体・素材'), 4, 2)].filter(g => g.thumb);
  film($('#film-a'), filmA); film($('#film-b'), filmB);
  document.addEventListener('click', e => {
    const f = e.target.closest('[data-film]'); if (!f) return;
    const list = f.closest('#film-a') ? filmA : filmB;
    openLightbox(list, list.indexOf(G[+f.dataset.film]));
  });

  // ---- プロフィール ----
  $('#facts').innerHTML = p.facts.map(f => `<div class="rv"><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd><span class="stamp${f.status === 'wip' ? ' wip' : ''}">${f.status === 'wip' ? '確認中' : '済'}</span></div>`).join('');
  const coll = pickN(byCat('みるの日常').filter(g => g.thumb), 3, 0);
  $('#profile-collage').innerHTML = coll.map((g, i) => `<figure class="pc pc${i} rv" data-g="${G.indexOf(g)}"><span class="tape" aria-hidden="true"></span>${img(g, 400)}<figcaption>${esc(g.title)}</figcaption></figure>`).join('');

  // ---- お知らせ：手紙（最新に切手の写真） ----
  const news = [...data.news].sort((a, b) => b.date.localeCompare(a.date));
  const daysAgo = d => (Date.now() - new Date(d + 'T00:00:00+09:00')) / 864e5;
  const stampImg = slides[1] || byCat('キービジュアル')[0];
  $('#news-list').innerHTML = news.map((n, i) => {
    const tag = n.url ? 'a' : 'div';
    return `<${tag} class="letter rv${i === 0 ? ' latest' : ''}"${n.url ? ` href="${esc(n.url)}"${ext(n.url)}` : ''}>
      ${i === 0 ? `<span class="tape t1" aria-hidden="true"></span>${stampImg ? `<span class="post-stamp" aria-hidden="true">${img(stampImg, 400)}</span>` : ''}` : ''}
      ${i === 0 && daysAgo(n.date) <= 30 ? '<span class="new-seal">NEW</span>' : ''}
      <time datetime="${esc(n.date)}">${fmtDate(n.date)}</time><span class="tag">${esc(n.tag)}</span>
      <strong>${esc(n.title)}</strong>${n.body ? `<p>${esc(n.body)}</p>` : ''}</${tag}>`;
  }).join('');
  const today = new Date().toISOString().slice(0, 10);
  const sched = data.schedule.filter(s => s.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  $('#schedule-list').innerHTML = sched.length
    ? sched.map(s => `<li class="rv"><time datetime="${esc(s.date)}">${fmtDate(s.date).slice(5)}<small>${esc(s.time)}</small></time><div>${s.url ? `<a href="${esc(s.url)}"${ext(s.url)}>${esc(s.title)}</a>` : esc(s.title)}</div><p>${esc(s.platform)}</p></li>`).join('')
    : '<li class="empty rv">いまは予定がありません。X でおしらせします。</li>';

  // ---- 動画 ----
  $('#video-list').innerHTML = data.videos.map(v => {
    let frame;
    if (v.youtube) frame = `<iframe src="https://www.youtube-nocookie.com/embed/${esc(v.youtube)}" title="${esc(v.title)}" allowfullscreen loading="lazy"></iframe>`;
    else if (v.drive) frame = `<iframe src="${driveVideo(v.drive)}" title="${esc(v.title)}" allow="autoplay" allowfullscreen loading="lazy"></iframe>`;
    else frame = '<span class="soon">動画は もうすぐ とどきます</span>';
    return `<div class="video rv"><span class="tape t1" aria-hidden="true"></span><div class="frame" style="background-image:url('${esc(v.poster || '')}')">${frame}</div><p>${esc(v.title)}<small>${esc(v.note)}</small></p>${v.credit ? `<p class="credit">${esc(v.credit)}</p>` : ''}</div>`;
  }).join('');

  // ---- 音楽室：曲ごとにジャケットが替わるレコード ----
  const music = data.music || [];
  const jacketPool = [...byCat('地球観察帖｜おめかし'), ...byCat('キービジュアル'), ...byCat('みるの日常')].filter(g => g.thumb);
  const jacketFor = (m, i) => byTitle(m.title)?.thumb ? byTitle(m.title) : jacketPool[(i * 5) % jacketPool.length];
  $('#track-list').innerHTML = music.map((m, i) => {
    const j = jacketFor(m, i);
    return `<button type="button" role="option" class="track rv" data-i="${i}" aria-selected="false"><span class="mini">${j ? img(j, 400) : ''}</span><span class="tx"><strong>${esc(m.title)}</strong><small>${String(i + 1).padStart(2, '0')} · ${esc(m.genre)}</small></span></button>`;
  }).join('');
  const tt = $('#turntable');
  const pick = (i, spin) => {
    const m = music[i]; if (!m) return;
    const j = jacketFor(m, i);
    if (j) { $('#now-jacket').src = imgSrc(j, 800); $('#now-jacket').alt = `${m.title} のジャケット（${j.title}）`; $('#now-label').src = imgSrc(j, 400); }
    $('#now-title').textContent = m.title; $('#now-genre').textContent = m.genre; $('#now-link').href = m.url;
    $$('#track-list .track').forEach(b => b.setAttribute('aria-selected', b.dataset.i == i));
    tt.classList.remove('swap'); void tt.offsetWidth; tt.classList.add('swap');
    if (spin) tt.classList.add('playing');
  };
  $('#track-list').addEventListener('click', e => { const b = e.target.closest('.track'); if (b) pick(+b.dataset.i, true); });
  pick(0, false);

  // ---- 物語 ----
  const st = data.story;
  if (st) {
    $('#story-img').src = imgSrc({ src: st.image, drive: st.drive }, 1200);
    $('#story-title').textContent = st.title;
    $('#story-catch').textContent = st.catch;
    $('#story-lead').textContent = st.lead;
    $('#story-desc').textContent = st.description;
    $('#episode-list').innerHTML = st.episodes.map(e => `<li class="rv"><a href="${esc(e.url)}" target="_blank" rel="noopener"><span>第${e.n}話</span>${esc(e.title)}</a></li>`).join('');
    $('#story-more').href = st.magazineUrl;
  }
  const cast = [...byCat('キャラクター設定'), ...byCat('メカニック')].filter(g => g.thumb);
  $('#story-cast').innerHTML = cast.length ? `<p class="label">CAST &amp; MECHA</p><div class="cast-row">${cast.map(g => `<figure class="rv" data-cast="${G.indexOf(g)}">${img(g, 400)}<figcaption>${esc(g.title)}</figcaption></figure>`).join('')}</div>` : '';
  $('#story-cast').addEventListener('click', e => { const f = e.target.closest('[data-cast]'); if (f) openLightbox(cast, cast.indexOf(G[+f.dataset.cast])); });
  $('#note-list').innerHTML = (data.notes || []).map(n =>
    `<a class="note rv" href="${esc(n.url)}" target="_blank" rel="noopener"><strong>${esc(n.title)}</strong><p>${esc(n.body)}</p><small>${esc(n.credit)}</small><span class="go">noteで読む ↗</span></a>`).join('');

  // ---- ギャラリー（Codex版：ステージ＋一覧）＋カテゴリカード ----
  const cats = ['すべて', ...new Set(G.map(g => g.category))];
  const coverOf = c => (c === 'すべて' ? slides[0] : G.find(g => g.category === c && g.thumb)) || G.find(g => g.category === c);
  let activeView = 'stage', filtered = [...G], stageIdx = 0, stageAuto = !reduced, stageTimer = null, gridLimit = 24;
  const stageImg = $('#stage-img'), thumbStrip = $('#thumb-strip'), stageAutoBtn = $('#stage-auto');
  const firstLine = s => String(s || '').split('\n').find(x => x.trim()) || '';
  const renderStage = (idx, animate = true) => {
    if (!filtered.length) return;
    stageIdx = (idx + filtered.length) % filtered.length;
    const item = filtered[stageIdx];
    const apply = () => {
      stageImg.src = imgSrc(item, 800);
      const full = imgSrc(item, 1400);
      if (full !== stageImg.src) { const pre = new Image(); pre.referrerPolicy = 'no-referrer'; pre.onload = () => { if (filtered[stageIdx] === item) stageImg.src = full; }; pre.src = full; }
      stageImg.alt = item.alt || item.title;
      $('#stage-cat').textContent = item.category;
      $('#stage-count').textContent = `${stageIdx + 1} / ${filtered.length}`;
      $('#stage-title').textContent = item.title;
      $('#stage-note').textContent = item.note || '';
      thumbStrip.querySelectorAll('button').forEach((b, i) => {
        const cur = i === stageIdx; b.setAttribute('aria-current', cur);
        if (cur && thumbStrip.offsetParent) thumbStrip.scrollTo({ left: b.offsetLeft - thumbStrip.clientWidth / 2 + b.clientWidth / 2, behavior: reduced ? 'auto' : 'smooth' });
      });
    };
    if (!animate || reduced) { apply(); return; }
    $('#stage-figure').classList.add('flip');
    setTimeout(() => { apply(); $('#stage-figure').classList.remove('flip'); }, 200);
  };
  const renderThumbs = () => { thumbStrip.innerHTML = filtered.map((g, i) => `<button type="button" aria-label="${esc(g.title)}" aria-current="${i === stageIdx}">${img(g, 240)}</button>`).join(''); };
  const renderGrid = () => {
    $('#gallery-list').innerHTML = filtered.slice(0, gridLimit).map((g, i) => {
      const memo = firstLine(g.note);
      return `<figure data-idx="${i}">${img(g, 800)}<figcaption>${esc(g.title)}${memo && memo !== g.title ? `<small>${esc(memo)}</small>` : `<small>${esc(g.category)}</small>`}</figcaption></figure>`;
    }).join('');
    $('#gallery-more-wrap').hidden = filtered.length <= gridLimit || activeView !== 'grid';
  };
  const restartStage = () => { clearInterval(stageTimer); if (stageAuto && activeView === 'stage' && filtered.length > 1) stageTimer = setInterval(() => renderStage(stageIdx + 1), 5000); };
  const setCategory = cat => {
    filtered = cat === 'すべて' ? [...G] : G.filter(g => g.category === cat);
    stageIdx = 0; gridLimit = 24;
    $$('#filters button').forEach(b => b.setAttribute('aria-pressed', b.dataset.cat === cat));
    renderThumbs(); renderStage(0, false); renderGrid(); restartStage();
  };
  const setView = view => {
    activeView = view;
    $$('.view-switch button').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === view));
    $('#gallery-stage').hidden = view !== 'stage';
    $('#gallery-list').hidden = view !== 'grid';
    $('#gallery-more-wrap').hidden = view !== 'grid' || filtered.length <= gridLimit;
    restartStage();
  };
  $('#filters').innerHTML = cats.map(c => {
    const cv = coverOf(c), n = c === 'すべて' ? G.length : G.filter(g => g.category === c).length;
    return `<button type="button" class="cat" data-cat="${esc(c)}">${cv ? img(cv, 240) : ''}<span>${esc(c)}<small>${n}</small></span></button>`;
  }).join('');
  $('#filters').addEventListener('click', e => { const b = e.target.closest('button[data-cat]'); if (b) setCategory(b.dataset.cat); });
  $('.view-switch').addEventListener('click', e => { const b = e.target.closest('button[data-view]'); if (b) setView(b.dataset.view); });
  $('#stage-prev').onclick = () => { renderStage(stageIdx - 1); restartStage(); };
  $('#stage-next').onclick = () => { renderStage(stageIdx + 1); restartStage(); };
  thumbStrip.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const i = [...thumbStrip.children].indexOf(b); if (i >= 0) { renderStage(i); restartStage(); } });
  stageImg.addEventListener('click', () => openLightbox(filtered, stageIdx));
  stageAutoBtn.onclick = () => {
    stageAuto = !stageAuto;
    stageAutoBtn.setAttribute('aria-pressed', stageAuto);
    stageAutoBtn.textContent = stageAuto ? '❚❚ 自動切り替え ON' : '▶ 自動切り替え OFF';
    restartStage();
  };
  let stX = 0;
  $('#gallery-stage').addEventListener('touchstart', e => { stX = e.changedTouches[0].clientX; }, { passive: true });
  $('#gallery-stage').addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - stX; if (Math.abs(dx) > 40) { renderStage(stageIdx + (dx < 0 ? 1 : -1)); restartStage(); } }, { passive: true });
  $('#gallery-list').addEventListener('click', e => { const f = e.target.closest('figure[data-idx]'); if (f) openLightbox(filtered, +f.dataset.idx); });
  $('#gallery-more').onclick = () => { gridLimit += 24; renderGrid(); };
  document.addEventListener('keydown', e => {
    if (box.open) { if (e.key === 'ArrowLeft') stepLightbox(-1); else if (e.key === 'ArrowRight') stepLightbox(1); }
    else if (activeView === 'stage' && document.activeElement?.closest('#gallery')) {
      if (e.key === 'ArrowLeft') { renderStage(stageIdx - 1); restartStage(); }
      else if (e.key === 'ArrowRight') { renderStage(stageIdx + 1); restartStage(); }
    }
  });
  setCategory('すべて'); setView('stage');
  // ギャラリーが画面外のときは自動切り替えを止める
  new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) restartStage(); else clearInterval(stageTimer); })).observe($('#gallery-stage'));

  // プロフィールのコラージュ → ライトボックス
  $('#profile-collage').addEventListener('click', e => { const f = e.target.closest('[data-g]'); if (f) openLightbox(coll, coll.indexOf(G[+f.dataset.g])); });

  // ---- リンク ----
  const sparkles = '<i class="sp s1">✦</i><i class="sp s2">✧</i><i class="sp s3">♡</i>';
  $('#link-list').innerHTML = data.links.map((l, i) =>
    `<a class="lk lk-${i % 5} rv" href="${esc(l.url)}" target="_blank" rel="noopener" style="--d:${i * 0.4}s">
      <span class="ic">${icons[l.icon] || icons.stamp}</span>
      <span class="tx"><strong>${esc(l.label)}</strong><span>${esc(l.sub)}</span></span>
      <span class="go" aria-hidden="true">→</span>${sparkles}</a>`).join('');

  const gl = data.guideline;
  $('#guide-ok').innerHTML = gl.ok.map(x => `<li>${esc(x)}</li>`).join('');
  $('#guide-ng').innerHTML = gl.ng.map(x => `<li>${esc(x)}</li>`).join('');
  $('#contact').textContent = gl.contact ? `お問い合わせ：${gl.contact}` : 'ご相談は X の DM までどうぞ。';
  $('#footer').textContent = data.footer || '© 星麦みる';

  // 眠るみる（デフォルメ「本の上でお昼寝」）
  const nap = byTitle('本の上でお昼寝') || byCat('デフォルメ')[0];
  if (nap) $('#sleep-img').src = imgSrc(nap, 400); else $('.sleep-art img').remove();

  // F2. 角から覗くデフォルメのステッカー
  const chibi = byCat('デフォルメ').filter(g => g.thumb && g !== nap);
  const peekAt = ['profile', 'videos', 'story', 'links'];
  peekAt.forEach((id, i) => {
    const g = chibi[(i * 3) % chibi.length]; if (!g) return;
    $('#' + id).insertAdjacentHTML('beforeend', `<button type="button" class="peek peek-${i % 2 ? 'l' : 'r'}" data-peek="${G.indexOf(g)}" aria-label="${esc(g.title)} を見る">${img(g, 240)}</button>`);
  });
  document.addEventListener('click', e => { const b = e.target.closest('[data-peek]'); if (b) openLightbox(chibi, chibi.indexOf(G[+b.dataset.peek])); });

  // ===== 演出 =====
  $('#time-toggle').onclick = () => {
    const next = document.documentElement.dataset.time === 'night' ? 'day' : 'night';
    document.documentElement.dataset.time = next; store.set('miru-time', next);
  };

  // セクション番号の星座
  const constellation = no => {
    const n = +no, pts = [];
    for (let i = 0; i < 4; i++) {
      const a = (n * 1.7 + i * 1.9) % (Math.PI * 2);
      pts.push([41 + Math.cos(a) * (18 + (i * 7 + n * 3) % 16), 41 + Math.sin(a) * (18 + (i * 5 + n) % 16)]);
    }
    const d = 'M' + pts.map(q => q.map(v => v.toFixed(1)).join(' ')).join(' L');
    return `<svg class="const" viewBox="0 0 82 82" aria-hidden="true"><path d="${d}"/>${pts.map((q, i) => `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${i === 0 ? 3.4 : 2.2}" style="transition-delay:${.3 + i * .25}s"/>`).join('')}<text x="41" y="49" text-anchor="middle">${esc(no)}</text></svg>`;
  };
  $$('.obs[data-no]').forEach(s => s.querySelector('.obs-head').insertAdjacentHTML('afterbegin', constellation(s.dataset.no)));

  // セクションごとに違う出現
  $$('.obs').forEach(s => s.querySelectorAll('.file, .story-art, .stage-wrap, .record-room > *, .sub-h, .cat-cards, .sticky-note').forEach(el => el.classList.add('rv')));
  const secs = $$('.obs');
  const reveal = sec => {
    if (sec.classList.contains('in')) return;
    sec.classList.add('in');
    sec.querySelectorAll('.rv').forEach((el, i) => setTimeout(() => el.classList.add('on'), reduced ? 0 : Math.min(i, 12) * 70));
  };
  const revealIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting && e.boundingClientRect.top > 0) return;
    secs.slice(0, secs.indexOf(e.target) + 1).forEach(reveal);
  }), { threshold: 0, rootMargin: '0px 0px -12% 0px' });
  secs.forEach(s => revealIO.observe(s));
  new MutationObserver(() => $$('.obs.in .rv:not(.on)').forEach(el => el.classList.add('on'))).observe($('main'), { childList: true, subtree: true });

  if (reduced) return;

  // パララックス
  const layers = $$('.layer[data-depth]');
  let mx = 0, my = 0, ticking = false;
  const apply = () => {
    ticking = false;
    const sy = scrollY;
    layers.forEach(l => {
      const d = +l.dataset.depth, inSky = !!l.closest('.sky');
      l.style.transform = `translate3d(${mx * d * 26}px, ${my * d * 18 + (inSky ? -sy * d * .3 : 0)}px, 0)`;
    });
  };
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(apply); } };
  addEventListener('scroll', req, { passive: true });
  if (matchMedia('(pointer:fine)').matches) {
    addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; req(); }, { passive: true });
    let last = 0;
    addEventListener('pointermove', e => {
      const now = performance.now(); if (now - last < 70) return; last = now;
      const s = document.createElement('span');
      s.className = 'dust'; s.textContent = Math.random() < .5 ? '✦' : '·';
      s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px';
      s.style.setProperty('--dx', (Math.random() * 16 - 8) + 'px');
      document.body.appendChild(s); setTimeout(() => s.remove(), 900);
    }, { passive: true });
  }
  document.addEventListener('pointerover', e => {
    const a = e.target.closest('.lk, .quick a, .btn');
    if (!a || a.contains(e.relatedTarget)) return;
    const b = document.createElement('span');
    b.className = 'burst'; b.textContent = '✦';
    b.style.left = (a.offsetWidth * (.2 + Math.random() * .6)) + 'px'; b.style.top = '-4px';
    b.style.setProperty('--dx', (Math.random() * 30 - 15) + 'px'); b.style.setProperty('--dy', '-28px');
    if (getComputedStyle(a).position === 'static') a.style.position = 'relative';
    a.appendChild(b); setTimeout(() => b.remove(), 600);
  });

  // ぺーたんがトーストを運んで、ときどき横切る
  const v = $('#visitor');
  const visit = () => { if (document.hidden) return; v.classList.remove('go'); void v.offsetWidth; v.classList.add('go'); };
  setTimeout(() => { visit(); setInterval(visit, 180000); }, 20000);
})();
