import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(readFileSync(new URL('../serviceAccountKey.json', import.meta.url)));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const patchPath = process.argv[2];
if (!patchPath) {
  console.error('Usage: node scripts/apply-magazine-patch.mjs <patch.json>');
  process.exit(1);
}
const patch = JSON.parse(readFileSync(patchPath, 'utf8'));
const ids = Object.keys(patch);
console.log('Fiches à mettre à jour :', ids.length);

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const chunks = chunkArray(ids, 400);
let done = 0;
for (const chunk of chunks) {
  const batch = db.batch();
  chunk.forEach(id => {
    const p = patch[id];
    batch.update(db.collection('catalog').doc(id), { img: p.img, dateParution: p.dateParution, y: p.y });
  });
  await batch.commit();
  done += chunk.length;
  console.log(`${done}/${ids.length} fiches enregistrées`);
}
console.log('Terminé.');
