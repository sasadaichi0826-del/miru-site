// 星麦みる 公式サイト：data/site.json を読み込んで描画する
(async () => {
  const data = await fetch('data/site.json', { cache: 'no-cache' }).then(r => r.json());
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const get = path => path.split('.').reduce((o, k) => o?.[k], data);

  // Googleドライブの共有リンク or ファイルID → ID
  const driveId = v => {
    if (!v) return '';
    const m = String(v).match(/\/d\/([\w-]+)|[?&]id=([\w-]+)/);
    return m ? (m[1] || m[2]) : String(v).trim();
  };
  const driveImg = (v, w = 1600) => `https://drive.google.com/thumbnail?id=${driveId(v)}&sz=w${w}`;
  const driveVideo = v => `https://drive.google.com/file/d/${driveId(v)}/preview`;
  const imgSrc = (item, w) => w <= 800 && item.thumb ? item.thumb : item.drive ? driveImg(item.drive, w) : item.src;
  const fmtDate = d => d ? d.replaceAll('-', '.') : '';
  const link = (url, inner) => url ? `<a href="${esc(url)}"${url.startsWith('#') ? '' : ' target="_blank" rel="noopener"'}>${inner}</a>` : inner;

  document.querySelectorAll('[data-bind]').forEach(el => el.textContent = get(el.dataset.bind));

  const p = data.profile;
  $('#hero-name').innerHTML = `${esc(p.name.slice(0, 2))}<span>${esc(p.name.slice(2))}</span>`;
  const t = p.tagline;
  $('#tagline').innerHTML = t.slice(0, -1).map(esc).join('<br>') + `<br><em>${esc(t.at(-1))}</em>`;
  $('#hero-img').src = imgSrc(p.heroImage, 1400);
  $('#hero-img').alt = p.heroImage.alt;
  $('#facts').innerHTML = p.facts.map(f => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('');

  const news = [...data.news].sort((a, b) => b.date.localeCompare(a.date));
  $('#news-list').innerHTML = news.map(n => `<li><time>${fmtDate(n.date)}</time><div><span class="tag">${esc(n.tag)}</span>${link(n.url, esc(n.title))}</div>${n.body ? `<p>${esc(n.body)}</p>` : ''}</li>`).join('');

  const today = new Date().toISOString().slice(0, 10);
  const sched = data.schedule.filter(s => s.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  $('#schedule-list').innerHTML = sched.length
    ? sched.map(s => `<li><time>${fmtDate(s.date)} ${esc(s.time)}</time><div>${link(s.url, esc(s.title))}</div><p>${esc(s.platform)}</p></li>`).join('')
    : '<li class="empty">いまは予定がありません。X でおしらせします。</li>';

  $('#video-list').innerHTML = data.videos.map(v => {
    let frame;
    if (v.youtube) frame = `<iframe src="https://www.youtube-nocookie.com/embed/${esc(v.youtube)}" title="${esc(v.title)}" allowfullscreen loading="lazy"></iframe>`;
    else if (v.drive) frame = `<iframe src="${driveVideo(v.drive)}" title="${esc(v.title)}" allow="autoplay" allowfullscreen loading="lazy"></iframe>`;
    else frame = '';
    if (!frame) frame = '<span class="soon">動画は もうすぐ とどきます</span>';
    return `<div class="video"><div class="frame" style="background-image:url('${esc(v.poster || '')}')">${frame}</div><p>${esc(v.title)}<small>${esc(v.note)}</small></p>${v.credit ? `<p class="credit">${esc(v.credit)}</p>` : ''}</div>`;
  }).join('');

  const cats = ['すべて', ...new Set(data.gallery.map(g => g.category))];
  const renderGallery = cat => {
    $('#gallery-list').innerHTML = data.gallery.filter(g => cat === 'すべて' || g.category === cat).map(g =>
      `<figure data-full="${esc(imgSrc(g, 2000))}" data-title="${esc(g.title)}"><img src="${esc(imgSrc(g, 800))}" alt="${esc(g.title)}" loading="lazy" referrerpolicy="no-referrer"><figcaption>${esc(g.title)}</figcaption></figure>`).join('');
    document.querySelectorAll('#filters button').forEach(b => b.setAttribute('aria-pressed', b.textContent === cat));
  };
  $('#filters').innerHTML = cats.length > 2 ? cats.map(c => `<button type="button">${esc(c)}</button>`).join('') : '';
  $('#filters').addEventListener('click', e => e.target.matches('button') && renderGallery(e.target.textContent));
  renderGallery('すべて');

  const box = $('#lightbox');
  $('#gallery-list').addEventListener('click', e => {
    const f = e.target.closest('figure'); if (!f) return;
    box.querySelector('img').src = f.dataset.full;
    box.querySelector('img').alt = f.dataset.title;
    box.querySelector('p').textContent = f.dataset.title;
    box.showModal();
  });
  box.addEventListener('click', e => (e.target === box || e.target.matches('.close')) && box.close());

  // 音楽
  $('#track-list').innerHTML = (data.music || []).map((m, i) =>
    `<a class="track tone-${i % 4}" href="${esc(m.url)}" target="_blank" rel="noopener"><span class="no">${String(i + 1).padStart(2, '0')}</span><strong>${esc(m.title)}</strong><small>${esc(m.genre)}</small><span class="play" aria-hidden="true">▶</span></a>`).join('');

  // 物語
  const st = data.story;
  if (st) {
    $('#story-img').src = imgSrc({ src: st.image, drive: st.drive }, 1200);
    $('#story-title').textContent = st.title;
    $('#story-catch').textContent = st.catch;
    $('#story-lead').textContent = st.lead;
    $('#story-desc').textContent = st.description;
    $('#episode-list').innerHTML = st.episodes.map(e => `<li><a href="${esc(e.url)}" target="_blank" rel="noopener"><span>第${e.n}話</span>${esc(e.title)}</a></li>`).join('');
    $('#story-more').href = st.magazineUrl;
  }

  // 制作ノート
  $('#note-list').innerHTML = (data.notes || []).map(n =>
    `<a class="note" href="${esc(n.url)}" target="_blank" rel="noopener"><strong>${esc(n.title)}</strong><p>${esc(n.body)}</p><small>${esc(n.credit)}</small><span class="go">noteで読む ↗</span></a>`).join('');

  // リンク（アイコン付きのぷくぷくカード）
  const icons = {
    youtube: '<svg viewBox="0 0 24 24"><path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8ZM10 15V9l5.2 3Z"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L2 3h6.4l4.4 5.8Zm-1.1 16.2h1.7L7.4 4.7H5.5Z"/></svg>',
    note: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6Zm8 1.5V8h3.5M8.5 11h8M8.5 14h8M8.5 17h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    music: '<svg viewBox="0 0 24 24"><path d="M9 18.5a2.5 2.5 0 1 1-2.5-2.5c.5 0 1 .1 1.5.4V5l11-2v12.5a2.5 2.5 0 1 1-2.5-2.5c.5 0 1 .1 1.5.4V6.4L9 8Z"/></svg>',
    stamp: '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16l-5.4 3 1.2-6-4.5-4.2 6.1-.7Z"/></svg>'
  };
  const sparkles = '<i class="sp s1">✦</i><i class="sp s2">✧</i><i class="sp s3">♡</i>';
  $('#link-list').innerHTML = data.links.map((l, i) =>
    `<a class="lk lk-${i % 5}" href="${esc(l.url)}" target="_blank" rel="noopener" style="--d:${i * 0.4}s">
      <span class="ic">${icons[l.icon] || icons.stamp}</span>
      <span class="tx"><strong>${esc(l.label)}</strong><span>${esc(l.sub)}</span></span>
      <span class="go" aria-hidden="true">→</span>${sparkles}</a>`).join('');

  $('#footer').textContent = data.footer || '© 星麦みる';

  const g = data.guideline;
  $('#guide-ok').innerHTML = g.ok.map(x => `<li>${esc(x)}</li>`).join('');
  $('#guide-ng').innerHTML = g.ng.map(x => `<li>${esc(x)}</li>`).join('');
  $('#contact').textContent = g.contact ? `お問い合わせ：${g.contact}` : 'ご相談は X の DM までどうぞ。';
})();
