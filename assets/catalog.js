// ギャラリー・音楽室の一覧。トップと同じJSONを参照する。
(async () => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const status = $('#catalog-status');
  try {
    const response = await fetch('data/site.json', {cache:'no-cache'});
    if (!response.ok) throw new Error('catalog unavailable');
    const data = await response.json();
    if (document.body.dataset.catalog === 'music') {
      const tracks = data.music || [];
      $('#track-list').innerHTML = tracks.map((m,i) => `<a class="track tone-${i%4}" href="${esc(m.url)}" target="_blank" rel="noopener">${m.jacket ? `<img class="jk" src="${esc(m.jacket)}" alt="" loading="lazy">` : `<span class="no">${String(i+1).padStart(2,'0')}</span>`}<strong>${esc(m.title)}</strong><small>${esc(m.genre)}</small><span class="play ext" aria-hidden="true">↗</span><span class="sr-only">（Suno で開く・新しいタブ）</span></a>`).join('');
      status.textContent = `全${tracks.length}曲`;
    } else {
      const items = data.gallery || [];
      const categories = ['すべて', ...new Set(items.map(g => g.category))];
      const image = (g,w) => {
        if (w <= 800 && g.thumb) return g.thumb;
        if (!g.drive) return g.src || g.thumb;
        const match = String(g.drive).match(/\/d\/([\w-]+)|[?&]id=([\w-]+)/);
        return `https://drive.google.com/thumbnail?id=${match ? match[1] || match[2] : g.drive}&sz=w${w}`;
      };
      const render = category => {
        const filtered = items.filter(g => category === 'すべて' || g.category === category);
        $('#gallery-list').innerHTML = filtered.map(g => `<figure role="button" tabindex="0" aria-label="${esc(g.title)}を拡大する" data-full="${esc(image(g,2000))}" data-title="${esc(g.title)}"><img src="${esc(image(g,800))}" alt="${esc(g.title)}" loading="lazy"><figcaption>${esc(g.title)}</figcaption></figure>`).join('');
        document.querySelectorAll('#filters button').forEach(b => b.setAttribute('aria-pressed',b.textContent === category));
        status.textContent = category === 'すべて' ? `全${items.length}点` : `${category} / ${filtered.length}点`;
      };
      $('#filters').innerHTML = categories.map(c => `<button type="button">${esc(c)}</button>`).join('');
      $('#filters').addEventListener('click', e => {if(e.target.matches('button')) render(e.target.textContent);});
      const box = $('#lightbox');
      let opener;
      const open = figure => {
        opener = figure;
        box.querySelector('img').src = figure.dataset.full;
        box.querySelector('img').alt = figure.dataset.title;
        box.querySelector('p').textContent = figure.dataset.title;
        box.showModal();
      };
      $('#gallery-list').addEventListener('click', e => {const figure=e.target.closest('figure');if(figure) open(figure);});
      $('#gallery-list').addEventListener('keydown', e => {if(e.key==='Enter'||e.key===' '){const figure=e.target.closest('figure');if(figure){e.preventDefault();open(figure);}}});
      box.addEventListener('click', e => {if(e.target===box||e.target.matches('.close')) box.close();});
      box.addEventListener('close', () => opener?.focus());
      // トップから ?cat=カテゴリ名 で来たら、その絞り込みで開く（無効値・未指定は「すべて」）
      const want = new URLSearchParams(location.search).get('cat');
      render(want && categories.includes(want) ? want : 'すべて');
    }
    $('#footer')?.replaceChildren(document.createTextNode(data.footer || '© HOSHIMUGI MIRU'));
  } catch {
    status.textContent = '読み込めませんでした。少し待ってからページを再読み込みしてください。';
  }
})();
