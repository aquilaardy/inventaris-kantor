/* Inventaris Kantor: pengelolaan aset & ATK. Data disimpan di browser (localStorage). */
const KEY = 'inventaris_kantor_v1', $ = s => document.querySelector(s);
const LOCS = ['Ruang Direksi', 'Ruang Keuangan', 'Ruang IT', 'Ruang Rapat', 'Gudang'];
const KATS = ['Elektronik', 'Furnitur', 'Peralatan', 'Kendaraan'];
const KOND = ['Baik', 'Rusak Ringan', 'Rusak Berat', 'Hilang'];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = t => new Date(t).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fd = e => Object.fromEntries(new FormData(e.target));

/* ---------- Data ---------- */
function seed() {
  const A = [
    ['Laptop Dell Latitude 5440', 'Elektronik', 'Ruang IT', 'Rina Putri', 'Baik', 2023],
    ['Printer HP LaserJet', 'Elektronik', 'Ruang Keuangan', 'Budi Santoso', 'Rusak Ringan', 2021],
    ['Proyektor Epson EB-X06', 'Elektronik', 'Ruang Rapat', '', 'Baik', 2022],
    ['Meja Kerja Direktur', 'Furnitur', 'Ruang Direksi', 'Hendra Wijaya', 'Baik', 2020],
    ['Kursi Ergonomis', 'Furnitur', 'Ruang Keuangan', 'Sari Dewi', 'Baik', 2022],
    ['AC Daikin 1 PK', 'Peralatan', 'Ruang Rapat', '', 'Rusak Berat', 2019],
    ['Laptop Lenovo ThinkPad', 'Elektronik', 'Ruang Keuangan', 'Andi Pratama', 'Baik', 2024],
    ['Lemari Arsip Besi', 'Furnitur', 'Gudang', '', 'Baik', 2018],
    ['Mesin Fotokopi Canon', 'Peralatan', 'Gudang', '', 'Rusak Ringan', 2020],
    ['Monitor LG 24 inci', 'Elektronik', 'Ruang IT', 'Rina Putri', 'Baik', 2023]
  ];
  const assets = A.map((a, i) => ({ id: i + 1, code: 'AST-2026-' + String(i + 1).padStart(4, '0'), nama: a[0], kat: a[1], loc: a[2], pemegang: a[3], kond: a[4], thn: a[5] }));
  const atk = [
    ['Kertas A4 80 gr', 'rim', 4, 10, 40], ['Pulpen hitam', 'pcs', 120, 50, 200], ['Spidol whiteboard', 'pcs', 8, 10, 40],
    ['Map folder', 'pcs', 85, 30, 100], ['Isi staples', 'box', 60, 10, 30], ['Tinta printer', 'botol', 6, 4, 12], ['Sticky notes', 'pack', 25, 10, 40]
  ].map((x, i) => ({ id: i + 1, nama: x[0], unit: x[1], stock: x[2], min: x[3], max: x[4] }));
  const d = n => new Date(Date.now() - n * 864e5).toISOString();
  const log = [
    { t: d(1), type: 'Kondisi', ref: 'AST-2026-0006', text: 'Baik → Rusak Berat (kompresor tidak berfungsi)' },
    { t: d(2), type: 'Pindah lokasi', ref: 'AST-2026-0007', text: 'Ruang IT → Ruang Keuangan' },
    { t: d(3), type: 'ATK keluar', ref: 'Kertas A4 80 gr', text: '-6 rim (Bagian Keuangan) → stok 4' },
    { t: d(5), type: 'Ganti pemegang', ref: 'AST-2026-0002', text: 'Sari Dewi → Budi Santoso' }
  ];
  return { assets, atk, log, opnames: [] };
}
function load() { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.assets) return d; } catch (e) {} return seed(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
let S = load();
let page = 'dash', ui = { q: '', loc: '', kond: '', tab: 'aset', opLoc: LOCS[0], chk: {}, lloc: '' };
const addLog = (type, ref, text) => S.log.unshift({ t: new Date().toISOString(), type, ref, text });
function nextCode() { const n = Math.max(0, ...S.assets.map(a => +a.code.split('-')[2])) + 1; return `AST-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`; }

/* ---------- Helper UI ---------- */
const fld = (l, i) => `<label class="f"><span>${l}</span>${i}</label>`;
const sel = (n, o, v) => `<select name="${n}">${o.map(x => `<option${x === v ? ' selected' : ''}>${x}</option>`).join('')}</select>`;
const selc = (o, v, on) => `<select onchange="${on}">${o.map(x => `<option${x === v ? ' selected' : ''}>${x}</option>`).join('')}</select>`;
const stat = (l, v, c = '') => `<div class="card stat ${c}"><span>${l}</span><b>${v}</b></div>`;
const badge = k => `<span class="b ${{ Baik: 'ok', 'Rusak Ringan': 'wn', 'Rusak Berat': 'bd', Hilang: 'bd' }[k] || 'ok'}">${k}</span>`;
function modal(h) { $('#mbody').innerHTML = h; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }
let tt; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2400); }
function done(m) { save(); closeModal(); render(); toast(m); }
function csv(name, rows) {
  const t = rows.map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + t], { type: 'text/csv' })); a.download = name; a.click();
}

/* ---------- Router ---------- */
const PAGES = { dash: ['Ringkasan', dash], aset: ['Daftar aset', aset], riwayat: ['Riwayat mutasi', riwayat], atk: ['Stok ATK', atk], opname: ['Stock opname', opname], label: ['Label aset', label] };
function go(p) { page = p; render(); window.scrollTo(0, 0); }
function render() {
  $('#nav').innerHTML = Object.entries(PAGES).map(([k, v]) => `<button class="${k === page ? 'on' : ''}" onclick="go('${k}')">${v[0]}</button>`).join('');
  $('#title').textContent = PAGES[page][0];
  $('#view').innerHTML = PAGES[page][1]();
}

/* ---------- Ringkasan ---------- */
function dash() {
  const bad = S.assets.filter(a => a.kond !== 'Baik'), low = S.atk.filter(x => x.stock <= x.min), over = S.atk.filter(x => x.stock > x.max), lo = S.opnames[0];
  const al = [
    ...bad.map(a => ['bd', `${a.nama} (${a.code}) berstatus ${a.kond.toLowerCase()}`]),
    ...low.map(x => ['wn', `${x.nama} menipis: sisa ${x.stock} ${x.unit}, minimum ${x.min}`]),
    ...over.map(x => ['ac', `${x.nama} berlebih: ${x.stock} ${x.unit}, maksimum ${x.max}`])
  ];
  if (lo && lo.selisih) al.push(['wn', `Opname terakhir (${lo.lokasi}) menemukan ${lo.selisih} selisih`]);
  const bl = LOCS.map(l => [l, S.assets.filter(a => a.loc === l).length]), mx = Math.max(1, ...bl.map(x => x[1]));
  return `<div class="stats">${stat('Total aset', S.assets.length)}${stat('Aset bermasalah', bad.length, bad.length ? 'warn' : '')}${stat('ATK menipis', low.length, low.length ? 'warn' : '')}${stat('ATK berlebih', over.length, over.length ? 'info' : '')}</div>
  <div class="grid2">
    <div class="card"><h3>Perlu perhatian</h3><ul class="al">${al.map(([c, t]) => `<li><i class="d ${c}"></i><span>${esc(t)}</span></li>`).join('') || '<li class="mut">Semua aman.</li>'}</ul></div>
    <div class="card"><h3>Aset per lokasi</h3>${bl.map(([l, n]) => `<div class="lb"><span>${l}</span><i style="width:${n / mx * 55}%"></i><span>${n}</span></div>`).join('')}</div>
  </div>
  <div class="card"><h3>Aktivitas terbaru</h3><ul class="tl">${S.log.slice(0, 6).map(l => `<li><span class="mut">${fmt(l.t)}</span><span><b>${esc(l.type)}</b> · ${esc(l.ref)}: ${esc(l.text)}</span></li>`).join('')}</ul></div>`;
}

/* ---------- Aset ---------- */
function asetRows() {
  const q = ui.q.toLowerCase();
  const r = S.assets.filter(a => (!q || (a.nama + a.code + a.pemegang).toLowerCase().includes(q)) && (!ui.loc || a.loc === ui.loc) && (!ui.kond || a.kond === ui.kond));
  return r.map(a => `<tr><td><b>${esc(a.nama)}</b><div class="mut">${a.code} · ${a.kat}</div></td><td>${esc(a.loc)}</td><td>${esc(a.pemegang) || '<span class="mut">-</span>'}</td><td>${badge(a.kond)}</td><td class="r"><button class="link" onclick="mutForm(${a.id})">Mutasi</button><button class="link" onclick="assetForm(${a.id})">Edit</button></td></tr>`).join('') || '<tr><td colspan="5" class="empty">Tidak ada aset yang cocok.</td></tr>';
}
function aset() {
  const opt = (o, ph) => `<option value="">${ph}</option>` + o.map(x => `<option>${x}</option>`).join('');
  return `<div class="bar"><div class="filters">
    <input placeholder="Cari nama, kode, atau pemegang" value="${esc(ui.q)}" oninput="ui.q=this.value;$('#rows').innerHTML=asetRows()">
    <select onchange="ui.loc=this.value;$('#rows').innerHTML=asetRows()">${opt(LOCS, 'Semua lokasi')}</select>
    <select onchange="ui.kond=this.value;$('#rows').innerHTML=asetRows()">${opt(KOND, 'Semua kondisi')}</select></div>
    <div class="row"><button class="ghost" onclick="exportAset()">Ekspor CSV</button><button class="primary" onclick="assetForm(0)">+ Aset baru</button></div></div>
  <div class="card tw"><table><thead><tr><th>Aset</th><th>Lokasi</th><th>Pemegang</th><th>Kondisi</th><th></th></tr></thead><tbody id="rows">${asetRows()}</tbody></table></div>`;
}
function exportAset() { csv('aset.csv', [['Kode', 'Nama', 'Kategori', 'Lokasi', 'Pemegang', 'Kondisi', 'Tahun'], ...S.assets.map(a => [a.code, a.nama, a.kat, a.loc, a.pemegang, a.kond, a.thn])]); }
function assetForm(id) {
  const ed = !!id, a = S.assets.find(x => x.id === id) || { nama: '', kat: KATS[0], loc: LOCS[0], kond: 'Baik', thn: new Date().getFullYear() };
  modal(`<h3>${ed ? 'Edit aset' : 'Aset baru'}</h3><p class="mut">${ed ? a.code : 'Kode dibuat otomatis: ' + nextCode()}</p>
  <form onsubmit="saveAsset(event,${id})">
    ${fld('Nama aset', `<input name="nama" required value="${esc(a.nama)}">`)}
    ${fld('Kategori', sel('kat', KATS, a.kat))}
    ${ed ? '' : fld('Lokasi', sel('loc', LOCS, a.loc)) + fld('Pemegang', '<input name="pemegang" placeholder="Nama pengguna (opsional)">') + fld('Kondisi', sel('kond', KOND, a.kond))}
    ${fld('Tahun perolehan', `<input name="thn" type="number" min="2000" max="2100" value="${a.thn}">`)}
    <div class="btns"><button type="button" class="ghost" onclick="closeModal()">Batal</button><button class="primary">Simpan aset</button></div></form>`);
}
function saveAsset(e, id) {
  e.preventDefault(); const f = fd(e);
  if (id) { const a = S.assets.find(x => x.id === id); Object.assign(a, { nama: f.nama.trim(), kat: f.kat, thn: f.thn }); addLog('Edit data', a.code, 'Data aset diperbarui'); }
  else { const a = { id: Date.now(), code: nextCode(), nama: f.nama.trim(), kat: f.kat, loc: f.loc, pemegang: (f.pemegang || '').trim(), kond: f.kond, thn: f.thn }; S.assets.push(a); addLog('Aset baru', a.code, `${a.nama} didaftarkan di ${a.loc}`); }
  done('Aset disimpan');
}
function mutForm(id) {
  const a = S.assets.find(x => x.id === id);
  const h = S.log.filter(l => l.ref === a.code).slice(0, 4).map(l => `<li><span class="mut">${fmt(l.t)}</span><span>${esc(l.type)}: ${esc(l.text)}</span></li>`).join('');
  modal(`<h3>Mutasi aset</h3><p class="mut">${esc(a.nama)} · ${a.code}</p>
  <form onsubmit="saveMut(event,${id})">
    ${fld('Lokasi', sel('loc', LOCS, a.loc))}${fld('Pemegang', `<input name="pemegang" value="${esc(a.pemegang)}" placeholder="Kosongkan jika tidak ada">`)}
    ${fld('Kondisi', sel('kond', KOND, a.kond))}${fld('Catatan', '<input name="cat" placeholder="Misal: dipindah karena renovasi">')}
    <div class="btns"><button type="button" class="ghost" onclick="closeModal()">Batal</button><button class="primary">Catat mutasi</button></div></form>
  ${h ? `<h4>Riwayat aset ini</h4><ul class="tl">${h}</ul>` : ''}`);
}
function saveMut(e, id) {
  e.preventDefault(); const f = fd(e), a = S.assets.find(x => x.id === id), n = f.cat.trim() ? ` (${f.cat.trim()})` : '', p = f.pemegang.trim(); let c = 0;
  if (f.loc !== a.loc) { addLog('Pindah lokasi', a.code, `${a.loc} → ${f.loc}${n}`); a.loc = f.loc; c++; }
  if (p !== a.pemegang) { addLog('Ganti pemegang', a.code, `${a.pemegang || 'tanpa pemegang'} → ${p || 'tanpa pemegang'}${n}`); a.pemegang = p; c++; }
  if (f.kond !== a.kond) { addLog('Kondisi', a.code, `${a.kond} → ${f.kond}${n}`); a.kond = f.kond; c++; }
  done(c ? 'Mutasi tercatat' : 'Tidak ada perubahan');
}

/* ---------- Riwayat ---------- */
function riwayat() {
  return `<div class="card tw"><table><thead><tr><th>Waktu</th><th>Jenis</th><th>Referensi</th><th>Keterangan</th></tr></thead><tbody>${S.log.slice(0, 100).map(l => `<tr><td class="mut">${fmt(l.t)}</td><td><b>${esc(l.type)}</b></td><td>${esc(l.ref)}</td><td>${esc(l.text)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Belum ada riwayat.</td></tr>'}</tbody></table></div>`;
}

/* ---------- ATK ---------- */
function atk() {
  return `<div class="bar"><span class="mut">Status dihitung dari batas minimum dan maksimum tiap barang.</span><div class="row"><button class="ghost" onclick="exportAtk()">Ekspor CSV</button><button class="primary" onclick="atkForm()">+ Barang baru</button></div></div>
  <div class="card tw"><table><thead><tr><th>Barang</th><th>Stok</th><th>Batas min – maks</th><th>Status</th><th></th></tr></thead><tbody>${S.atk.map(x => {
    const s = x.stock <= x.min ? ['wn', 'Menipis'] : x.stock > x.max ? ['ac', 'Berlebih'] : ['ok', 'Aman'];
    return `<tr><td><b>${esc(x.nama)}</b></td><td>${x.stock} ${esc(x.unit)}</td><td class="mut">${x.min} – ${x.max}</td><td><span class="b ${s[0]}">${s[1]}</span></td><td class="r"><button class="link" onclick="atkMove(${x.id},1)">Masuk</button><button class="link" onclick="atkMove(${x.id},-1)">Keluar</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function exportAtk() { csv('stok-atk.csv', [['Barang', 'Satuan', 'Stok', 'Minimum', 'Maksimum'], ...S.atk.map(x => [x.nama, x.unit, x.stock, x.min, x.max])]); }
function atkMove(id, d) {
  const x = S.atk.find(z => z.id === id);
  modal(`<h3>Barang ${d > 0 ? 'masuk' : 'keluar'}</h3><p class="mut">${esc(x.nama)} · stok sekarang ${x.stock} ${esc(x.unit)}</p>
  <form onsubmit="saveMove(event,${id},${d})">${fld('Jumlah', '<input name="qty" type="number" min="1" required>')}
  ${fld('Catatan', `<input name="cat" placeholder="${d > 0 ? 'Misal: pembelian dari supplier' : 'Misal: diambil Bagian Keuangan'}">`)}
  <div class="btns"><button type="button" class="ghost" onclick="closeModal()">Batal</button><button class="primary">Catat</button></div></form>`);
}
function saveMove(e, id, d) {
  e.preventDefault(); const f = fd(e), q = +f.qty, x = S.atk.find(z => z.id === id);
  if (d < 0 && q > x.stock) { toast('Stok tidak cukup untuk jumlah tersebut'); return; }
  x.stock += d * q; addLog(d > 0 ? 'ATK masuk' : 'ATK keluar', x.nama, `${d > 0 ? '+' : '-'}${q} ${x.unit}${f.cat.trim() ? ' (' + f.cat.trim() + ')' : ''} → stok ${x.stock}`);
  done('Stok diperbarui');
}
function atkForm() {
  modal(`<h3>Barang ATK baru</h3><form onsubmit="saveAtk(event)">
  ${fld('Nama barang', '<input name="nama" required>')}${fld('Satuan', '<input name="unit" required placeholder="pcs, rim, box">')}
  ${fld('Stok awal', '<input name="stock" type="number" min="0" required value="0">')}${fld('Batas minimum', '<input name="min" type="number" min="0" required value="5">')}${fld('Batas maksimum', '<input name="max" type="number" min="1" required value="50">')}
  <div class="btns"><button type="button" class="ghost" onclick="closeModal()">Batal</button><button class="primary">Simpan barang</button></div></form>`);
}
function saveAtk(e) {
  e.preventDefault(); const f = fd(e);
  if (+f.min > +f.max) { toast('Batas minimum tidak boleh melebihi maksimum'); return; }
  S.atk.push({ id: Date.now(), nama: f.nama.trim(), unit: f.unit.trim(), stock: +f.stock, min: +f.min, max: +f.max });
  addLog('ATK baru', f.nama.trim(), `Didaftarkan dengan stok ${f.stock} ${f.unit.trim()}`); done('Barang disimpan');
}

/* ---------- Stock opname ---------- */
function opname() {
  const t = k => `<button class="${ui.tab === k ? 'on' : ''}" onclick="ui.tab='${k}';render()">${k === 'aset' ? 'Aset fisik' : 'Stok ATK'}</button>`;
  return `<div class="tabs">${t('aset')}${t('atk')}</div>` + (ui.tab === 'aset' ? opAset() : opAtk()) + hist();
}
function opAset() {
  const it = S.assets.filter(a => a.loc === ui.opLoc);
  return `<div class="card"><div class="bar"><label class="f inl"><span>Lokasi yang dihitung</span>${selc(LOCS, ui.opLoc, "ui.opLoc=this.value;ui.chk={};render()")}</label><button class="ghost" onclick="chkAll()">Centang semua</button></div>
  <p class="mut">Centang aset yang benar-benar ditemukan di lokasi ini. Aset yang tidak dicentang dicatat sebagai selisih.</p>
  <ul class="chk">${it.map(a => `<li><label><input type="checkbox" ${ui.chk[a.id] ? 'checked' : ''} onchange="ui.chk[${a.id}]=this.checked"><span><b>${esc(a.nama)}</b><small class="mut">${a.code}</small></span></label></li>`).join('') || '<li class="empty">Belum ada aset tercatat di lokasi ini.</li>'}</ul>
  ${it.length ? '<button class="primary" onclick="saveOpAset()">Simpan hasil opname</button>' : ''}</div>`;
}
function chkAll() { S.assets.filter(a => a.loc === ui.opLoc).forEach(a => ui.chk[a.id] = true); render(); }
function saveOpAset() {
  const it = S.assets.filter(a => a.loc === ui.opLoc), miss = it.filter(a => !ui.chk[a.id]);
  S.opnames.unshift({ t: new Date().toISOString(), jenis: 'Aset', lokasi: ui.opLoc, total: it.length, selisih: miss.length, detail: miss.map(a => a.nama).join(', ') });
  miss.forEach(a => addLog('Opname', a.code, `Tidak ditemukan di ${ui.opLoc}; periksa atau catat mutasinya`));
  if (!miss.length) addLog('Opname', ui.opLoc, `Semua ${it.length} aset cocok dengan catatan`);
  ui.chk = {}; save(); render(); toast(miss.length ? `${miss.length} aset selisih tercatat` : 'Semua aset cocok');
}
function opAtk() {
  return `<div class="card"><p class="mut">Isi hasil hitungan fisik. Selisih dengan catatan tampil otomatis, lalu stok bisa disesuaikan.</p>
  <div class="tw"><table><thead><tr><th>Barang</th><th>Catatan sistem</th><th>Hitungan fisik</th><th>Selisih</th></tr></thead><tbody>${S.atk.map(x => `<tr><td><b>${esc(x.nama)}</b></td><td>${x.stock} ${esc(x.unit)}</td><td><input class="cnt" type="number" min="0" data-id="${x.id}" oninput="atkDiff(${x.id},this.value)"></td><td><span class="diff" id="d${x.id}"></span></td></tr>`).join('')}</tbody></table></div>
  <div class="btns" style="margin-top:20px"><button class="primary" onclick="saveOpAtk()">Simpan &amp; sesuaikan stok</button></div></div>`;
}
function atkDiff(id, v) {
  const x = S.atk.find(z => z.id === id), s = $('#d' + id);
  if (v === '') { s.textContent = ''; return; }
  const d = +v - x.stock; s.textContent = d === 0 ? 'Cocok' : (d > 0 ? '+' : '') + d; s.style.color = d === 0 ? 'var(--ok)' : 'var(--bd)';
}
function saveOpAtk() {
  let n = 0; const dif = [];
  document.querySelectorAll('[data-id]').forEach(i => {
    if (i.value === '') return;
    const x = S.atk.find(z => z.id == i.dataset.id), d = +i.value - x.stock; n++;
    if (d) { dif.push(x.nama); addLog('Opname', x.nama, `Fisik ${i.value}, catatan ${x.stock} (selisih ${d > 0 ? '+' : ''}${d}); stok disesuaikan`); x.stock = +i.value; }
  });
  if (!n) { toast('Isi minimal satu hitungan fisik'); return; }
  S.opnames.unshift({ t: new Date().toISOString(), jenis: 'ATK', lokasi: 'Gudang ATK', total: n, selisih: dif.length, detail: dif.join(', ') });
  save(); render(); toast(dif.length ? `${dif.length} selisih disesuaikan` : 'Semua stok cocok');
}
function hist() {
  if (!S.opnames.length) return '';
  return `<div class="card"><h3>Hasil opname sebelumnya</h3><ul class="tl">${S.opnames.slice(0, 5).map(o => `<li><span class="mut">${fmt(o.t)}</span><span><b>${o.jenis} · ${esc(o.lokasi)}</b>: ${o.selisih ? o.selisih + ' selisih dari ' + o.total + ' item (' + esc(o.detail) + ')' : 'semua ' + o.total + ' item cocok'}</span></li>`).join('')}</ul></div>`;
}

/* ---------- Label ---------- */
function bars(code) {
  let x = 0, r = '';
  for (const ch of code) { const c = ch.charCodeAt(0); for (let b = 6; b >= 0; b--) { if ((c >> b) & 1) r += `<rect x="${x}" width="1.4" height="28"/>`; x += 2; } }
  return `<svg class="bc" viewBox="0 0 ${x} 28" preserveAspectRatio="none" aria-hidden="true">${r}</svg>`;
}
function label() {
  const l = S.assets.filter(a => !ui.lloc || a.loc === ui.lloc);
  return `<div class="bar noprint"><div class="filters"><select onchange="ui.lloc=this.value;render()"><option value="">Semua lokasi</option>${LOCS.map(x => `<option${x === ui.lloc ? ' selected' : ''}>${x}</option>`).join('')}</select></div><button class="primary" onclick="window.print()">Cetak label</button></div>
  <p class="mut noprint" style="margin-bottom:20px">Kode dibuat otomatis dan unik. Barcode hanya ilustrasi untuk demo.</p>
  <div class="labels">${l.map(a => `<div class="lab"><b>${esc(a.nama)}</b><span class="mut">${esc(a.loc)}</span>${bars(a.code)}<code>${a.code}</code></div>`).join('')}</div>`;
}

/* ---------- Reset ---------- */
function resetForm() {
  modal(`<h3>Reset data contoh?</h3><p class="mut">Semua perubahan Anda akan dihapus dan data kembali ke contoh awal.</p><div class="btns" style="margin-top:22px"><button class="ghost" onclick="closeModal()">Batal</button><button class="primary" onclick="S=seed();ui.chk={};done('Data direset')">Reset data</button></div>`);
}
render();
