const ITERATIONS = 600000
const AAD = new TextEncoder().encode('pocket-ledger-private-vault:v1')

function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length))
}

function toBase64(bytes) {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

function fromBase64(value) {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function deriveKey(password, salt, iterations = ITERATIONS) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function encryptWithKey(key, payload, kdf) {
  const iv = randomBytes(12)
  const plaintext = new TextEncoder().encode(JSON.stringify(payload))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD, tagLength: 128 }, key, plaintext)
  return {
    id: 'vault',
    version: 1,
    kdf,
    cipher: { name: 'AES-GCM', iv: toBase64(iv), data: toBase64(new Uint8Array(ciphertext)) },
    updatedAt: new Date().toISOString(),
  }
}

export async function createEncryptedVault(password) {
  const salt = randomBytes(16)
  const kdf = { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: toBase64(salt) }
  const key = await deriveKey(password, salt, ITERATIONS)
  const envelope = await encryptWithKey(key, { version: 1, items: [] }, kdf)
  return { key, envelope, payload: { version: 1, items: [] } }
}

export async function unlockEncryptedVault(password, envelope) {
  validateVaultEnvelope(envelope)
  try {
    const key = await deriveKey(password, fromBase64(envelope.kdf.salt), envelope.kdf.iterations)
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(envelope.cipher.iv), additionalData: AAD, tagLength: 128 },
      key,
      fromBase64(envelope.cipher.data),
    )
    const payload = JSON.parse(new TextDecoder().decode(plaintext))
    if (payload?.version !== 1 || !Array.isArray(payload.items)) throw new Error('invalid payload')
    return { key, payload }
  } catch {
    throw new Error('主密码错误或保险箱数据已损坏')
  }
}

export function updateEncryptedVault(key, payload, envelope) {
  validateVaultEnvelope(envelope)
  return encryptWithKey(key, payload, envelope.kdf)
}

export function validateVaultEnvelope(envelope) {
  const valid = envelope?.id === 'vault'
    && envelope.version === 1
    && envelope.kdf?.name === 'PBKDF2'
    && envelope.kdf?.hash === 'SHA-256'
    && envelope.kdf?.iterations === ITERATIONS
    && typeof envelope.kdf?.salt === 'string'
    && envelope.cipher?.name === 'AES-GCM'
    && typeof envelope.cipher?.iv === 'string'
    && typeof envelope.cipher?.data === 'string'
  if (!valid) throw new Error('这不是有效的私密保险箱备份')
  return true
}
