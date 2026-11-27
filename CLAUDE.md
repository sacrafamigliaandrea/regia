# Regia di laboratorio — istruzioni per Claude Code

Web app di Andrea Cerioli (Animatore Digitale, Scuola Sacra Famiglia, Orzinuovi) per guidare le lezioni nel laboratorio di informatica: 28 iMac 21,5" late 2015, macOS Monterey 12.7.6, Chrome, cuffie a filo, gestiti con Apple Remote Desktop. Sostituisce NetSupport School (troppo costoso).

- Produzione: https://regiacerio.vercel.app (`docente.html`, `studente.html`, `index.html`)
- Deploy automatico Vercel a ogni push su `main` (progetto Vercel `regiacerio`, account `sacrafamigliaandrea-1884s-projects`)
- Il portale acerio.vercel.app (repo `sacrafamigliaandrea/acerio`) ha un pulsante **Live** → `studente.html`, con `data-no-track` per saltare il popup del registro lezioni

## Architettura (v2, dal 27/11/2026)

| Pezzo | Ruolo | Costo |
|---|---|---|
| **Firebase Realtime Database** (progetto `regia-lab`, europe-west1) | stato della lezione `regia/{stanza}/stato`, presenza docente `regia/{stanza}/docente`, postazioni + spia `regia/{stanza}/postazioni/{uid}` | gratis |
| **LiveKit Cloud** (progetto `LezioneLive`, regione UE) | SOLO trasmissione schermo + audio scheda in «Guardate me» | 5.000 min/mese gratis, limite rigido; ogni pagina collegata conta 1 min/min |
| **Vercel** `api/token.js` | PIN docente → gettone Firebase personalizzato (JWT RS256 firmato con `node:crypto`) + gettone LiveKit; studenti → config Firebase / gettone LiveKit in sola ricezione | gratis |

Le postazioni si collegano a LiveKit solo quando `stato.modo === 'live'` e si staccano 20 s dopo. Il docente si collega a LiveKit solo mentre trasmette.

### Modalità (tasti 1-5)
1 Attesa · 2 Guardate me (consuma minuti, chiede la scheda se non condivisa) · 3 Occhi a me · 4 Prova tu (app in iframe sulle postazioni) · 5 Video sincronizzato YouTube (riproduzione locale, sync su orologio server Firebase, player senza distrattori) · «Termina lezione» (doppio clic) → `modo:'fine'`, postazioni si scollegano.

### Funzioni
- Spia attenzione: ok (verde) / fuori (ambra) / entra (blu) — visibilità, focus, schermo intero o kiosk
- Kiosk via ARD con `--autoplay-policy=no-user-gesture-required`; comandi ARD generati nel pannello, funzionano come root o utente (`launchctl asuser` + `sudo -u`)
- Nome postazione da `?pc=$(scutil --get ComputerName)`, memorizzato in localStorage
- Screen Wake Lock contro il salvaschermo
- Indicatore consumo LiveKit (ambra/verde) e stima minuti nella testata del pannello
- Catalogo «Prova tu» in `catalogo.json` (campo opzionale `video` = video introduttivo YouTube)

## Variabili d'ambiente (Vercel, Production)
`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `REGIA_PIN`, `FIREBASE_SERVICE_ACCOUNT` (JSON). `FIREBASE_CONFIG` è facoltativa: la config web pubblica è già in `api/token.js`. Mai scrivere segreti nel codice o in chat.

Regole del database: `database.rules.json` (da incollare in Firebase → Realtime Database → Regole se cambiano). Accesso anonimo abilitato in Firebase Authentication.

## Lezioni imparate (non ripeterle)
- **firebase-admin 14 richiede Node ≥ 22**: su Vercel falliva con `ERR_REQUIRE_ESM`. Il gettone Firebase si firma a mano con `node:crypto` — niente firebase-admin.
- livekit-client da CDN: il file è `dist/livekit-client.umd.js` (non esiste `.umd.min.js`).
- livekit-server-sdk: `canPublishSources` vuole l'enum `TrackSource`, non stringhe.
- Niente `alert()`/`confirm()`: bloccano la pagina (e l'estensione Chrome). Errori in riquadri ambra nella pagina.
- Prima di ogni push controllare che ogni `$('id')` abbia l'elemento corrispondente (un riferimento mancante ha bloccato la pagina studente per un'ora):
  ```bash
  python3 -c "import re;s=open('studente.html').read();print(sorted(set(re.findall(r\"\\\$\\('([\\w-]+)'\\)\",s))-set(re.findall(r'id=\"([\\w-]+)\"',s))))"
  ```
  e `node --check` sullo script estratto da ogni pagina.
- Le chiavi LiveKit: il Secret si vede solo alla creazione della chiave.
- Non creare account multipli per aggirare le quote gratuite.
- Le modifiche rischiose vanno su un ramo; si pubblicano su `main` quando il laboratorio è libero. Ripristino rapido: `git revert`.

## Convenzioni di Andrea
- Solo italiano. Vanilla HTML/CSS/JS in file singoli, niente framework né build.
- Palette personale: verde Wimbledon `#1B6D3F` (non mescolare col blu istituzionale `#123E90`). Ambra/verde/blu; niente rosso per errori nelle schermate studenti.
- Zero emoji Unicode: solo icone SVG.
- Credito: «Andrea Cerioli, Animatore Digitale».
- YouTube: IFrame API con `controls:0`, `disablekb:1`, `rel:0`, `iv_load_policy:3`, `playsinline:1`, iframe con `pointer-events:none`, copertina propria, copertura a fine video.
- Commit: autore «Andrea Cerioli».

## Da fare / idee aperte
- Verificare in laboratorio: kiosk + audio automatico su tutti i 28 Mac, Wake Lock contro il salvaschermo, chiusura finestra a «Termina lezione».
- Collegare il catalogo «Prova tu» all'elenco app del portale acerio (186 app su sottodomini `*.vercel.app`).
- Possibili: miniature degli schermi studenti, spia «video bloccato», LiveKit self-hosted o piano Ship se i minuti non bastano.
- Il progetto claude.ai «LabControl» punta a un'app installabile sui Mac: valutare se impacchettare la Regia (es. app menu bar) o restare web.
