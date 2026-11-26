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
  const imgSrc = (item, w) => item.drive ? driveImg(item.drive, w) : item.src;
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
    return `<div class="video"><div class="frame" style="background-image:url('${esc(v.poster || '')}')">${frame}</div><p>${esc(v.title)}<small>${esc(v.note)}</small></p></div>`;
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

  $('#link-list').innerHTML = data.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener"><strong>${esc(l.label)}</strong><span>${esc(l.sub)}</span></a>`).join('');

  const g = data.guideline;
  $('#guide-ok').innerHTML = g.ok.map(x => `<li>${esc(x)}</li>`).join('');
  $('#guide-ng').innerHTML = g.ng.map(x => `<li>${esc(x)}</li>`).join('');
  $('#contact').textContent = g.contact ? `お問い合わせ：${g.contact}` : 'ご相談は X の DM までどうぞ。';
})();
