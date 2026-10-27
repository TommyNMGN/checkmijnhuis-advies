
    // ================================================================
    // WEB-APP: DOSSIERS OP HET TOESTEL, AUTOMATISCH OPSLAAN, WEERGAVEN
    // Alle klantgegevens blijven op dit toestel (IndexedDB); er gaat niets naar een server.
    // ================================================================
    const APP_VERSIE = "1.0";
    const DB_NAME = "checkmijnhuis", DB_STORE = "dossiers";
    let db = null, currentId = null, lastSavedJson = "", saveTimer = null, blankJson = "";
    let KB_DEFAULT_JSON = "";

    function openDb() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE, { keyPath: "id" });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    function dbAll() {
      return new Promise((resolve, reject) => {
        const r = db.transaction(DB_STORE).objectStore(DB_STORE).getAll();
        r.onsuccess = () => resolve(r.result || []); r.onerror = () => reject(r.error);
      });
    }
    function dbGet(id) {
      return new Promise((resolve, reject) => {
        const r = db.transaction(DB_STORE).objectStore(DB_STORE).get(id);
        r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
      });
    }
    function dbPut(rec) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, "readwrite"); tx.objectStore(DB_STORE).put(rec);
        tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
      });
    }
    function dbDelete(id) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, "readwrite"); tx.objectStore(DB_STORE).delete(id);
        tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
      });
    }

    // ---------- toestand van één dossier ----------
    function vandaag() {
      return new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) + " • " + ADVISEUR.naam;
    }
    function resetState() {
      clientName = ""; clientAddress = ""; inspectDate = vandaag();
      currentTemplateKey = "condensatie";
      customSituations = {}; customDuidingen = {};
      kb = JSON.parse(KB_DEFAULT_JSON);
      adviesState = {}; samenvatting = {}; urgentie = { niveau: "", tekst: "" }; fotoData = "";
      obj = { type: "", bouwjaar: "", aanwezig: "", aanleiding: "" };
      waarnemingen = { lijst: [], overig: "" };
      detailFotos = [];
      kb.mp = [];
      kb.datum = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    function applyState(s) {
      resetState();
      const el = document.getElementById('savedState');
      el.textContent = JSON.stringify(s || {});
      restoreState();
      el.textContent = "";
    }
    function stateJson() { return JSON.stringify(collectState()); }

    // Tekstvakken groeien mee met de tekst, zodat je altijd alles ziet wat je typt
    function groei(el) {
      if (!el || el.tagName !== 'TEXTAREA' || !el.offsetParent) return;
      el.style.height = 'auto';
      el.style.height = (el.scrollHeight + 2) + 'px';
    }
    function groeiAlles() { document.querySelectorAll('#view-invullen textarea').forEach(groei); }
    document.addEventListener('input', e => groei(e.target));
    // ook na een sjabloon of 'standaardtips invullen' (tekst wordt dan zonder typen ingevuld)
    document.addEventListener('change', () => setTimeout(groeiAlles, 0));
    document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#view-invullen button')) setTimeout(groeiAlles, 0); });
    document.addEventListener('toggle', e => { if (e.target.matches && e.target.matches('details.stap')) groeiAlles(); }, true);

    function refreshAll() {
      syncInputsFromState();
      refreshAdviesPanel();
      refreshSamPanel();
      refreshTekstPanel();
      refreshStappen();
      renderAllPages();
      updateTopLabel();
      setTimeout(groeiAlles, 0);
    }

    // ---------- automatisch opslaan ----------
    function scheduleSave() {
      if (!db) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveNow, 600);
    }
    async function saveNow() {
      if (!db) return;
      const json = stateJson();
      if (json === lastSavedJson) return;
      if (!currentId && json === blankJson) return; // leeg nieuw dossier: nog niets opslaan
      if (!currentId) currentId = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const prev = await dbGet(currentId);
      await dbPut({ id: currentId, created: prev ? prev.created : Date.now(), updated: Date.now(), state: JSON.parse(json) });
      lastSavedJson = json;
      try { localStorage.setItem('cmh_last', currentId); } catch (e) {}
      flashSaved();
      updateTopLabel();
    }
    function flashSaved() {
      const el = document.getElementById('saveState');
      if (!el) return;
      el.textContent = "Opgeslagen";
      el.classList.remove('opacity-0');
      clearTimeout(el._t); el._t = setTimeout(() => el.classList.add('opacity-0'), 1500);
    }
    function updateTopLabel() {
      const el = document.getElementById('curLabel');
      if (el) el.textContent = clientAddress.trim() || (currentId ? "Adres nog invullen" : "Nieuw advies");
    }

    // ---------- weergaven ----------
    let currentView = "dossiers";
    function showView(v) {
      currentView = v;
      document.body.classList.remove('view-dossiers', 'view-invullen', 'view-voorbeeld');
      document.body.classList.add('view-' + v);
      document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('nav-active', b.dataset.nav === v));
      if (v === 'dossiers') renderDossierList();
      if (v === 'voorbeeld') { checkPageOverflow(); fitPreview(); }
      if (v === 'invullen') setTimeout(groeiAlles, 0);
      window.scrollTo(0, 0);
    }
    function fitPreview() {
      const wrap = document.getElementById('previewWrap');
      const cont = document.getElementById('dossierContainer');
      if (!wrap || !cont) return;
      if (currentView !== 'voorbeeld') { cont.style.transform = ""; wrap.style.height = ""; return; }
      const avail = Math.min(document.documentElement.clientWidth - 16, 900);
      const sc = Math.min(1, avail / 794);
      cont.style.transform = `scale(${sc})`;
      wrap.style.height = Math.ceil(cont.scrollHeight * sc) + 40 + "px";
    }
    window.addEventListener('resize', () => fitPreview());

    // ---------- dossierlijst ----------
    async function renderDossierList() {
      const list = document.getElementById('dossierList');
      if (!list || !db) return;
      const items = (await dbAll()).sort((a, b) => b.updated - a.updated);
      // herinnering aan een back-up (adviezen staan alleen op dit toestel)
      let last = 0; try { last = parseInt(localStorage.getItem('cmh_backup') || '0', 10); } catch (e) {}
      const dagen = last ? Math.floor((Date.now() - last) / 86400000) : null;
      const hint = document.getElementById('backupHint');
      if (hint) {
        const toon = items.length > 0 && (dagen === null || dagen >= 14);
        hint.classList.toggle('hidden', !toon);
        hint.querySelector('span').textContent = dagen === null
          ? "Je hebt nog geen back-up gemaakt. Je adviezen staan alleen op dit toestel."
          : `Je laatste back-up is ${dagen} dagen oud. Maak een nieuwe, zodat je niets kwijtraakt.`;
      }
      document.getElementById('dossierCount').textContent = items.length ? `${items.length} advies${items.length === 1 ? '' : 'en'} op dit toestel` : "";
      if (!items.length) {
        list.innerHTML = `<p class="text-slate-400 text-sm py-8 text-center">Nog geen adviezen. Tik op <strong class="text-white">Nieuw advies</strong> om te beginnen.</p>`;
        return;
      }
      list.innerHTML = items.map(it => {
        const s = it.state || {};
        const titel = (DOSSIERS[s.currentTemplateKey] || {}).title || "";
        const d = new Date(it.updated).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
        const foto = typeof s.fotoData === 'string' && s.fotoData.startsWith('data:image/') ? `<img src="${s.fotoData}" class="w-14 h-14 rounded-lg object-cover shrink-0 border border-slate-700">` : `<div class="w-14 h-14 rounded-lg bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center text-slate-500"><i data-lucide="house" class="w-6 h-6"></i></div>`;
        return `<div class="flex items-center gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800">
          <button class="flex items-center gap-3 flex-1 min-w-0 text-left" onclick="openDossier('${it.id}')">
            ${foto}
            <div class="min-w-0">
              <p class="text-white font-bold text-[15px] truncate">${escHtml(s.clientAddress || '') || '<span class="text-amber-300">Adres nog invullen</span>'}</p>
              <p class="text-slate-400 text-[13px] truncate">${escHtml(s.clientName || '')}${s.clientName ? ' • ' : ''}${escHtml(titel)}</p>
              <p class="text-slate-500 text-[12px]">Bijgewerkt ${d}${s.clientAddress ? '' : ' • aangemaakt ' + new Date(it.created).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </button>
          <button class="p-2.5 rounded-xl text-slate-400 hover:text-red-300 hover:bg-red-950/40" title="Verwijderen" onclick="deleteDossier('${it.id}')"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
        </div>`;
      }).join('');
      if (window.lucide) lucide.createIcons();
    }

    async function openDossier(id) {
      await saveNow();
      const rec = await dbGet(id);
      if (!rec) return;
      currentId = id;
      applyState(rec.state);
      lastSavedJson = stateJson();
      try { localStorage.setItem('cmh_last', id); } catch (e) {}
      refreshAll();
      showView('invullen');
    }

    async function newDossier() {
      await saveNow();
      currentId = null;
      resetState();
      lastSavedJson = "";
      refreshAll();
      blankJson = stateJson();
      showView('invullen');
    }

    async function deleteDossier(id) {
      const rec = await dbGet(id);
      const naam = rec && rec.state ? (rec.state.clientAddress || 'dit advies') : 'dit advies';
      if (!confirm(`Advies "${naam}" definitief verwijderen van dit toestel?\n\nTip: maak eerst een back-up als je het wilt bewaren.`)) return;
      await dbDelete(id);
      if (currentId === id) { currentId = null; resetState(); lastSavedJson = ""; refreshAll(); blankJson = stateJson(); }
      renderDossierList();
    }

    // ---------- back-up ----------
    async function backupMaken() {
      await saveNow();
      const items = await dbAll();
      if (!items.length) { alert("Er zijn nog geen adviezen om te bewaren."); return; }
      const datum = new Date().toISOString().slice(0, 10);
      const naam = `CheckMijnHuis-backup-${datum}.json`;
      const blob = new Blob([JSON.stringify({ app: "checkmijnhuis", versie: APP_VERSIE, gemaakt: new Date().toISOString(), dossiers: items })], { type: "application/json" });
      const file = new File([blob], naam, { type: "application/json" });
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: naam });
          backupGemaakt();
          return;
        }
      } catch (e) { if (e && e.name === 'AbortError') return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = naam;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      backupGemaakt();
    }
    function backupGemaakt() {
      try { localStorage.setItem('cmh_backup', String(Date.now())); } catch (e) {}
      renderDossierList();
    }

    // ---------- HTML-export voor de eigen administratie ----------
    // Eén zelfstandig bestand: het rapport (zelfde opmaak als de PDF, ook af te drukken)
    // plus alle ingevulde gegevens, zodat het later via 'Terugzetten' weer in de app kan.
    async function bestandAlsDataUrl(url) {
      const b = await (await fetch(url)).blob();
      return await new Promise((ok, fout) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = fout; r.readAsDataURL(b); });
    }
    async function htmlOpslaan() {
      if (!clientAddress.trim()) {
        alert("Vul eerst het adres in; dat wordt de bestandsnaam.");
        document.getElementById('topClientAddress')?.focus();
        return;
      }
      try {
        await saveNow();
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        checkPageOverflow();

        // opmaak: app.css met ingebouwde lettertypen + de rapportstijlen uit deze pagina
        let css = await (await fetch('app.css')).text();
        const fonts = [...new Set(css.match(/fonts\/[a-z0-9-]+\.woff2/g) || [])];
        for (const f of fonts) { try { css = css.split(f).join(await bestandAlsDataUrl(f)); } catch (e) {} }
        const eigen = [...document.querySelectorAll('head style')].map(x => x.textContent).join('\n');

        // rapportpagina's kopiëren zonder bewerk- en invulhulpjes
        const kopie = document.getElementById('dossierContainer').cloneNode(true);
        kopie.removeAttribute('style');
        kopie.querySelectorAll('.ph-hint, .no-print').forEach(e => e.remove());
        kopie.querySelectorAll('.ph-mark').forEach(e => e.classList.remove('ph-mark'));
        kopie.querySelectorAll('[contenteditable]').forEach(e => { e.removeAttribute('contenteditable'); e.removeAttribute('oninput'); });
        kopie.querySelectorAll('.a4-page').forEach(p => { p.style.outline = ''; p.removeAttribute('title'); });

        const rec = { id: currentId || ('dossier-' + Date.now()), created: Date.now(), updated: Date.now(), state: collectState() };
        try { const cur = currentId && await dbGet(currentId); if (cur) { rec.created = cur.created; rec.updated = cur.updated; } } catch (e) {}
        const data = JSON.stringify({ app: "checkmijnhuis", versie: APP_VERSIE, gemaakt: new Date().toISOString(), dossiers: [rec] }).replace(/</g, '\\u003c');
        const naam = getExportFilename('html');
        const titel = naam.replace(/\.html$/, '');

        const html = `<!DOCTYPE html>
<html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(titel)}</title>
<style>${css}</style>
<style>${eigen}</style>
<style>
  body { background:#e2e8f0 !important; padding:16px 0 !important; margin:0; }
  #dossierContainer { width:794px; margin:0 auto; }
  #dossierContainer .a4-page { margin:0 auto 20px auto; box-shadow:0 6px 20px rgba(15,23,42,.18); }
  @media print { body { padding:0 !important; } #dossierContainer .a4-page { margin:0 !important; box-shadow:none !important; } }
</style>
<script type="application/json" id="cmhDossier">${data}<\/script>
</head><body class="antialiased">
${kopie.outerHTML}
</body></html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const file = new File([blob], naam, { type: 'text/html' });
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        if (isIOS && navigator.canShare && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: titel }); return; }
          catch (e) { if (e && e.name === 'AbortError') return; }
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = naam;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        showToast(`Opgeslagen als <strong>${escHtml(naam)}</strong>`, true);
      } catch (e) {
        console.error(e);
        showToast("Het HTML-bestand kon niet worden gemaakt. Probeer het opnieuw.", false);
      }
    }

    function backupTerugzetten(input) {
      const f = input.files && input.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = async () => {
        try {
          let tekst = r.result;
          // ook een opgeslagen HTML-rapport kan worden teruggezet
          if (/^\s*</.test(tekst)) {
            const el = new DOMParser().parseFromString(tekst, 'text/html').getElementById('cmhDossier');
            if (!el) throw new Error('geen dossier');
            tekst = el.textContent;
          }
          const data = JSON.parse(tekst);
          const items = Array.isArray(data.dossiers) ? data.dossiers : [];
          let n = 0;
          for (const it of items) {
            if (!it || !it.id || !it.state) continue;
            const cur = await dbGet(it.id);
            if (!cur || (it.updated || 0) > (cur.updated || 0)) { await dbPut(it); n++; }
          }
          alert(n ? `${n} advies${n === 1 ? '' : 'en'} teruggezet.` : 'Dit advies staat al in de app (dezelfde of een nieuwere versie).');
          renderDossierList();
        } catch (e) {
          alert("Dit bestand is geen geldige back-up van CheckMijnHuis.");
        }
        input.value = "";
      };
      r.readAsText(f);
    }

    // ---------- situatie & duiding als invoervelden ----------
    function refreshTekstPanel() {
      const d = DOSSIERS[currentTemplateKey];
      const s = document.getElementById('tx_situatie'), u = document.getElementById('tx_duiding');
      if (s) { s.value = customSituations[currentTemplateKey] || ""; s.placeholder = "Standaardtekst: " + d.defaultSituation; }
      if (u) { u.value = customDuidingen[currentTemplateKey] || ""; u.placeholder = "Standaardtekst: " + d.analysisExtra.replace(/<[^>]+>/g, ''); }
    }
    function setSituatieTekst(val) {
      syncSituationText(val);
      const el = document.getElementById('docSituation');
      if (el) el.innerHTML = val.trim() ? escHtml(val).replace(/\n/g, '<br>') : DOSSIERS[currentTemplateKey].defaultSituation;
      checkPageOverflow();
    }
    function setDuidingTekst(val) {
      syncDuidingText(val);
      const el = document.getElementById('docDuiding');
      if (el) el.innerHTML = val.trim() ? escHtml(val).replace(/\n/g, '<br>') : DOSSIERS[currentTemplateKey].analysisExtra;
      checkPageOverflow();
    }

    // ---------- stappen: woning, waarnemingen, meetpunten, foto's ----------
    function refreshStappen() {
      const sel = document.getElementById('obj_type');
      if (sel) {
        sel.innerHTML = '<option value="">— kies —</option>' + OBJECT_TYPES.map(t => `<option>${escHtml(t)}</option>`).join('');
        sel.value = obj.type || "";
      }
      const sv = (id, v) => { const e = document.getElementById(id); if (e) e.value = v || ""; };
      sv('obj_bouwjaar', obj.bouwjaar); sv('obj_aanwezig', obj.aanwezig); sv('obj_aanleiding', obj.aanleiding);
      sv('obs_overig', waarnemingen.overig);
      renderObsChips(); renderMpEditor(); renderDfEditor(); updateDpLive();
    }
    function setObj(f, v) { obj[f] = v; updateLocatieBlokken(); updateAdviesBox(); }

    function renderObsChips() {
      const box = document.getElementById('obs_chips');
      if (!box) return;
      const l = waarnemingen.lijst || [];
      box.innerHTML = WAARNEMING_KEUZES.map(w => `<button type="button" class="chip ${l.includes(w) ? 'on' : ''}" onclick="toggleObs('${w.replace(/'/g, "\\'")}')">${escHtml(w)}</button>`).join('')
        + `<button type="button" class="chip ${l.includes(GEEN_SCHADE) ? 'on-groen' : ''}" onclick="toggleObs('${GEEN_SCHADE}')">${GEEN_SCHADE}</button>`;
    }
    function toggleObs(w) {
      let l = (waarnemingen.lijst || []).slice();
      if (l.includes(w)) l = l.filter(x => x !== w);
      else if (w === GEEN_SCHADE) l = [GEEN_SCHADE];
      else l = l.filter(x => x !== GEEN_SCHADE).concat(w);
      waarnemingen.lijst = WAARNEMING_KEUZES.concat(GEEN_SCHADE).filter(x => l.includes(x));
      renderObsChips(); updateLocatieBlokken();
    }
    function setObsOverig(v) { waarnemingen.overig = v; updateLocatieBlokken(); }

    function updateDpLive() {}


    function renderMpEditor() {
      const box = document.getElementById('mp_list');
      if (!box) return;
      const mp = getMeetpunten();
      box.innerHTML = mp.map((p, i) => `
        <div class="rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[13px] font-bold text-white">Meetpunt ${i + 1}</span>
            <button type="button" onclick="removeMeetpunt(${i})" class="p-1.5 text-slate-400" title="Verwijderen"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          </div>
          <input type="text" class="kb-inp" placeholder="Locatie, bijv. hoek buitenmuur slaapkamer" value="${escHtml(p.loc || '')}" oninput="setMp(${i}, 'loc', this.value)" id="mp_loc_${i}">
          <div class="flex flex-wrap gap-1">${QUICK_LOC.map(q => `<button type="button" class="mini-chip" onclick="mpLoc(${i}, '${q}')">${q}</button>`).join('')}</div>
          <div><label class="kb-lbl">Hoogte (cm)</label><input type="text" inputmode="numeric" class="kb-inp" value="${escHtml(p.h || '')}" oninput="setMp(${i}, 'h', this.value)" id="mp_h_${i}"></div>
          <div class="flex flex-wrap gap-1">${QUICK_H.map(q => `<button type="button" class="mini-chip" onclick="mpH(${i}, '${q}')">${q} cm</button>`).join('')}</div>
          <div><label class="kb-lbl">Materiaalvocht</label>
            <div class="seg">${['droog', 'verhoogd', 'nat'].map(n => `<button type="button" class="${p.niveau === n ? 'on-' + n : ''}" onclick="setMpNiveau(${i}, '${n}')">${n[0].toUpperCase() + n.slice(1)}</button>`).join('')}</div>
          </div>
        </div>`).join('');
      const add = document.getElementById('mp_add');
      if (add) add.style.display = mp.length >= MAX_MEETPUNTEN ? 'none' : '';
      if (window.lucide) lucide.createIcons();
    }
    function updateMpDelta(i) {}

    function addMeetpunt() {
      const mp = getMeetpunten();
      if (mp.length >= MAX_MEETPUNTEN) return;
      mp.push({ loc: "", h: "", niveau: "", opp: "" });
      renderMpEditor(); updateLocatieBlokken();
    }
    function removeMeetpunt(i) { getMeetpunten().splice(i, 1); renderMpEditor(); updateLocatieBlokken(); }
    function setMp(i, f, v) { const p = getMeetpunten()[i]; if (!p) return; p[f] = v; updateLocatieBlokken(); }
    function setMpNiveau(i, n) { const p = getMeetpunten()[i]; if (!p) return; p.niveau = p.niveau === n ? "" : n; renderMpEditor(); updateLocatieBlokken(); }
    function mpLoc(i, q) {
      const p = getMeetpunten()[i]; if (!p) return;
      p.loc = (p.loc || "").trim() ? p.loc.trim() + ' – ' + q.toLowerCase() : q;
      const e = document.getElementById('mp_loc_' + i); if (e) e.value = p.loc;
      updateLocatieBlokken();
    }
    function mpH(i, q) {
      const p = getMeetpunten()[i]; if (!p) return;
      p.h = q; const e = document.getElementById('mp_h_' + i); if (e) e.value = q;
      updateLocatieBlokken();
    }

    function renderDfEditor() {
      const box = document.getElementById('df_list');
      if (!box) return;
      box.innerHTML = detailFotos.map((f, i) => `
        <div class="flex gap-2.5 items-start rounded-xl border border-slate-700 bg-slate-950/60 p-2">
          <img src="${f.data}" class="w-20 h-20 rounded-lg object-cover shrink-0 border border-slate-700">
          <div class="flex-1 min-w-0 space-y-1.5">
            <label class="kb-lbl">Foto ${i + 1}: bijschrift</label>
            <input type="text" class="kb-inp" placeholder="bijv. vochtplek buitenhoek slaapkamer" value="${escHtml(f.bijschrift || '')}" oninput="setDfCaption(${i}, this.value)">
          </div>
          <button type="button" onclick="removeDetailFoto(${i})" class="p-1.5 text-slate-400" title="Verwijderen"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>`).join('');
      const add = document.getElementById('df_add');
      if (add) add.style.display = detailFotos.length >= MAX_DETAILFOTOS ? 'none' : '';
      if (window.lucide) lucide.createIcons();
    }
    function addDetailFoto(input) {
      const f = input.files && input.files[0];
      input.value = "";
      if (!f || detailFotos.length >= MAX_DETAILFOTOS) return;
      verkleinFoto(f, data => { detailFotos.push({ data, bijschrift: "" }); renderDfEditor(); updateLocatieBlokken(); showToast("Foto toegevoegd. Vul nog een bijschrift in.", true); });
    }
    function removeDetailFoto(i) { detailFotos.splice(i, 1); renderDfEditor(); updateLocatieBlokken(); }
    function setDfCaption(i, v) { if (detailFotos[i]) { detailFotos[i].bijschrift = v; updateLocatieBlokken(); } }

    // ---------- koppelingen met de bestaande functies ----------
    // ---------- standaardtekst bewerkbaar maken ----------
    // Tik je in een leeg veld, dan komt de standaardtekst erin te staan, zodat je die kunt aanpassen
    // in plaats van alles opnieuw te typen. Laat je hem ongewijzigd, dan blijft het veld 'standaard'.
    const STD_VELDEN = ['tx_situatie', 'tx_duiding', 'sam_oorzaak', 'sam_urgTekst', 'sam_tips'];
    function standaardVan(el) {
      const ph = (el.placeholder || '').replace(/^Standaardtekst:\s*/, '');
      return /^Kies eerst/.test(ph) ? '' : ph;
    }
    document.addEventListener('focusin', e => {
      const el = e.target;
      if (!STD_VELDEN.includes(el.id) || el.value.trim()) return;
      const std = standaardVan(el);
      if (!std) return;
      el.value = std + ' ';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      const naarEind = () => { try { el.setSelectionRange(el.value.length, el.value.length); } catch (x) {} if (el.tagName === 'TEXTAREA') el.scrollTop = el.scrollHeight; };
      naarEind(); setTimeout(naarEind, 0); setTimeout(naarEind, 60);
    });
    document.addEventListener('focusout', e => {
      const el = e.target;
      if (!STD_VELDEN.includes(el.id)) return;
      const std = standaardVan(el);
      if (std && el.value.trim() === std.trim()) {
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    (function koppel() {
      const _cpo = checkPageOverflow;
      checkPageOverflow = function () { const r = _cpo(); scheduleSave(); return r; };
      const _sw = switchTemplate;
      switchTemplate = function (key) { _sw(key); refreshTekstPanel(); scheduleSave(); };
      const _ss = syncSituationText;
      syncSituationText = function (v) { _ss(v); const t = document.getElementById('tx_situatie'); if (t && document.activeElement !== t) t.value = v; };
      const _sd = syncDuidingText;
      syncDuidingText = function (v) { _sd(v); const t = document.getElementById('tx_duiding'); if (t && document.activeElement !== t) t.value = v; };
      const _skb = setKB;
      setKB = function (f, v) { _skb(f, v); if (f === 'binnenT' || f === 'binnenRV') updateDpLive(); };
      const _uc = updateChecks;
      updateChecks = function () {
        _uc();
        const ok = document.getElementById('checkOk');
        if (ok) ok.classList.toggle('hidden', getConsistencyWarnings().some(w => !w.startsWith('INFO|')));
      };
      const _sca = syncClientAddress;
      syncClientAddress = function (v) { _sca(v); updateTopLabel(); };
      const _rap = renderAllPages;
      renderAllPages = function () { _rap(); fitPreview(); };
      document.addEventListener('input', scheduleSave, true);
      document.addEventListener('change', scheduleSave, true);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });
      window.addEventListener('pagehide', () => saveNow());
    })();

    // ---------- opstarten ----------
    window.addEventListener('DOMContentLoaded', async () => {
      KB_DEFAULT_JSON = JSON.stringify(kb);
      resetState();
      refreshAll();
      blankJson = stateJson();
      try {
        db = await openDb();
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
      } catch (e) {
        alert("De opslag op dit toestel is niet beschikbaar (bijvoorbeeld in privé-modus). Adviezen worden dan niet bewaard.");
      }
      showView('dossiers');
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => checkPageOverflow());
      if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      }
    });
    window.addEventListener('beforeprint', () => checkPageOverflow());
