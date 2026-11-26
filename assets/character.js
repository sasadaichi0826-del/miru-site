// 星麦みる 公式サイト：CHARACTER（みる／つきみ）と、その周辺の小セクション
// すべて data/site.json から描画する。値が null / 空のブロックは描画しない（指示書 §2.2）。
// 仮置きの文案は "draft": true を付け、本番では表示しない（公開前に本人確認を通すため）。
(() => {
  const start = () => {
    const { openLightbox, imgSrc, data } = window.miruSite;
    const $ = s => document.querySelector(s);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const has = v => v !== null && v !== undefined && v !== '';
    // 仮置き文案は本番で出さない。?draft=1 を付けたときだけ「仮置き」札付きで確認できる
    const preview = new URLSearchParams(location.search).has('draft');
    const isDraft = o => !preview && o && o.draft === true;
    const badge = o => (preview && o && o.draft === true) ? '<span class="draft-badge">仮置き・本人確認前</span>' : '';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const chars = data.characters || [];
    const G = data.gallery || [];
    const byId = id => G.find(g => g.id === id);
    const UNKNOWN = '観察中（未確認）';
    const TAG_KEYS = ['tagGeneral', 'tagStream', 'tagArt'];

    // ================= P0-1 CHARACTER =================
    const sec = $('#profile');
    const tabs = $('#char-tabs');
    const panels = $('#char-panels');
    if (sec && tabs && panels && chars.length) {
      const dataRows = c => (c.data || []).filter(r => r.value !== '').map(r => {
        let dd;
        if (r.value === null || r.value === undefined) dd = `<dd class="unknown">${UNKNOWN}</dd>`;
        else {
          const copy = TAG_KEYS.includes(r.key) ? `<button type="button" class="copy-tag" data-copy="${esc(r.value)}" aria-label="${esc(r.value)} をコピー">コピー</button>` : '';
          dd = `<dd><span class="v">${esc(r.value)}</span>${copy}${r.note ? `<small>${esc(r.note)}</small>` : ''}</dd>`;
        }
        return `<div class="row"><dt>${esc(r.label)}</dt>${dd}</div>`;
      }).join('');

      // P1-1 立ち絵ビューア（衣装は gallery の id を参照。二重管理しない）
      const costumes = c => (c.costumeIds || []).map(byId).filter(Boolean);
      const viewer = c => {
        const list = costumes(c);
        if (!list.length) return '';
        return `<div class="costume" data-char="${esc(c.id)}">
          <button type="button" class="costume-main" aria-label="${esc(list[0].title)} を拡大する"><img src="${esc(imgSrc(list[0], 800))}" alt="${esc(list[0].alt || list[0].title)}" loading="lazy" referrerpolicy="no-referrer"></button>
          <p class="costume-name">${esc(list[0].title)}</p>
          <div class="costume-thumbs" role="group" aria-label="衣装を選ぶ">${list.map((g, i) => `<button type="button" data-i="${i}" aria-pressed="${i === 0}" aria-label="${esc(g.title)}"><img src="${esc(imgSrc(g, 240))}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join('')}</div>
        </div>`;
      };

      // P1-2 ボイス（<audio preload="none"> を再生ボタンから操作）
      const voices = c => {
        const v = (c.voices || []).filter(x => x && x.src && !isDraft(x));
        if (!v.length) return '';
        return `<div class="voices"><h4 class="char-sub"><span class="label">VOICE</span>ボイス</h4><ul>${v.map(x => `<li><button type="button" class="voice-btn" aria-pressed="false"><span class="vi" aria-hidden="true">▶</span>${esc(x.label)}</button><audio preload="none" src="${esc(x.src)}"></audio></li>`).join('')}</ul></div>`;
      };

      // P1-4 ロア「地球観察ノート」（FICTION とは別物）
      const lore = c => {
        const items = (data.lore || []).filter(l => !isDraft(l) && has(l.title) && has(l.body) && (!l.character || l.character === c.id));
        if (!items.length) return '';
        return `<div class="lore"><h4 class="char-sub"><span class="label">EARTH NOTES</span>地球観察ノート</h4><p class="lore-note">これは物語ではなく、日常の観察記録です。</p>${items.map(l => `<details><summary>${esc(l.title)}${badge(l)}</summary><p>${esc(l.body)}</p></details>`).join('')}</div>`;
      };

      tabs.innerHTML = chars.map((c, i) => `<button type="button" role="tab" id="tab-${esc(c.id)}" aria-controls="panel-${esc(c.id)}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-id="${esc(c.id)}"><small>${esc(c.fileNo)}</small><span class="char-name">${esc(c.name)}</span></button>`).join('');
      panels.innerHTML = chars.map((c, i) => {
        const portrait = c.portrait && has(c.portrait.src);
        const side = portrait || costumes(c).length;
        return `<div class="char-panel${side ? '' : ' no-portrait'}" role="tabpanel" id="panel-${esc(c.id)}" aria-labelledby="tab-${esc(c.id)}" tabindex="0"${i === 0 ? '' : ' hidden'}>
          ${side ? `<div class="char-side">${portrait ? `<img class="char-portrait" src="${esc(c.portrait.src)}" alt="${esc(c.portrait.alt)}" loading="lazy">` : ''}${viewer(c)}</div>` : ''}
          <div class="file char-file">
            <span class="tape t1" aria-hidden="true"></span>
            <div class="file-head"><span>OBSERVER FILE</span><span>No. ${esc(c.fileNo)}</span></div>
            <h3 class="char-name char-title">${esc(c.name)}<small>${esc(c.nameEn)}</small></h3>
            ${has(c.role) ? `<p class="char-role">${esc(c.role)}</p>` : ''}
            ${has(c.lead) ? `<p class="char-lead">${esc(c.lead)}</p>` : ''}
            ${has(c.about) ? `<p class="file-about">${esc(c.about)}</p>` : ''}
            <h4 class="char-sub"><span class="label">DATA</span>データ</h4>
            <dl class="char-data">${dataRows(c)}</dl>
            ${voices(c)}
            ${lore(c)}
          </div>
        </div>`;
      }).join('');

      const ids = chars.map(c => c.id);
      const select = (id, focus) => {
        if (!ids.includes(id)) id = ids[0];
        sec.dataset.character = id;
        tabs.querySelectorAll('[role=tab]').forEach(t => {
          const on = t.dataset.id === id;
          t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
          if (on && focus) t.focus();
        });
        panels.querySelectorAll('[role=tabpanel]').forEach(p => {
          const on = p.id === `panel-${id}`;
          if (on) { p.hidden = false; if (!reduced) { p.classList.remove('fade'); void p.offsetWidth; p.classList.add('fade'); } }
          else p.hidden = true;
        });
        panels.querySelectorAll('audio').forEach(a => a.pause());
      };
      tabs.addEventListener('click', e => {
        const t = e.target.closest('[role=tab]'); if (!t) return;
        select(t.dataset.id);
        history.replaceState(null, '', t.dataset.id === ids[0] ? '#profile' : `#profile/${t.dataset.id}`);
      });
      tabs.addEventListener('keydown', e => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        const cur = ids.indexOf(sec.dataset.character);
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? ids.length - 1 : (cur + (e.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length;
        select(ids[next], true);
      });
      // #profile/tsukimi で開いたらつきみを初期表示
      const fromHash = () => {
        const m = location.hash.match(/^#profile\/([\w-]+)/);
        if (m) {
          select(m[1]);
          // 画像の読み込みで位置がずれるので、少し待ってからもう一度合わせる
          const go = () => sec.scrollIntoView({ block: 'start' });
          requestAnimationFrame(go); setTimeout(go, 400); addEventListener('load', go, { once: true });
        }
      };
      fromHash();
      addEventListener('hashchange', fromHash);

      // タグのコピー
      panels.addEventListener('click', async e => {
        const b = e.target.closest('.copy-tag'); if (!b) return;
        try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'コピーしました'; }
        catch { b.textContent = 'コピーできませんでした'; }
        setTimeout(() => { b.textContent = 'コピー'; }, 1600);
      });

      // 立ち絵ビューア：サムネイルで切替、メインで拡大（既存ライトボックスを流用）
      panels.addEventListener('click', e => {
        const box = e.target.closest('.costume'); if (!box) return;
        const c = chars.find(x => x.id === box.dataset.char);
        const list = costumes(c);
        const main = box.querySelector('.costume-main');
        const th = e.target.closest('.costume-thumbs button');
        if (th) {
          const i = +th.dataset.i, g = list[i], im = main.querySelector('img');
          box.querySelectorAll('.costume-thumbs button').forEach(b => b.setAttribute('aria-pressed', b === th));
          main.dataset.i = i;
          const swap = () => { im.src = imgSrc(g, 800); im.alt = g.alt || g.title; box.querySelector('.costume-name').textContent = g.title; main.setAttribute('aria-label', `${g.title} を拡大する`); im.classList.remove('out'); };
          if (reduced) swap(); else { im.classList.add('out'); setTimeout(swap, 220); }
          return;
        }
        if (e.target.closest('.costume-main')) openLightbox(list, +(main.dataset.i || 0));
      });

      // ボイス：同時再生しない
      panels.addEventListener('click', e => {
        const b = e.target.closest('.voice-btn'); if (!b) return;
        const a = b.nextElementSibling;
        const playing = !a.paused;
        document.querySelectorAll('audio').forEach(x => { if (x !== a) { x.pause(); x.currentTime = 0; } });
        if (playing) { a.pause(); a.currentTime = 0; } else a.play().catch(() => {});
      });
      document.addEventListener('play', e => { if (e.target.closest?.('.voices')) setVoiceState(); }, true);
      document.addEventListener('pause', e => { if (e.target.closest?.('.voices')) setVoiceState(); }, true);
      document.addEventListener('ended', e => { if (e.target.closest?.('.voices')) setVoiceState(); }, true);
      function setVoiceState() {
        panels.querySelectorAll('.voice-btn').forEach(b => {
          const on = !b.nextElementSibling.paused;
          b.setAttribute('aria-pressed', on); b.querySelector('.vi').textContent = on ? '❚❚' : '▶';
        });
      }
    }

    // ================= P1-3 RELATION =================
    const rel = data.relationship;
    const relSec = $('#relation');
    if (relSec) {
      const qa = (rel?.qa || []).filter(x => !isDraft(x) && has(x.q) && has(x.a));
      const img = rel?.image && (has(rel.image.src) || has(rel.image.drive) || has(rel.image.thumb)) ? rel.image : null;
      const copyOk = rel && has(rel.copy) && !isDraft({ draft: rel.copyDraft });
      // 文章（コピーか Q&A）が1つも公開できない間は、写真だけの枠を出さずにセクションごと外す
      if (!rel || (!copyOk && !qa.length)) relSec.remove();
      else {
        const nameOf = id => chars.find(c => c.id === id)?.name || id;
        relSec.querySelector('.rel-body').innerHTML = `
          ${img ? `<figure class="rel-photo taped"><span class="tape t1" aria-hidden="true"></span><img src="${esc(imgSrc(img, 800))}" alt="${esc(img.alt)}" loading="lazy" referrerpolicy="no-referrer"></figure>` : ''}
          <div class="rel-text">
            ${copyOk ? `<p class="rel-copy">${esc(rel.copy)}${badge({ draft: rel.copyDraft })}</p>` : ''}
            ${qa.length ? `<div class="rel-qa">${qa.map(x => `<div class="say from-${esc(x.from)}"><p class="who">${esc(nameOf(x.from))}${badge(x)}</p><p class="q">${esc(x.q)}</p><p class="a">${esc(x.a)}</p></div>`).join('')}</div>` : ''}
          </div>`;
        if (img) relSec.querySelector('.rel-photo').addEventListener('click', () => openLightbox([{ ...img, title: rel.copy || '' }], 0));
      }
    }

    // ================= P0-2 GUIDELINE のタグ（正本は characters[].data） =================
    const tagList = [];
    chars.forEach(c => (c.data || []).forEach(r => { if (TAG_KEYS.includes(r.key) && has(r.value)) tagList.push({ c, r }); }));
    const gTarget = $('#guide-tags');
    if (gTarget) {
      if (tagList.length) {
        gTarget.innerHTML = tagList.map(({ c, r }) => `<span class="gtag"><small>${esc(c.name)}・${esc(r.label)}</small>${esc(r.value)}</span>`).join('');
        gTarget.hidden = false;
      } else gTarget.remove();
    }

    // ================= P0-3 はじめましての方へ =================
    const intro = data.intro;
    const iTarget = $('#intro');
    if (iTarget) {
      const v = intro && (data.videos || []).find(x => x.title === intro.videoTitle);
      if (!intro || !v) iTarget.remove();
      else {
        const song = has(intro.songTitle) ? (data.music || []).find(m => m.title === intro.songTitle) : null;
        const stream = tagList.filter(t => t.r.key === 'tagStream').map(t => t.r.value);
        iTarget.innerHTML = `<div class="intro-inner">
          <div class="intro-head"><p class="label">FIRST TIME?</p><h2 class="intro-title">${esc(intro.heading)}</h2>${has(intro.note) ? `<p class="sec-lead">${esc(intro.note)}</p>` : ''}</div>
          <a class="intro-card intro-video" href="#videos"><span class="ic-img" style="background-image:url('${esc(v.poster || '')}')"><span class="play" aria-hidden="true">▶</span></span><span class="ic-tx"><small>まずはこの1本</small><strong>${esc(v.title)}</strong></span></a>
          <a class="intro-card intro-song" href="${esc(intro.songAnchor || '#music')}" data-song="${esc(song?.title || '')}">${song?.jacket ? `<span class="ic-img" style="background-image:url('${esc(song.jacket)}')"></span>` : '<span class="ic-img ic-music" aria-hidden="true">♪</span>'}<span class="ic-tx"><small>${song ? '代表曲' : '音楽室'}</small><strong>${song ? esc(song.title) : `${(data.music || []).length}曲を聴いてみる`}</strong></span></a>
          ${stream.length ? `<p class="intro-tag">配信タグ：${stream.map(esc).join(' / ')}</p>` : ''}
        </div>`;
        iTarget.querySelector('.intro-song').addEventListener('click', e => {
          const t = e.currentTarget.dataset.song; if (!t) return;
          const btn = [...document.querySelectorAll('#track-list .track')].find(b => b.querySelector('strong')?.textContent === t);
          btn?.click();
        });
      }
    }

    // ================= P2-4 記念日カウントダウン =================
    const evTarget = $('#countdown');
    if (evTarget) {
      const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const evs = (data.events || []).filter(e => Number.isInteger(e.month) && Number.isInteger(e.day)).map(e => {
        let d = new Date(today.getFullYear(), e.month - 1, e.day);
        if (d < today) d = new Date(today.getFullYear() + 1, e.month - 1, e.day);
        return { ...e, days: Math.round((d - today) / 864e5) };
      }).sort((a, b) => a.days - b.days);
      if (!evs.length) evTarget.remove();
      else {
        evTarget.innerHTML = evs.slice(0, 2).map(e => `<p class="cd${e.days === 0 ? ' today' : ''}"><small>${esc(e.label)}</small>${e.days === 0 ? '<strong>きょう！</strong>' : `あと<strong>${e.days}</strong>日`}</p>`).join('');
        evTarget.hidden = false;
      }
    }

    // ================= P2-5 きょうの観察 =================
    const obs = (data.observations || []).filter(has);
    const oTarget = $('#today-obs');
    if (oTarget) {
      if (!obs.length) oTarget.remove();
      else {
        let last = -1;
        const draw = () => {
          let i; do { i = Math.floor(Math.random() * obs.length); } while (obs.length > 1 && i === last);
          last = i; oTarget.querySelector('.to-text').textContent = obs[i];
        };
        oTarget.hidden = false;
        draw();
        oTarget.querySelector('.to-more').addEventListener('click', draw);
      }
    }

    // ================= P3-1 FAQ =================
    const fTarget = $('#faq');
    if (fTarget) {
      const items = (data.faq || []).filter(f => !isDraft(f) && has(f.q) && has(f.a));
      if (!items.length) fTarget.remove();
      else fTarget.querySelector('.faq-list').innerHTML = items.map(f => `<details><summary>${esc(f.q)}${badge(f)}</summary><p>${esc(f.a)}</p></details>`).join('');
    }

    // ================= P2-1 フォント =================
    // しゅわ丸：アクセント見出しのうち、全文字が収録されているものだけに当てる（書体の混在を出さない）
    const SHUWA = new Set(window.SHUWA_CHARS || '');
    const covered = t => { const s = t.replace(/\s/g, ''); return s.length > 0 && [...s].every(c => SHUWA.has(c)); };
    const applyShuwa = () => {
      if (!SHUWA.size) return;
      document.querySelectorAll('.logotype, main h2, .char-title, .char-tabs .char-name, .il-line, .intro-title, .rel-copy').forEach(el => {
        if (el.dataset.shuwa) return;
        const text = [...el.childNodes].filter(n => n.nodeType === 3 || !n.matches?.('small, .draft-badge')).map(n => n.textContent).join('');
        el.dataset.shuwa = covered(text) ? 'on' : 'off';
        if (el.dataset.shuwa === 'on') el.classList.add('font-shuwa');
      });
    };
    applyShuwa();
    setTimeout(applyShuwa, 1500); // 合間帯（wall.js）が後から入るため
    addEventListener('load', applyShuwa, { once: true });

    // つきみ側の明朝：名前・見出しに使う文字だけを Google Fonts から読み込む
    const tsu = chars.find(c => c.theme?.headingFont === 'mincho');
    if (tsu) {
      const text = new Set([...`${tsu.name}${tsu.nameEn}キャラクター${(data.relationship?.qa || []).map(x => x.q).join('')}`]);
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@400;700&display=swap&text=${encodeURIComponent([...text].join(''))}`;
      document.head.appendChild(link);
    }

    // 空で外れたセクションがあっても、見出しの星座番号は連番にする
    document.querySelectorAll('main .obs[data-no]').forEach((s, i) => { s.dataset.no = String(i + 1).padStart(2, '0'); });
  };
  if (window.miruSite) start(); else document.addEventListener('miru:ready', start, { once: true });
})();
