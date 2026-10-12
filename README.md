# CheckMijnHuis Advies – web-app

Met deze app vul je het vochtadvies (Advies & Plan van Aanpak) ter plaatse in op je iPhone. Daarna sla je het op als PDF.

- **Werkt zonder internet.** Na de eerste keer openen heb je geen verbinding meer nodig.
- **Je adviezen blijven op je eigen toestel.** Ze worden niet naar een server gestuurd, dus ook niet naar GitHub.
- **Alles wordt automatisch opgeslagen.**

## Bestanden

| Bestand | Wat het is |
|---|---|
| `index.html` | De app zelf: alle dossiers, teksten en prijzen |
| `app.css` | De opmaak (inclusief lettertype) |
| `icons.js` | De iconen |
| `sw.js` | Zorgt dat de app offline werkt |
| `manifest.webmanifest` | Naam en icoon voor het beginscherm |
| `fonts/`, `icons/` | Lettertype en app-iconen |

## Online zetten via GitHub Pages (eenmalig)

1. Maak op GitHub een nieuwe repository aan, bijvoorbeeld `checkmijnhuis-advies`.
2. Upload alle bestanden en mappen uit deze map. De structuur moet hetzelfde blijven.
3. Ga naar **Settings → Pages**. Kies bij *Source* "Deploy from a branch", dan branch `main` en map `/ (root)`. Klik op **Save**.
4. Na een minuut staat de app op `https://<jouw-gebruikersnaam>.github.io/checkmijnhuis-advies/`.

Is de repository openbaar? Dan kan iedereen de code van de app zien. Klantgegevens zijn niet zichtbaar, want die staan alleen op je toestel.

## Installeren op je iPhone

1. Open het adres hierboven in **Safari**.
2. Tik op het deelicoon en kies **Zet op beginscherm**.
3. Open de app voortaan via het icoon op je beginscherm.

## Gebruik

- **Adviezen:** het overzicht van al je adviezen. Hier start je een nieuw advies, open of verwijder je er een, en maak je een back-up.
- **Invullen:** alle velden van het advies. Je gevelfoto kun je hier direct met de camera maken.
- **Voorbeeld:** het rapport zoals de klant het krijgt.
- **PDF:** opent het printvenster.
  - Op de iPhone: tik op het deelicoon bovenin het printvoorbeeld en kies **Bewaar in Bestanden**. Of deel de PDF direct via WhatsApp of Mail.
  - Op de computer: kies bij Bestemming **Opslaan als PDF**.

## Back-up (belangrijk)

Je adviezen staan alleen op je iPhone. Verwijder je de app of wis je de Safari-gegevens, dan ben je ze kwijt. Zo voorkom je dat:

- Tik af en toe op **Adviezen → Back-up maken** en bewaar het bestand in iCloud Drive.
- Met **Terugzetten** zet je zo'n back-up terug, ook op een ander toestel of op je computer.

## Een nieuwe versie publiceren

1. Vervang de gewijzigde bestanden in de GitHub-repository.
2. Verhoog in `sw.js` de regel `const VERSIE = 'cmh-v1.0.0';`, bijvoorbeeld naar `cmh-v1.0.1`.
3. Open daarna de app op je iPhone terwijl je online bent. De nieuwe versie wordt dan geladen. Soms moet je de app hiervoor twee keer openen.
