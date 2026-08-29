import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(readFileSync(new URL('../serviceAccountKey.json', import.meta.url)));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const snap = await db.collection('catalog').where('type', '==', 'derive').where('sousCat', '==', 'Magazines').get();
console.log('Fiches Magazines trouvées :', snap.size);

let toActu = 0, toRetro = 0;
for (const chunk of chunkArray(snap.docs, 400)) {
  const batch = db.batch();
  chunk.forEach(d => {
    const data = d.data();
    const hasDate = !!((data.dateParution && data.dateParution.trim()) || (data.y && data.y.trim()));
    batch.update(d.ref, { sousCat: hasDate ? 'Actualité JV' : 'Retrogaming' });
    if (hasDate) toActu++; else toRetro++;
  });
  await batch.commit();
}
console.log('-> Actualité JV :', toActu, '/ Retrogaming :', toRetro);

await db.collection('meta').doc('subcats').set({
  derive: FieldValue.arrayUnion('Actualité JV', 'Retrogaming'),
}, { merge: true });
await db.collection('meta').doc('subcats').set({
  derive: FieldValue.arrayRemove('Magazines'),
}, { merge: true });

await db.collection('meta').doc('status').set({
  catalogMigrationV8: true,
  catalogMigrationV8At: FieldValue.serverTimestamp(),
}, { merge: true });

console.log('Terminé.');
