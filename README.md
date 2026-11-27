# Regia di laboratorio

Trasmette lo schermo del Mac docente (una scheda, una finestra o lo schermo intero) a tutte le postazioni, anche via WiFi: il docente invia **un solo flusso** a LiveKit, che lo distribuisce. Nessuna modifica alle app trasmesse.

```
regia/
├── index.html        scelta Docente / Postazione
├── docente.html      regia: condivisione, modalità, catalogo, postazioni collegate
├── studente.html     vista kiosk delle postazioni
├── catalogo.json     elenco app per «Prova tu» (modificabile)
├── api/token.js      emette i gettoni LiveKit (funzione serverless Vercel)
└── package.json
```

## Messa in linea (circa 15 minuti, una volta sola)

1. **LiveKit Cloud** → cloud.livekit.io → crea un account (piano Build, gratuito, senza carta) → *New project*.
   Da *Settings › Keys* copia **URL** (`wss://…livekit.cloud`), **API Key** e **API Secret**.
2. **GitHub** → nuovo repository `regia` con questi file.
3. **Vercel** → *Add New › Project* → importa il repository → in *Environment Variables* aggiungi:

   | Nome | Valore |
   |---|---|
   | `LIVEKIT_URL` | `wss://…livekit.cloud` |
   | `LIVEKIT_API_KEY` | la chiave |
   | `LIVEKIT_API_SECRET` | il segreto |
   | `REGIA_PIN` | il tuo PIN (almeno 4 caratteri) |

   → *Deploy*. Se cambi una variabile, serve un *Redeploy*.

## Uso in classe

1. Sul Mac docente apri `https://<regia>.vercel.app/docente.html` → stanza `lab` + PIN.
2. Copia il **comando ARD** che compare in fondo alla pagina → ARD › *Send UNIX Command* come *utente corrente* sui 28 Mac. Ogni postazione si presenta col proprio nome (`scutil --get ComputerName`).
3. Gli studenti cliccano **Entra** (serve un clic per lo schermo intero).
4. **Condividi una scheda** → scegli l'app. Modalità (anche coi tasti 1-4):
   - **1 Attesa**: schermata di attesa
   - **2 Guardate me**: il tuo schermo in diretta
   - **3 Occhi a me**: schermo fermo con il tuo messaggio
   - **4 Prova tu**: ogni postazione apre l'app selezionata (in un riquadro) e la usa; con il tasto 2 tornano tutti alla diretta

Chi si collega in ritardo o ricarica la pagina riceve subito la modalità in corso.

## Parametri della pagina studente
- `?stanza=lab` stanza (default `lab`): stanze diverse = classi o docenti diversi in parallelo
- `?pc=iMac-12` nome della postazione
- `?auto=1` salta il pulsante Entra (senza schermo intero)

## Catalogo
`catalogo.json` è un array di `{ "titolo", "url", "categoria" }` (accetta anche `{ "app": [...] }`). Se il portale ha già un elenco delle app, basta esportarlo in questo formato. Un URL fuori catalogo si incolla direttamente nella regia.

## Limiti da conoscere
- **Piano gratuito**: 5.000 minuti WebRTC/mese, a conteggio per partecipante. 29 persone × 10 min = 290 min → circa 17 spiegazioni da 10 minuti al mese. Superata la quota, il servizio si ferma fino al mese successivo (non addebita nulla).
- **Banda**: circa 0,5–1,2 Mbps per postazione in «Testo nitido», di più in «Fluido».
- **Prova tu** carica l'app in un iframe: funziona con le app su Vercel (che di default non vietano l'incorporamento). Un sito che blocca l'incorporamento mostrerà una pagina vuota.
- **Privacy**: transitano solo il flusso video dello schermo docente e i nomi delle postazioni; nessun dato degli studenti. LiveKit è un fornitore terzo: da registrare nel registro dei trattamenti/DPIA della scuola.
