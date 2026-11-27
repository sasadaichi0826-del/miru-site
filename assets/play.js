// 星麦みる 公式サイト：触って、発見して、また来たくなる「観察基地」（改修指示書 2026-11-27 Phase 1）
//  P1-B 触り心地の共通基盤（burstAt・トースト・「うごきをへらす」）
//  P1-C キャラクターの反応   P1-D 観察カード   P1-E 観察ノート
//  P1-F 時間帯・再訪        P1-G 空状態      P1-A 部屋ヒーロー（ホットスポット仮置き）
// 新しい台詞・文言は site.json 側で draft:true。本番では出さず、?draft=1（または ?debug=1）のときだけ表示する。
// 状態は localStorage のみ（読み書きはすべて try/catch）。音は鳴らさない。
(() => {
  const root = document.documentElement;
  const qs = new URLSearchParams(location.search);
  const DEBUG = qs.has('debug');
  const PREVIEW = qs.has('draft') || DEBUG;
  const R = () => (window.miruReduced ? window.miruReduced() : matchMedia('(prefers-reduced-motion: reduce)').matches);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
    json(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } }
  };
  const session = {
    get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch {} }
  };
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');

  // ================= P1-B 触り心地の共通基盤（データ不要・本番でも有効） =================
  const fx = document.createElement('div');
  fx.className = 'fx-layer'; fx.setAttribute('aria-hidden', 'true');
  document.body.appendChild(fx);
  let particles = 0;
  const GLYPH = ['✦', '✧', '★'];
  // クリック位置に星と方眼紙の切れ端を散らす。8〜12個を角度で等分してから少しだけ揺らし、重ならないようにする
  const burstAt = (x, y, opt = {}) => {
    if (R() || particles > 60) return;
    const n = opt.n || 8 + Math.floor(Math.random() * 5);
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = base + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * (Math.PI / n) * 0.8;
      const r = (opt.r || 30) + (i % 2) * 12 + Math.random() * 14;
      const s = document.createElement('span');
      const paper = i % 4 === 3;
      s.className = paper ? 'fx-p fx-paper' : 'fx-p';
      if (!paper) s.textContent = GLYPH[i % GLYPH.length];
      s.style.cssText = `left:${x}px;top:${y}px;--dx:${(Math.cos(a) * r).toFixed(1)}px;--dy:${(Math.sin(a) * r).toFixed(1)}px;--rot:${Math.round(Math.random() * 160 - 80)}deg`;
      fx.appendChild(s); particles++;
      setTimeout(() => { s.remove(); particles--; }, 680);
    }
  };
  const centerOf = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const TAPPABLE = 'a[href], button, [role=tab], [role=option], [role=button], summary';
  document.addEventListener('click', e => {
    const t = e.target.closest?.(TAPPABLE);
    if (!t || t.closest('dialog#lightbox')) return;
    // キーボード操作（座標なし）のときは要素の中心から
    const [x, y] = (e.detail === 0 && !e.clientX && !e.clientY) ? centerOf(t) : [e.clientX, e.clientY];
    burstAt(x, y);
  }, true);

  // トースト（画面端・role=status）
  const toastBox = document.createElement('div');
  toastBox.className = 'toast-box'; toastBox.setAttribute('role', 'status'); toastBox.setAttribute('aria-live', 'polite');
  document.body.appendChild(toastBox);
  const toast = (html, ms = 3200) => {
    const t = document.createElement('p');
    t.className = 'toast-msg'; t.innerHTML = html;
    toastBox.appendChild(t);
    requestAnimationFrame(() => t.classList.add('on'));
    setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 400); }, ms);
    while (toastBox.children.length > 3) toastBox.firstChild.remove();
  };

  // 「うごきをへらす」トグル（localStorage に保存。端末設定で減らしているときは押せない）
  const mt = $('#motion-toggle');
  const osReduced = matchMedia('(prefers-reduced-motion: reduce)');
  const syncMotion = () => {
    if (!mt) return;
    mt.setAttribute('aria-pressed', String(R()));
    mt.disabled = osReduced.matches;
    mt.title = osReduced.matches ? '端末の設定で、うごきをへらしています' : '';
  };
  if (mt) {
    mt.addEventListener('click', () => {
      const on = root.dataset.motion !== 'reduce';
      if (on) root.dataset.motion = 'reduce'; else delete root.dataset.motion;
      store.set('miru-motion', on ? 'reduce' : 'full');
      syncMotion();
      document.dispatchEvent(new CustomEvent('miru:motion'));
      dispatchEvent(new Event('scroll')); // パララックスの位置を戻す
    });
    osReduced.addEventListener?.('change', syncMotion);
    syncMotion();
  }
  window.miruFx = { burstAt, toast };

  // ================= ここからはデータ（site.json）を使う =================
  const start = () => {
    const { data } = window.miruSite;
    const live = o => !!o && (o.draft !== true || PREVIEW);
    const pub = arr => (Array.isArray(arr) ? arr : []).filter(x => x && (x.draft !== true || PREVIEW));
    const tod = root.dataset.tod || 'day';

    // 同じ台詞を2回続けない（直前の文字列を覚えておく）
    let lastLine = '';
    const pick = pool => {
      const list = (pool || []).filter(Boolean);
      if (!list.length) return '';
      let s, guard = 0;
      do { s = list[Math.floor(Math.random() * list.length)]; } while (list.length > 1 && s === lastLine && ++guard < 20);
      lastLine = s;
      return s;
    };

    // 吹き出し（アンカー要素の上に出す。aria-live で読み上げ）
    const bubble = document.createElement('p');
    bubble.className = 'say-bubble'; bubble.setAttribute('role', 'status'); bubble.setAttribute('aria-live', 'polite');
    document.body.appendChild(bubble);
    let bubbleTimer = 0;
    const say = (anchor, text, opt = {}) => {
      if (!text || !anchor) return;
      const r = anchor.getBoundingClientRect();
      // 表示してから文字を入れる（隠れた live region の更新は読み上げられないことがある）
      bubble.className = 'say-bubble on' + (opt.angry ? ' angry' : '');
      bubble.style.left = '0px'; bubble.style.top = '0px';
      bubble.textContent = text;
      const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
      const x = Math.min(Math.max(8, r.left + r.width / 2 - bw / 2), innerWidth - bw - 8);
      const y = Math.max(8, r.top + (opt.at ?? 0.15) * r.height - bh - 10);
      bubble.style.left = `${x + scrollX}px`; bubble.style.top = `${y + scrollY}px`;
      bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(() => bubble.classList.remove('on', 'pop'), opt.ms || 2600);
    };

    // ================= P1-D 観察カード =================
    const cards = pub(data.discoveries).filter(c => c.id).sort((a, b) => (a.no || 0) - (b.no || 0));
    const reward = live(data.discoveryReward) ? data.discoveryReward : null;
    const CARD_KEY = 'miru-cards';
    const found = new Set((store.json(CARD_KEY, []) || []).filter(id => cards.some(c => c.id === id)));
    let counter = null, zukan = null;
    const complete = () => cards.length > 0 && cards.every(c => found.has(c.id));
    const updateCounter = () => {
      document.querySelectorAll('[data-card-count]').forEach(el => { el.textContent = found.size; });
      document.querySelectorAll('[data-card-total]').forEach(el => { el.textContent = cards.length; });
      counter?.classList.toggle('done', complete());
    };
    const discover = id => {
      const c = cards.find(x => x.id === id);
      if (!c || found.has(id)) return false;
      found.add(id);
      store.set(CARD_KEY, JSON.stringify([...found]));
      updateCounter();
      if (zukan?.open) renderZukan();
      toast(`<span class="toast-card" aria-hidden="true">✦</span>観察カード <b>No.${pad(c.no)}</b> を記録しました`);
      if (counter && !R()) { counter.classList.remove('bump'); void counter.offsetWidth; counter.classList.add('bump'); }
      if (complete() && reward) setTimeout(() => toast(`🎁 ${esc(reward.title)}`, 4200), 900);
      return true;
    };
    const cardArt = c => c.image
      ? `<img src="${esc(c.image)}" alt="" loading="lazy" decoding="async">`
      : '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6l6.8 15.6 17 1.6-12.9 11.3 3.9 16.6L32 42.4l-14.8 8.7 3.9-16.6L8.2 23.2l17-1.6z"/></svg>';
    const renderZukan = () => {
      if (!zukan) return;
      zukan.querySelector('.zk-grid').innerHTML = cards.map(c => found.has(c.id)
        ? `<li class="zk-card got"><span class="zk-no">No.${pad(c.no)}</span><span class="zk-art">${cardArt(c)}</span><strong>${esc(c.title)}</strong><small>${esc(c.text)}</small></li>`
        : `<li class="zk-card"><span class="zk-no">No.${pad(c.no)}</span><span class="zk-art zk-unknown" aria-hidden="true">？</span><strong>まだ見つけていない</strong><small>ヒント：${esc(c.hint || '？')}</small></li>`).join('');
      const rw = zukan.querySelector('.zk-reward');
      if (reward && complete()) {
        rw.hidden = false;
        rw.innerHTML = `<p class="label">REWARD</p><strong>${esc(reward.title)}</strong><p>${esc(reward.text || '')}</p><ul>${(reward.items || []).map(it => `<li><a href="${esc(it.src)}" target="_blank" rel="noopener" download>${it.thumb ? `<img src="${esc(it.thumb)}" alt="" loading="lazy">` : ''}${esc(it.label)} ↓</a></li>`).join('')}</ul>`;
      } else if (reward) {
        rw.hidden = false;
        rw.innerHTML = `<p class="zk-lock">ぜんぶ集めると、おまけが解放されるよ（あと ${cards.length - found.size} 枚）</p>`;
      } else rw.hidden = true;
    };
    const openZukan = () => { if (!zukan) return; renderZukan(); zukan.showModal(); };
    if (cards.length) {
      counter = document.createElement('button');
      counter.type = 'button'; counter.className = 'card-counter';
      counter.setAttribute('aria-label', '観察カードのずかんをひらく');
      counter.innerHTML = '<span class="cc-ic" aria-hidden="true">✦</span>観察 <b data-card-count>0</b> / <span data-card-total>0</span>';
      document.body.appendChild(counter);
      zukan = document.createElement('dialog');
      zukan.className = 'zukan'; zukan.setAttribute('aria-labelledby', 'zk-title');
      zukan.innerHTML = `<div class="zk-inner">
        <button type="button" class="zk-close" aria-label="とじる">×</button>
        <p class="label">OBSERVATION CARDS</p>
        <h2 id="zk-title">観察カード ずかん${PREVIEW ? '<span class="draft-badge">仮置き・本人確認前</span>' : ''}</h2>
        <p class="zk-sum">観察 <b data-card-count>0</b> / <span data-card-total>0</span></p>
        <ul class="zk-grid" tabindex="0" aria-label="観察カードの一覧"></ul>
        <div class="zk-reward" hidden></div>
      </div>`;
      document.body.appendChild(zukan);
      counter.addEventListener('click', openZukan);
      zukan.addEventListener('click', e => { if (e.target === zukan || e.target.closest('.zk-close')) zukan.close(); });
      updateCounter();
    }

    // ================= P1-C キャラクターの反応 =================
    const rx = live(data.reactions) ? data.reactions : null;
    const room = live(data.room) ? data.room : null;
    const heroArt = $('.hero-art');
    const isSp = () => matchMedia('(max-width: 860px)').matches;
    const place = (el, spot) => {
      const s = (isSp() && spot.sp) ? { ...spot, ...spot.sp } : spot;
      Object.assign(el.style, { left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, height: `${s.h}%` });
    };
    const placed = []; // [要素, 座標] 画面幅が変わったら置き直す
    addEventListener('resize', () => placed.forEach(([el, s]) => place(el, s)), { passive: true });

    let tapCount = 0, lastTap = 0;
    const tapMiru = anchor => {
      if (!rx) return;
      const now = Date.now();
      tapCount = now - lastTap > 1500 ? 1 : tapCount + 1;
      lastTap = now;
      if (tapCount === 10) {
        say(anchor, pick(rx.rapid?.['10']) || pick(rx.tap));
        discover('card-04');
        tapCount = 0;
      } else if (tapCount >= 5 && tapCount < 10) {
        say(anchor, pick(rx.rapid?.['5']) || pick(rx.tap), { angry: true });
      } else say(anchor, pick(rx.tap));
      if (!R()) { anchor.classList.remove('boing'); void anchor.offsetWidth; anchor.classList.add('boing'); }
    };
    let miruTap = null;
    if (rx && heroArt) {
      // ヒーローの立ち絵の上に、つつける範囲（button）を置く
      miruTap = document.createElement('button');
      miruTap.type = 'button'; miruTap.className = 'miru-tap';
      miruTap.setAttribute('aria-label', 'みるをつつく');
      const spot = room?.miru || { x: 74, y: 20, w: 24, h: 52 };
      place(miruTap, spot); placed.push([miruTap, spot]);
      heroArt.appendChild(miruTap);
      miruTap.addEventListener('click', () => {
        tapMiru(miruTap);
        const m = $('#hero-miru');
        if (m && !R()) { m.classList.remove('boing'); void m.offsetWidth; m.classList.add('boing'); }
      });
    }
    // キャラ欄の立ち絵（みる）もつつける
    if (rx) {
      const hookPortrait = () => {
        const p = $('.char-portrait-miru');
        if (!p || p.dataset.tap) return;
        p.dataset.tap = '1';
        p.setAttribute('role', 'button'); p.tabIndex = 0; p.setAttribute('aria-label', 'みるをつつく');
        p.classList.add('tappable');
        p.addEventListener('click', () => tapMiru(p));
        p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.click(); } });
      };
      hookPortrait();
    }

    // ================= P1-E 観察ノート =================
    const daily = pub(data.daily).filter(d => d.q);
    let notebook = null;
    const today = new Date();
    const dayNo = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 864e5);
    const openNotebook = () => {
      if (!notebook) return false;
      const seen = store.get('miru-note-seen');
      notebook.classList.remove('instant', 'quick', 'opening', 'opened');
      notebook.classList.add(R() ? 'instant' : seen ? 'quick' : 'opening');
      notebook.showModal();
      store.set('miru-note-seen', '1');
      // 演出が終わったら（または飛ばしたら）開いた状態に固定
      const done = () => { notebook.classList.add('opened'); };
      clearTimeout(notebook._t);
      notebook._t = setTimeout(done, R() ? 0 : seen ? 320 : 820);
      discover('card-01');
      return true;
    };
    if (daily.length) {
      const d = daily[dayNo % daily.length];
      const dateLabel = `${today.getFullYear()}.${pad(today.getMonth() + 1)}.${pad(today.getDate())}`;
      notebook = document.createElement('dialog');
      notebook.className = 'notebook'; notebook.setAttribute('aria-labelledby', 'nb-q');
      notebook.innerHTML = `<div class="nb-book">
        <div class="nb-page">
          <button type="button" class="nb-close" aria-label="ノートをとじる">×</button>
          <p class="label">TODAY'S なんで？ · ${dateLabel}</p>
          <h2 class="nb-q" id="nb-q">${esc(d.q)}</h2>
          ${d.image ? `<img class="nb-img" src="${esc(d.image)}" alt="" loading="lazy">` : ''}
          <p class="nb-a">${esc(d.a || '')}</p>
          ${PREVIEW && d.draft ? '<p><span class="draft-badge">仮置き・本人確認前</span></p>' : ''}
          ${cards.length ? '<p class="nb-cards">観察カード <b data-card-count>0</b> / <span data-card-total>0</span> <button type="button" class="nb-zukan">ずかんを見る</button></p>' : ''}
          <div class="nb-actions"><a class="btn nb-go" href="#profile">プロフィールへ</a></div>
        </div>
        <div class="nb-cover" aria-hidden="true"><span class="label">EARTH OBSERVATION NOTE</span><strong>観察ノート</strong><span class="nb-star">✦</span></div>
      </div>`;
      document.body.appendChild(notebook);
      // 演出中にどこかを押す／キーを押したら、すぐ開いた状態にする（スキップ）
      const skip = () => { if (!notebook.classList.contains('opened')) { clearTimeout(notebook._t); notebook.classList.add('opened'); return true; } return false; };
      notebook.addEventListener('click', e => {
        if (skip() && !e.target.closest('a, button')) return;
        if (e.target === notebook || e.target.closest('.nb-close')) notebook.close();
        if (e.target.closest('.nb-go')) notebook.close();
        if (e.target.closest('.nb-zukan')) { notebook.close(); openZukan(); }
      });
      notebook.addEventListener('keydown', e => { if (e.key !== 'Tab' && e.key !== 'Escape') skip(); });
      updateCounter();
      // 「観察ノートをひらく」を本当に開く（修飾キー付きのクリックは従来どおりリンクとして扱う）
      const cta = $('.hero-cta a.btn');
      cta?.addEventListener('click', e => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
        e.preventDefault();
        openNotebook();
      });
    }

    // ================= P1-F 時間帯・再訪 =================
    // 訪問回数：同じタブのセッション中は1回と数える
    let visits = +(store.get('miru-visits') || 0);
    if (!session.get('miru-visit-counted')) { visits += 1; store.set('miru-visits', String(visits)); session.set('miru-visit-counted', '1'); }
    const greet = live(data.greetings) ? data.greetings : null;
    const lead = $('.hero .lead');
    const renderGreeting = (band, n) => {
      if (!greet || !lead) return;
      let el = $('.hero .greet');
      if (!el) { el = document.createElement('p'); el.className = 'greet'; lead.after(el); }
      const hello = pick(greet[band]);
      const back = n >= 2 ? pick(greet.return).replace('{n}', n) : '';
      el.innerHTML = `${esc(hello)}${back ? `<span class="greet-back">${esc(back)}</span>` : ''}${PREVIEW ? '<span class="draft-badge">仮置き</span>' : ''}`;
      el.dataset.band = band;
    };
    renderGreeting(tod, visits);
    if (visits >= 2) discover('card-02');
    if (tod === 'night') discover('card-08');
    if (tod === 'morning') discover('card-09');

    // ================= P1-G 空状態 =================
    const empty = live(data.emptyStates) ? data.emptyStates : null;
    const sl = $('#schedule-list');
    if (empty?.schedule && sl && !sl.children.length) {
      const es = empty.schedule;
      $('#schedule').hidden = false; sl.hidden = false;
      sl.innerHTML = `<li class="sched-empty"><span class="se-stamp" aria-hidden="true">おやすみ</span><div><strong>${esc(es.title)}</strong><p>${esc(es.text)}</p>${es.link ? `<a href="${esc(es.link)}" target="_blank" rel="noopener">${esc(es.linkLabel || es.link)} <span class="ext" aria-hidden="true">↗</span><span class="sr-only">（新しいタブ）</span></a>` : ''}</div>${PREVIEW ? '<span class="draft-badge">仮置き</span>' : ''}</li>`;
    }

    // ================= P1-A 観察基地ヒーロー（部屋＋ホットスポット） =================
    const icon = {
      notebook: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="6" width="28" height="36" rx="3"/><path d="M16 6v36M21 16h12M21 22h12M21 28h8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
      radio: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="16" width="36" height="24" rx="5"/><circle cx="18" cy="28" r="6" fill="#fff"/><path d="M28 24h9M28 29h9M28 34h6M14 16 34 6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle class="lamp" cx="37" cy="20" r="2.2"/></svg>'
    };
    let petanEl = null;
    const actions = {
      openNotebook: () => { if (!openNotebook()) location.hash = '#profile'; },
      goMusic: spot => {
        const m = $('#music'); if (!m) return;
        m.scrollIntoView({ behavior: R() ? 'auto' : 'smooth', block: 'start' });
        const t = $('#track-list .track[aria-selected=true]') || $('#track-list .track');
        setTimeout(() => t?.focus({ preventScroll: true }), R() ? 0 : 500);
        if (spot.cardId) discover(spot.cardId);
      },
      findCard: (spot, el) => {
        if (petanEl?.classList.contains('sleeping')) { wakePetan(el); return; }
        discover(spot.cardId);
        say(el, pick(rx?.petan) || 'ぺたん！', { at: 0 });
        if (!R()) { petanEl?.classList.remove('hop'); void petanEl?.offsetWidth; petanEl?.classList.add('hop'); }
      }
    };
    const fire = (spot, el) => { (actions[spot.action] || (() => {}))(spot, el); };
    if (room && heroArt) {
      const hero = $('.hero');
      const img = room.image || {};
      if (img.pc || img.sp) {
        // 部屋の絵が届いたら、既存ヒーローのポラロイド等を隠して部屋を背景にする
        hero.classList.add('has-room');
        heroArt.insertAdjacentHTML('afterbegin', `<picture class="room-img">${img.sp ? `<source media="(max-width: 860px)" srcset="${esc(img.sp)}">` : ''}<img src="${esc(img.pc || img.sp)}" alt="${esc(img.alt || '')}" decoding="async" fetchpriority="high"></picture>`);
      } else hero.classList.add('room-placeholder');
      hero.classList.add('room-live');
      const spots = (room.hotspots || []).filter(s => s.id && actions[s.action]);
      spots.forEach(spot => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = `hs hs-${esc(spot.id)}`;
        b.setAttribute('aria-label', spot.label);
        const art = spot.id === 'petan' ? '<img src="assets/img/petan.png" alt="" class="hs-petan-img" decoding="async"><span class="zzz" aria-hidden="true">z<i>z</i><i>Z</i></span>'
          : (icon[spot.id] || '<span class="hs-dot" aria-hidden="true">✦</span>');
        b.innerHTML = `<span class="hs-art">${art}</span><span class="hs-label">${esc(spot.label)}</span>`;
        place(b, spot); placed.push([b, spot]);
        heroArt.appendChild(b);
        b.addEventListener('click', () => fire(spot, b));
        if (spot.id === 'petan') petanEl = b;
      });
      // スマホ：小道具が小さいので、画面下に「さわれるもの」一覧も出す
      if (spots.length) {
        const list = document.createElement('nav');
        list.className = 'touch-list'; list.setAttribute('aria-label', 'さわれるもの');
        list.innerHTML = `<p class="label">さわれるもの</p>${spots.map((s, i) => `<button type="button" data-i="${i}">${esc(s.label)}</button>`).join('')}`;
        ($('.hero-copy') || hero).appendChild(list);
        list.addEventListener('click', e => {
          const b = e.target.closest('button[data-i]'); if (!b) return;
          const s = spots[+b.dataset.i];
          const anchor = document.querySelector(`.hs-${CSS.escape(s.id)}`);
          fire(s, anchor && anchor.offsetParent ? anchor : b);
        });
      }
    }

    // ---- 放置でぺーたんが居眠り（P1-C） ----
    let lastInput = Date.now();
    const IDLE_MS = 12000;
    const markInput = () => { lastInput = Date.now(); };
    ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(t => addEventListener(t, markInput, { passive: true }));
    let petanSay = null;
    const sleepPetan = () => {
      if (!petanEl || petanEl.classList.contains('sleeping')) return;
      petanEl.classList.add('sleeping');
      petanEl.setAttribute('aria-label', 'ぺーたん（いねむり中）');
      if (!petanSay) { petanSay = document.createElement('span'); petanSay.className = 'petan-say'; petanEl.appendChild(petanSay); }
      petanSay.textContent = pick(rx?.idle) || 'zzz……';
    };
    function wakePetan(anchor) {
      if (!petanEl) return;
      petanEl.classList.remove('sleeping');
      petanEl.setAttribute('aria-label', 'ぺーたん');
      if (petanSay) petanSay.textContent = '';
      say(anchor || petanEl, pick(rx?.wake) || 'はっ！', { at: 0 });
      discover('card-11');
    }
    if (petanEl && rx) {
      setInterval(() => {
        if (document.hidden || Date.now() - lastInput < IDLE_MS) return;
        const r = petanEl.getBoundingClientRect();
        if (r.bottom > 0 && r.top < innerHeight) sleepPetan();
      }, 1000);
    }

    // ---- その他の発見の入口（P1-D） ----
    if (cards.length) {
      // フッターのお昼寝みるを10回つつく
      const art = $('.sleep-art');
      if (art && $('#sleep-img')) {
        const nap = document.createElement('button');
        nap.type = 'button'; nap.className = 'nap-tap'; nap.setAttribute('aria-label', 'お昼寝中のみるを、そっとつつく');
        art.appendChild(nap);
        let n = 0;
        nap.addEventListener('click', () => {
          n += 1;
          art.classList.remove('stir'); void art.offsetWidth; if (!R()) art.classList.add('stir');
          if (n === 10) { discover('card-05'); n = 0; }
        });
      }
      // ページ内の小さな「？」
      const g = $('#guideline .file');
      if (g) {
        const q = document.createElement('button');
        q.type = 'button'; q.className = 'secret-q'; q.setAttribute('aria-label', 'ちいさな「？」');
        q.innerHTML = '<span aria-hidden="true">？</span>';
        g.appendChild(q);
        q.addEventListener('click', () => { discover('card-07'); q.classList.add('found'); q.querySelector('span').textContent = '！'; });
      }
      // ひみつのことば：キーボードで miru と打つ
      let typed = '';
      addEventListener('keydown', e => {
        if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
        if (e.target.closest?.('input, textarea, [contenteditable]')) return;
        typed = (typed + e.key.toLowerCase()).slice(-8);
        if (typed.endsWith('miru')) { discover('card-06'); typed = ''; }
      });
      // ギャラリーのテーマを3つのぞく（既存の絞り込みはそのまま。クリックを横で聞くだけ）
      const seenCats = new Set();
      $('#filters')?.addEventListener('click', e => {
        const b = e.target.closest('button[data-cat]'); if (!b || b.dataset.cat === 'すべて') return;
        seenCats.add(b.dataset.cat);
        if (seenCats.size >= 3) discover('card-12');
      });
    }

    // ================= プレビュー表示中の札・?debug=1 パネル =================
    if (PREVIEW && (rx || room || greet || cards.length || daily.length)) {
      const chip = document.createElement('p');
      chip.className = 'preview-chip';
      chip.textContent = '仮置きの演出を表示中（本番では非表示）';
      document.body.appendChild(chip);
    }
    if (DEBUG) {
      const panel = document.createElement('details');
      panel.className = 'dbg';
      const bands = ['morning', 'day', 'evening', 'night'];
      const url = band => { const u = new URL(location.href); u.searchParams.set('debug', '1'); u.searchParams.set('tod', band); return u.pathname + u.search; };
      panel.innerHTML = `<summary>debug</summary>
        <p>時間帯：<b>${esc(tod)}</b> / 訪問：<b>${visits}</b>回 / カード：<b data-card-count>0</b>/<span data-card-total>0</span></p>
        <p>${bands.map(b => `<a href="${url(b)}">${b}</a>`).join(' ')}</p>
        <p><button type="button" data-dbg="return">再訪メッセージ（3回目）</button><button type="button" data-dbg="note">ノート</button><button type="button" data-dbg="sleep">ぺーたん居眠り</button><button type="button" data-dbg="tap">みる反応</button><button type="button" data-dbg="zukan">ずかん</button></p>
        <p>${cards.map(c => `<button type="button" data-card="${esc(c.id)}">${pad(c.no)}</button>`).join('')}</p>
        <p><button type="button" data-dbg="all">全カード</button><button type="button" data-dbg="reset">カード・訪問回数をリセット</button></p>`;
      document.body.appendChild(panel);
      updateCounter();
      panel.addEventListener('click', e => {
        const c = e.target.closest('[data-card]'); if (c) { discover(c.dataset.card); return; }
        const k = e.target.closest('[data-dbg]')?.dataset.dbg;
        if (k === 'return') renderGreeting(tod, 3);
        else if (k === 'note') openNotebook();
        else if (k === 'sleep') { if (petanEl) { lastInput = 0; sleepPetan(); petanEl.scrollIntoView({ block: 'center' }); } else toast('ぺーたん（room）がありません'); }
        else if (k === 'tap') { if (miruTap) miruTap.click(); else toast('reactions が無効です'); }
        else if (k === 'zukan') openZukan();
        else if (k === 'all') cards.forEach(x => discover(x.id));
        else if (k === 'reset') { store.del(CARD_KEY); store.del('miru-visits'); store.del('miru-note-seen'); found.clear(); updateCounter(); toast('リセットしました'); }
      });
    }
    window.miruPlay = { discover, openNotebook, openZukan, say, burstAt };
  };
  const boot = () => setTimeout(start, 0); // app.js の描画が最後まで終わってから
  if (window.miruSite) boot(); else document.addEventListener('miru:ready', boot, { once: true });
})();
