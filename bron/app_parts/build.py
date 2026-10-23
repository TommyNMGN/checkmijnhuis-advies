#!/usr/bin/env python3
"""Bouwt de web-app (index.html) uit het sjabloon advies.html."""
import re, sys, pathlib

SRC = pathlib.Path(sys.argv[1])          # advies.html
OUT = pathlib.Path(sys.argv[2])          # map van de app
PARTS = pathlib.Path(__file__).parent

s = SRC.read_text()

def R(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (n, old[:100])
    s = s.replace(old, new)

def cut(start_marker, end_marker):
    a = s.index(start_marker); b = s.index(end_marker, a)
    return s[a:b]

# ---------- HEAD ----------
s = re.sub(r'\s*<!-- Vooraf gegenereerde Tailwind-stijlen.*?-->\s*<style id="tw-fallback">.*?</style>', '', s, count=1, flags=re.S)
R('<script src="https://cdn.tailwindcss.com"></script>', '')
R('<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js" crossorigin="anonymous"></script>', '<script src="icons.js"></script>')
s = re.sub(r'\s*<link rel="preconnect" href="https://fonts\.googleapis\.com">\s*<link rel="preconnect" href="https://fonts\.gstatic\.com" crossorigin="">\s*<link href="https://fonts\.googleapis\.com/css2[^"]*" rel="stylesheet">', '', s, count=1)
R('<meta name="viewport" content="width=device-width, initial-scale=1.0">',
  '''<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#020617">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="CheckMijnHuis">
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="apple-touch-icon" href="icons/icon-180.png">
  <link rel="icon" type="image/png" href="icons/icon-192.png">
  <link rel="stylesheet" href="app.css">''')
s = re.sub(r'<title>.*?</title>', '<title>CheckMijnHuis Advies</title>', s, count=1)
R('<!-- Opgeslagen invoer (wordt gevuld bij \'Download .HTML\', zodat alles bewaard blijft bij heropenen) -->',
  '<!-- Hulpelement voor het inladen van een dossier -->')

# ---------- BODY: app-schil ----------
selector = re.search(r'<select id="templateSelector".*?</select>', s, re.S).group(0)
klant = cut('<!-- ONDERSTE RIJ: OBJECT- EN SITUATIE INVOERBALK -->', '<!-- AANBEVELING & MOTIVATIE -->')
advies = cut('<!-- AANBEVELING & MOTIVATIE -->', '<!-- SAMENVATTING, FOTO & TIPS -->')
sam = cut('<!-- SAMENVATTING, FOTO & TIPS -->', '<!-- KERNBEVINDINGEN INVOER (MOMENTOPNAME) -->')
kbp = cut('<!-- KERNBEVINDINGEN INVOER (MOMENTOPNAME) -->', '<!-- CONTROLE OP TEGENSTRIJDIGHEDEN (alleen op scherm) -->')
check = re.search(r'<div id="checkBox"[^>]*></div>', s).group(0)

# klantblok: knop 'situatie aanpassen' eruit, 3 kolommen
klant = re.sub(r'\s*<div>\s*<label[^>]*>\s*<i data-lucide="edit-2".*?</button>\s*</div>', '', klant, count=1, flags=re.S)
klant = klant.replace('md:grid-cols-4', 'md:grid-cols-3')
selector = selector.replace('class="bg-slate-900 border border-slate-700 text-white font-semibold rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"',
                            'class="kb-inp"')

tekst = '''      <!-- SITUATIE & DUIDING -->
      <details id="tekstPanel" open class="bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white">
        <summary class="cursor-pointer select-none px-3 py-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-300">
          <i data-lucide="pencil" class="w-3.5 h-3.5"></i> Situatie ter plaatse &amp; duiding
        </summary>
        <div class="px-3 pb-3 space-y-2">
          <div>
            <label class="kb-lbl">Wat heb je bij deze woning gezien? (ruimten, schadebeeld)</label>
            <textarea id="tx_situatie" rows="4" class="kb-inp" style="resize:vertical" oninput="setSituatieTekst(this.value)"></textarea>
          </div>
          <div>
            <label class="kb-lbl">Bouwfysische duiding (leeg = standaardtekst van het dossier)</label>
            <textarea id="tx_duiding" rows="4" class="kb-inp" style="resize:vertical" oninput="setDuidingTekst(this.value)"></textarea>
          </div>
        </div>
      </details>
'''

steps = (PARTS / 'steps.html').read_text().replace('%%SELECTOR%%', selector)

shell = f'''  <!-- ============================================================== -->
  <!-- APP: BOVENBALK                                                  -->
  <!-- ============================================================== -->
  <header class="no-print app-top sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800">
    <div class="max-w-3xl mx-auto px-3 pt-2 pb-2 space-y-2">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 p-1 rounded-lg bg-white flex items-center justify-center shrink-0">
          <svg viewBox="0 0 100 100" class="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M42 21L12 51L17 56L23 50V74H29V44L42 31L63 52L68 47L42 21Z" fill="#2563eb"></path>
            <path d="M42 38C42 38 36 47 36 51C36 54.3 38.7 57 42 57C45.3 57 48 54.3 48 51C48 47 42 38 42 38Z" fill="#2563eb"></path>
            <path d="M47 80L32 65L37 60L47 70L88 29L93 34L47 80Z" fill="#eab308"></path>
          </svg>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-[15px] font-black text-white leading-tight">CheckMijn<span class="text-blue-500">Huis</span> <span class="text-slate-400 font-semibold text-[12px]">Advies</span></p>
          <p id="curLabel" class="text-[12px] text-slate-400 truncate">Nieuw advies</p>
        </div>
        <span id="saveState" class="text-[11px] text-emerald-400 font-semibold opacity-0 transition-opacity">Opgeslagen</span>
        <button id="btnDownloadPdf" onclick="downloadPdfDeterministic()" class="px-3 py-2 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white text-[13px] font-bold flex items-center gap-1.5 shrink-0">
          <i data-lucide="file-down" class="w-4 h-4"></i><span>PDF</span>
        </button>
      </div>
      <nav class="grid grid-cols-3 gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-[13px] font-bold">
        <button data-nav="dossiers" onclick="showView('dossiers')" class="nav-btn"><i data-lucide="folder-open" class="w-4 h-4"></i>Adviezen</button>
        <button data-nav="invullen" onclick="showView('invullen')" class="nav-btn"><i data-lucide="pencil" class="w-4 h-4"></i>Invullen</button>
        <button data-nav="voorbeeld" onclick="showView('voorbeeld')" class="nav-btn"><i data-lucide="eye" class="w-4 h-4"></i>Voorbeeld</button>
      </nav>
    </div>
  </header>

  <!-- ============================================================== -->
  <!-- APP: OVERZICHT VAN ADVIEZEN                                     -->
  <!-- ============================================================== -->
  <section id="view-dossiers" class="no-print app-view max-w-3xl mx-auto px-3 py-4 space-y-3">
    <button onclick="newDossier()" class="w-full py-3.5 rounded-2xl bg-blue-600 active:bg-blue-700 text-white text-[16px] font-black flex items-center justify-center gap-2">
      <i data-lucide="plus" class="w-5 h-5"></i> Nieuw advies
    </button>
    <div id="backupHint" class="hidden flex items-center gap-3 p-3 rounded-2xl bg-amber-950/50 border border-amber-700/60 text-amber-100 text-[13px]">
      <span class="flex-1"></span>
      <button onclick="backupMaken()" class="shrink-0 px-3 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-[13px]">Back-up maken</button>
    </div>
    <p id="dossierCount" class="text-[12px] text-slate-500 px-1"></p>
    <div id="dossierList" class="space-y-2"></div>
    <div class="pt-4 border-t border-slate-800 space-y-2">
      <p class="text-[12px] text-slate-400 px-1">Je adviezen staan alleen op dit toestel. Maak regelmatig een back-up, bijvoorbeeld naar iCloud Drive.</p>
      <div class="grid grid-cols-2 gap-2">
        <button onclick="backupMaken()" class="py-3 rounded-xl bg-slate-800 active:bg-slate-700 border border-slate-700 text-white text-[14px] font-bold flex items-center justify-center gap-2"><i data-lucide="download" class="w-4 h-4"></i>Back-up maken</button>
        <label class="py-3 rounded-xl bg-slate-800 active:bg-slate-700 border border-slate-700 text-white text-[14px] font-bold flex items-center justify-center gap-2 cursor-pointer"><i data-lucide="upload" class="w-4 h-4"></i>Terugzetten<input type="file" accept="application/json,.json,text/html,.html,.htm" class="hidden" onchange="backupTerugzetten(this)"></label>
      </div>
    </div>
  </section>

  <!-- ============================================================== -->
  <!-- APP: INVULLEN (stappen in de volgorde van het bezoek)           -->
  <!-- ============================================================== -->
{steps}
'''

a = s.index('<header class="no-print relative z-40')
b = s.index('</header>', a) + len('</header>')
s = s[:a] + shell + s[b:]

R('''  <main id="dossierContainer" class="max-w-4xl mx-auto p-2 sm:p-4">
    <!-- Wordt dynamisch gerenderd door renderAllPages() -->
  </main>''', '''  <div id="previewWrap">
    <main id="dossierContainer">
      <!-- Wordt dynamisch gerenderd door renderAllPages() -->
    </main>
  </div>''')
R('id="exportToast" class="no-print fixed top-24 right-4', 'id="exportToast" class="no-print fixed toast-pos right-3')

# ---------- STIJLEN VOOR DE APP ----------
R('''    /* Print Stijlen */''', '''    /* ---------- web-app ---------- */
    html { -webkit-text-size-adjust: 100%; }
    body { padding-bottom: env(safe-area-inset-bottom); }
    .app-top { padding-top: env(safe-area-inset-top); }
    .toast-pos { top: calc(env(safe-area-inset-top) + 110px); }
    #exportToast.translate-x-full { transform: translateX(calc(100% + 24px)); }
    .nav-btn { display:flex; align-items:center; justify-content:center; gap:6px; padding:9px 4px; border-radius:9px; color:#94a3b8; }
    .nav-btn.nav-active { background:#2563eb; color:#fff; }
    .app-view { display:none; }
    body.view-dossiers #view-dossiers, body.view-invullen #view-invullen { display:block; }
    /* rapport: buiten beeld maar wel opgemaakt, zodat het meten van de pagina's blijft werken */
    #previewWrap { position:absolute; left:-20000px; top:0; visibility:hidden; }
    #dossierContainer { width:794px; transform-origin: top left; }
    body.view-voorbeeld #previewWrap { position:relative; left:auto; visibility:visible; padding:8px; overflow:hidden; }
    body.view-voorbeeld #previewWrap .a4-page { margin: 0 0 16px 0; }
    @media (min-width: 900px) { body.view-voorbeeld #dossierContainer { margin: 0 auto; } }
    /* stappen */
    details.stap { background:#0f172a; border:1px solid #1e293b; border-radius:16px; color:#fff; }
    details.stap > summary { list-style:none; cursor:pointer; display:flex; align-items:center; gap:10px; padding:12px 14px; }
    details.stap > summary::-webkit-details-marker { display:none; }
    .stap-nr { width:26px; height:26px; border-radius:999px; background:#2563eb; color:#fff; font-weight:900; font-size:13px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .stap-titel { font-weight:800; font-size:15px; }
    .stap-sub { font-size:12px; color:#94a3b8; margin-left:auto; text-align:right; }
    .stap-body { padding: 0 14px 14px 14px; }
    .foto-btn { display:inline-flex; align-items:center; gap:6px; padding:10px 14px; border-radius:12px; background:#1e293b; border:1px solid #334155; color:#fff; font-weight:700; font-size:14px; cursor:pointer; }
    .chip { padding:7px 11px; border-radius:999px; border:1px solid #334155; background:#020617; color:#cbd5e1; font-size:13px; font-weight:600; }
    .chip.on { background:#2563eb; border-color:#2563eb; color:#fff; }
    .chip.on-groen { background:#059669; border-color:#059669; color:#fff; }
    .seg { display:grid; grid-template-columns:repeat(3,1fr); gap:4px; }
    .seg button { padding:8px 4px; border-radius:10px; border:1px solid #334155; background:#020617; color:#cbd5e1; font-size:13px; font-weight:700; }
    .seg button.on-droog { background:#059669; border-color:#059669; color:#fff; }
    .seg button.on-verhoogd { background:#d97706; border-color:#d97706; color:#fff; }
    .seg button.on-nat { background:#dc2626; border-color:#dc2626; color:#fff; }
    .mini-chip { padding:4px 8px; border-radius:999px; border:1px solid #334155; color:#94a3b8; font-size:12px; }

    /* geen inzoomen op iPhone bij het aantikken van een veld */
    @media (max-width: 900px) {
      input, select, textarea, .kb-inp { font-size: 16px !important; }
      .kb-lbl { font-size: 11px; white-space: normal; }
    }

    /* Print Stijlen */''')
R('''      #dossierContainer { padding: 0 !important; margin: 0 !important; max-width: none !important; }''',
  '''      #dossierContainer { padding: 0 !important; margin: 0 !important; max-width: none !important; transform: none !important; }
      #previewWrap { position: static !important; left: auto !important; visibility: visible !important; height: auto !important; padding: 0 !important; overflow: visible !important; }
      .app-view, .app-top { display: none !important; }''')

# ---------- SCRIPT ----------
# oorspronkelijke opstartcode vervangen door die van de app
s = re.sub(r"    // INITIALISATIE BIJ LADEN\n    window\.addEventListener\('DOMContentLoaded', \(\) => \{.*?\n    \}\);\n    window\.addEventListener\('beforeprint', \(\) => checkPageOverflow\(\)\);\n", '', s, count=1, flags=re.S)
assert "restoreState();\n      syncInputsFromState();" not in s
app_js = (PARTS / 'app.js').read_text()
i = s.rindex('  </script>')
s = s[:i] + app_js + s[i:]

# fitPages rekent in schermpixels: corrigeren voor de schaal van het voorbeeld
R("""        const used = kids[kids.length - 1].getBoundingClientRect().bottom - body.getBoundingClientRect().top;""",
  """        const f = p.getBoundingClientRect().height / p.offsetHeight || 1;
        const used = (kids[kids.length - 1].getBoundingClientRect().bottom - body.getBoundingClientRect().top) / f;""")
R("""        const avail = footer.getBoundingClientRect().top - body.getBoundingClientRect().top - 8;""",
  """        const avail = (footer.getBoundingClientRect().top - body.getBoundingClientRect().top) / f - 8;""")

OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'index.html').write_text(s)
print('index.html', len(s))
