// Regia — emissione gettoni LiveKit (Vercel Serverless Function, Node)
// Variabili d'ambiente richieste su Vercel:
//   LIVEKIT_URL         wss://<progetto>.livekit.cloud
//   LIVEKIT_API_KEY     dalla dashboard LiveKit Cloud
//   LIVEKIT_API_SECRET  dalla dashboard LiveKit Cloud
//   REGIA_PIN           PIN del docente (solo cifre o lettere, min 4 caratteri)
import { AccessToken, TrackSource } from 'livekit-server-sdk';
import { timingSafeEqual, randomBytes } from 'node:crypto';

const pulisci = (s, max = 40) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, max);

function pinValido(inviato) {
  const atteso = (process.env.REGIA_PIN || '').trim();
  if (atteso.length < 4) return false;
  const a = Buffer.from(String(inviato || ''));
  const b = Buffer.from(atteso);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ errore: 'Metodo non consentito' });

  // trim(): un valore incollato con spazi o a capo produce un gettone "invalid token"
  const LIVEKIT_URL = (process.env.LIVEKIT_URL || '').trim();
  const LIVEKIT_API_KEY = (process.env.LIVEKIT_API_KEY || '').trim();
  const LIVEKIT_API_SECRET = (process.env.LIVEKIT_API_SECRET || '').trim();
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return res.status(500).json({ errore: 'Server non configurato: mancano le variabili LiveKit' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { ruolo, stanza, pin, nome } = body || {};

  const room = pulisci(stanza) || 'lab';
  const docente = ruolo === 'docente';

  if (docente && !pinValido(pin)) {
    await new Promise(r => setTimeout(r, 800)); // rallenta i tentativi a vuoto
    return res.status(401).json({ errore: 'PIN non valido' });
  }

  const suffisso = randomBytes(3).toString('hex');
  const identity = docente ? 'docente' : `pc-${pulisci(nome, 24) || 'anonimo'}-${suffisso}`;

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: docente ? 'Docente' : (String(nome || '').slice(0, 24) || 'Postazione'),
    ttl: '4h',
  });
  at.addGrant({
    roomJoin: true,
    room,
    canSubscribe: true,
    canPublish: docente,          // gli studenti ricevono soltanto
    canPublishData: docente,
    // docente: pubblica lo stato della regia; studente: pubblica solo la propria «spia» (attento/fuori)
    canUpdateOwnMetadata: true,
    ...(docente ? { canPublishSources: [TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO] } : {}),
  });

  return res.status(200).json({ token: await at.toJwt(), url: LIVEKIT_URL, stanza: room });
}
