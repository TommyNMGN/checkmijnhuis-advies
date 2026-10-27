# Bronbestanden van de CheckMijnHuis-app

De app die online staat (`index.html` in de hoofdmap) wordt gebouwd uit deze bronbestanden. Wijzig altijd de bron en bouw daarna opnieuw; pas `index.html` niet rechtstreeks aan.

| Bestand | Inhoud |
|---|---|
| `advies.html` | Het rapportsjabloon: alle 7 adviestypes, teksten, prijzen, opmaak en logica van het rapport |
| `app_parts/steps.html` | De 8 invulstappen van de app |
| `app_parts/app.js` | App-logica: dossiers (IndexedDB), automatisch opslaan, back-up, HTML-export, standaardtekst bij aantikken |
| `app_parts/build.py` | Bouwt `index.html` uit `advies.html` + `steps.html` + `app.js` |
| `tailwind/` | Instellingen om `app.css` te maken |

## Bouwen

```bash
# 1. index.html bouwen (vanuit de map bron/app_parts)
python3 build.py ../advies.html ../..          # schrijft ../../index.html

# 2. app.css maken (vanuit de map bron/tailwind, eenmalig: npm install)
npx tailwindcss -c app.config.js -i app-in.css -o ../../app.css --minify

# 3. In sw.js de VERSIE ophogen (bijv. 'cmh-v1.3.5' -> 'cmh-v1.3.6'),
#    anders blijven telefoons de oude versie gebruiken.

# 4. Commit en push naar main; GitHub Pages zet het binnen een paar minuten online.
```

Controleer na een wijziging dat alle rapporten nog op 5 pagina's passen (alle 7 adviestypes × optie A/B/C).
