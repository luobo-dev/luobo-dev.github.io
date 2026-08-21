import { openDB } from 'idb'

const dbPromise = openDB('personal-private-vault', 1, {
  upgrade(db) {
    db.createObjectStore('vault', { keyPath: 'id' })
  },
})

export async function getVaultEnvelope() {
  return (await dbPromise).get('vault', 'vault')
}

export async function saveVaultEnvelope(envelope) {
  return (await dbPromise).put('vault', envelope)
}

export async function replaceVaultEnvelope(envelope) {
  const db = await dbPromise
  const tx = db.transaction('vault', 'readwrite')
  await tx.store.clear()
  if (envelope) await tx.store.put(envelope)
  await tx.done
}
