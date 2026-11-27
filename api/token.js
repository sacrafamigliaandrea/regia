// Regia — accesso (Vercel Serverless Function, Node)
//
// Firebase Realtime Database porta lo stato della lezione e le postazioni (gratis, sempre collegato).
// LiveKit serve SOLO per trasmettere lo schermo («Guardate me»): i minuti si consumano solo lì.
//
// Variabili d'ambiente su Vercel:
//   LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET   progetto LiveKit
//   REGIA_PIN                                          PIN del docente (min 4 caratteri)
//   FIREBASE_CONFIG                                    configurazione web di Firebase (JSON, non segreta)
//   FIREBASE_SERVICE_ACCOUNT                           chiave dell'account di servizio (JSON, SEGRETA)
//
// Richieste (POST JSON):
//   { ruolo:'studente', stanza, nome }                 → { firebase, stanza }
//   { ruolo:'studente', stanza, nome, livekit:true }   → { token, url, stanza }   (solo durante lo schermo)
//   { ruolo:'docente',  stanza, pin }                  → { firebase, fbToken, token, url, stanza }
import { AccessToken, TrackSource } from 'livekit-server-sdk';
import { timingSafeEqual, randomBytes } from 'node:crypto';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const env = k => (process.env[k] || '').trim();
const pulisci = (s, max = 40) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, max);

function pinValido(inviato) {
  const atteso = env('REGIA_PIN');
  if (atteso.length < 4) return false;
  const a = Buffer.from(String(inviato || ''));
  const b = Buffer.from(atteso);
  return a.length === b.length && timingSafeEqual(a, b);
}

function configFirebase() {
  try { return JSON.parse(env('FIREBASE_CONFIG')); } catch { return null; }
}

function appFirebase() {
  if (getApps().length) return getApps()[0];
  const sa = JSON.parse(env('FIREBASE_SERVICE_ACCOUNT'));
  return initializeApp({ credential: cert(sa) });
}

async function gettoneLiveKit(room, docente, nome) {
  const at = new AccessToken(env('LIVEKIT_API_KEY'), env('LIVEKIT_API_SECRET'), {
    identity: docente ? 'docente' : `pc-${pulisci(nome, 24) || 'anonimo'}-${randomBytes(3).toString('hex')}`,
    name: docente ? 'Docente' : (String(nome || '').slice(0, 24) || 'Postazione'),
    ttl: '4h',
  });
  at.addGrant({
    roomJoin: true,
    room,
    canSubscribe: !docente,
    canPublish: docente,
    canPublishData: false,
    ...(docente ? { canPublishSources: [TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO] } : {}),
  });
  return at.toJwt();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ errore: 'Metodo non consentito' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { ruolo, stanza, pin, nome, livekit } = body || {};
  const room = pulisci(stanza) || 'lab';
  const docente = ruolo === 'docente';

  const firebase = configFirebase();
  if (!firebase) return res.status(500).json({ errore: 'Server non configurato: manca FIREBASE_CONFIG' });

  try {
    if (!docente) {
      if (!livekit) return res.status(200).json({ firebase, stanza: room });
      return res.status(200).json({ token: await gettoneLiveKit(room, false, nome), url: env('LIVEKIT_URL'), stanza: room });
    }

    if (!pinValido(pin)) {
      await new Promise(r => setTimeout(r, 800)); // rallenta i tentativi a vuoto
      return res.status(401).json({ errore: 'PIN non valido' });
    }
    const fbToken = await getAuth(appFirebase()).createCustomToken('docente-' + room, { docente: true, stanza: room });
    return res.status(200).json({
      firebase, fbToken, stanza: room,
      token: await gettoneLiveKit(room, true), url: env('LIVEKIT_URL'),
    });
  } catch (e) {
    console.error('[regia/token]', e);
    return res.status(500).json({ errore: 'Errore del server: ' + (e.message || e) });
  }
}
