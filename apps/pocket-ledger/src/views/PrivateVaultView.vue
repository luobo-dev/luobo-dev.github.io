<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  PhArrowLeft,
  PhCopy,
  PhCreditCard,
  PhDownloadSimple,
  PhEye,
  PhEyeSlash,
  PhKey,
  PhLockKey,
  PhPencilSimple,
  PhPlus,
  PhTrash,
  PhUploadSimple,
  PhX,
} from '@phosphor-icons/vue'
import { createEncryptedVault, unlockEncryptedVault, updateEncryptedVault, validateVaultEnvelope } from '../lib/vaultCrypto.js'
import { getVaultEnvelope, replaceVaultEnvelope, saveVaultEnvelope } from '../lib/vaultDb.js'

const AUTO_LOCK_MS = 3 * 60 * 1000
const router = useRouter()
const status = ref('loading')
const envelope = ref(null)
const vaultKey = ref(null)
const items = ref([])
const error = ref('')
const busy = ref(false)
const setupPassword = ref('')
const setupConfirmation = ref('')
const unlockPassword = ref('')
const editorOpen = ref(false)
const revealedId = ref('')
const copied = ref('')
const importInput = ref(null)
const form = ref(emptyItem())
let lockTimer
let copiedTimer

const sortedItems = computed(() => items.value.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')))

onMounted(async () => {
  envelope.value = await getVaultEnvelope()
  status.value = envelope.value ? 'locked' : 'setup'
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pointerdown', resetLockTimer)
  window.addEventListener('keydown', resetLockTimer)
})

onBeforeUnmount(() => {
  clearTimeout(lockTimer)
  clearTimeout(copiedTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pointerdown', resetLockTimer)
  window.removeEventListener('keydown', resetLockTimer)
  vaultKey.value = null
})

function emptyItem(type = 'card') {
  return { id: '', type, bank: '', cardType: 'debit', cardNumber: '', title: '', username: '', password: '', url: '', note: '', createdAt: '' }
}

function onVisibilityChange() {
  if (document.hidden && status.value === 'unlocked') lockVault()
}

function resetLockTimer() {
  if (status.value !== 'unlocked') return
  clearTimeout(lockTimer)
  lockTimer = setTimeout(lockVault, AUTO_LOCK_MS)
}

function lockVault() {
  clearTimeout(lockTimer)
  vaultKey.value = null
  items.value = []
  unlockPassword.value = ''
  revealedId.value = ''
  editorOpen.value = false
  status.value = envelope.value ? 'locked' : 'setup'
}

async function setupVault() {
  error.value = ''
  if (setupPassword.value.length < 10) {
    error.value = '主密码至少需要 10 个字符'
    return
  }
  if (setupPassword.value !== setupConfirmation.value) {
    error.value = '两次输入的主密码不一致'
    return
  }
  busy.value = true
  try {
    const created = await createEncryptedVault(setupPassword.value)
    await saveVaultEnvelope(created.envelope)
    envelope.value = created.envelope
    vaultKey.value = created.key
    items.value = created.payload.items
    setupPassword.value = ''
    setupConfirmation.value = ''
    status.value = 'unlocked'
    resetLockTimer()
  } catch {
    error.value = '创建保险箱失败，请确认当前浏览器支持安全加密'
  } finally {
    busy.value = false
  }
}

async function unlockVault() {
  if (!unlockPassword.value || busy.value) return
  error.value = ''
  busy.value = true
  try {
    const unlocked = await unlockEncryptedVault(unlockPassword.value, envelope.value)
    vaultKey.value = unlocked.key
    items.value = unlocked.payload.items
    unlockPassword.value = ''
    status.value = 'unlocked'
    resetLockTimer()
  } catch (unlockError) {
    error.value = unlockError.message
  } finally {
    busy.value = false
  }
}

async function persist(nextItems) {
  const nextEnvelope = await updateEncryptedVault(vaultKey.value, { version: 1, items: nextItems }, envelope.value)
  await saveVaultEnvelope(nextEnvelope)
  envelope.value = nextEnvelope
  items.value = nextItems
  resetLockTimer()
}

function openEditor(type, item = null) {
  error.value = ''
  form.value = item ? { ...item } : emptyItem(type)
  editorOpen.value = true
}

function sanitizeCardNumber() {
  form.value.cardNumber = form.value.cardNumber.replace(/\D/g, '').slice(0, 24)
}

async function saveItem() {
  error.value = ''
  if (form.value.type === 'card' && (!form.value.bank.trim() || form.value.cardNumber.length < 8)) {
    error.value = '请填写银行名称和正确的银行卡号'
    return
  }
  if (form.value.type === 'account' && (!form.value.title.trim() || !form.value.password)) {
    error.value = '请填写账号名称和密码'
    return
  }
  busy.value = true
  try {
    const now = new Date().toISOString()
    const item = { ...form.value, id: form.value.id || `secret-${crypto.randomUUID()}`, createdAt: form.value.createdAt || now, updatedAt: now }
    const next = items.value.filter((entry) => entry.id !== item.id)
    next.push(item)
    await persist(next)
    editorOpen.value = false
  } catch {
    error.value = '保存失败，保险箱仍保持原来的内容'
  } finally {
    busy.value = false
  }
}

async function deleteItem(item) {
  const name = item.type === 'card' ? item.bank : item.title
  if (!window.confirm(`确定删除“${name}”吗？删除后无法恢复。`)) return
  await persist(items.value.filter((entry) => entry.id !== item.id))
}

function maskCard(value) {
  const last = value.slice(-4)
  return last ? `•••• •••• •••• ${last}` : '未填写卡号'
}

function formatCard(value) {
  return value.replace(/(.{4})/g, '$1 ').trim()
}

function toggleReveal(id) {
  revealedId.value = revealedId.value === id ? '' : id
}

async function copyValue(value, label) {
  try {
    await navigator.clipboard.writeText(value)
    copied.value = `${label}已复制`
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = '' }, 1800)
  } catch {
    copied.value = '复制失败，请手动选择'
  }
}

function exportVault() {
  const blob = new Blob([JSON.stringify(envelope.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `私密保险箱加密备份-${new Date().toISOString().slice(0, 10)}.vault.json`
  link.click()
  URL.revokeObjectURL(url)
}

async function importVault(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    const imported = JSON.parse(await file.text())
    validateVaultEnvelope(imported)
    if (!window.confirm('恢复加密备份会替换当前保险箱，确定继续吗？')) return
    await replaceVaultEnvelope(imported)
    envelope.value = imported
    lockVault()
  } catch (importError) {
    error.value = importError.message || '备份文件读取失败'
  }
}
</script>

<template>
  <div class="view private-vault-view">
    <header class="records-header">
      <button class="icon-button" type="button" aria-label="返回设置" @click="router.push({ name: 'settings' })"><PhArrowLeft :size="21" /></button>
      <div><p class="section-kicker">本地加密</p><h1>私密保险箱</h1></div>
      <button v-if="status === 'unlocked'" class="icon-button" type="button" aria-label="锁定保险箱" @click="lockVault"><PhLockKey :size="21" /></button>
    </header>

    <div v-if="status === 'loading'" class="period-loading">正在读取加密保险箱...</div>

    <section v-else-if="status === 'setup'" class="vault-auth-panel">
      <span class="vault-auth-icon"><PhLockKey :size="31" weight="duotone" /></span>
      <h2>设置主密码</h2>
      <p>这是第一次进入。主密码只用于在本机解密，应用不会保存它。</p>
      <form @submit.prevent="setupVault">
        <label class="field"><span>主密码</span><input v-model="setupPassword" type="password" minlength="10" autocomplete="new-password" placeholder="至少 10 个字符" required /></label>
        <label class="field"><span>再次输入</span><input v-model="setupConfirmation" type="password" minlength="10" autocomplete="new-password" placeholder="确认主密码" required /></label>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <button class="primary-button full-width" type="submit" :disabled="busy">{{ busy ? '正在创建...' : '创建保险箱' }}</button>
      </form>
      <div class="vault-warning"><strong>请务必记住主密码</strong><span>忘记后无法重置，也无法恢复其中的数据。</span></div>
    </section>

    <section v-else-if="status === 'locked'" class="vault-auth-panel">
      <span class="vault-auth-icon"><PhLockKey :size="31" weight="duotone" /></span>
      <h2>保险箱已锁定</h2>
      <p>输入主密码后，银行卡号和账号内容只在当前页面内存中解密。</p>
      <form @submit.prevent="unlockVault">
        <label class="field"><span>主密码</span><input v-model="unlockPassword" type="password" autocomplete="current-password" autofocus required /></label>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <button class="primary-button full-width" type="submit" :disabled="busy">{{ busy ? '正在解锁...' : '解锁保险箱' }}</button>
      </form>
      <button class="vault-import-link" type="button" @click="importInput?.click()"><PhUploadSimple :size="17" />恢复加密备份</button>
      <input ref="importInput" hidden type="file" accept="application/json,.json" @change="importVault" />
    </section>

    <template v-else>
      <section class="vault-summary">
        <div><span>已安全保存</span><strong>{{ items.length }} 条私密记录</strong><small>离开应用或 3 分钟无操作后自动锁定</small></div>
        <PhLockKey :size="31" weight="duotone" />
      </section>

      <div class="vault-create-actions">
        <button type="button" @click="openEditor('card')"><PhCreditCard :size="20" /><span>新增银行卡</span></button>
        <button type="button" @click="openEditor('account')"><PhKey :size="20" /><span>新增私密账号</span></button>
      </div>

      <p v-if="copied" class="vault-copy-status" role="status">{{ copied }}</p>

      <div v-if="sortedItems.length" class="vault-list">
        <article v-for="item in sortedItems" :key="item.id" class="vault-item">
          <div class="vault-item-icon"><PhCreditCard v-if="item.type === 'card'" :size="22" /><PhKey v-else :size="22" /></div>
          <div class="vault-item-content">
            <span>{{ item.type === 'card' ? (item.cardType === 'credit' ? '信用卡' : '储蓄卡') : '私密账号' }}</span>
            <strong>{{ item.type === 'card' ? item.bank : item.title }}</strong>
            <code v-if="item.type === 'card'">{{ revealedId === item.id ? formatCard(item.cardNumber) : maskCard(item.cardNumber) }}</code>
            <code v-else>{{ revealedId === item.id ? item.password : '••••••••••••' }}</code>
            <small v-if="item.type === 'account' && item.username">{{ item.username }}</small>
          </div>
          <div class="vault-item-actions">
            <button type="button" :aria-label="revealedId === item.id ? '隐藏内容' : '显示内容'" @click="toggleReveal(item.id)"><PhEyeSlash v-if="revealedId === item.id" :size="17" /><PhEye v-else :size="17" /></button>
            <button type="button" aria-label="复制私密内容" @click="copyValue(item.type === 'card' ? item.cardNumber : item.password, item.type === 'card' ? '卡号' : '密码')"><PhCopy :size="17" /></button>
            <button type="button" aria-label="编辑记录" @click="openEditor(item.type, item)"><PhPencilSimple :size="17" /></button>
            <button type="button" aria-label="删除记录" @click="deleteItem(item)"><PhTrash :size="17" /></button>
          </div>
        </article>
      </div>

      <div v-else class="empty-state vault-empty"><span class="empty-mark"><PhPlus :size="23" /></span><h3>保险箱还是空的</h3><p>先添加银行卡或私密账号，保存后所有字段都会整体加密。</p></div>

      <section class="vault-backup-actions">
        <button type="button" @click="exportVault"><PhDownloadSimple :size="18" />导出加密备份</button>
        <button type="button" @click="importInput?.click()"><PhUploadSimple :size="18" />恢复加密备份</button>
        <input ref="importInput" hidden type="file" accept="application/json,.json" @change="importVault" />
      </section>
      <p class="period-privacy-note">保险箱不会保存主密码。导出的备份仍然是密文，必须使用原主密码解锁。</p>
    </template>

    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="editorOpen" class="sheet-layer" @click.self="editorOpen = false">
          <section class="sheet-panel compact-sheet vault-editor-sheet" role="dialog" aria-modal="true" aria-label="编辑私密记录">
            <div class="sheet-handle"></div>
            <header class="sheet-header">
              <div><p class="section-kicker">加密保存</p><h2>{{ form.id ? '编辑' : '新增' }}{{ form.type === 'card' ? '银行卡' : '私密账号' }}</h2></div>
              <button class="icon-button" type="button" aria-label="关闭" @click="editorOpen = false"><PhX :size="22" /></button>
            </header>
            <form class="category-form" @submit.prevent="saveItem">
              <template v-if="form.type === 'card'">
                <label class="field"><span>银行名称</span><input v-model="form.bank" maxlength="40" autocomplete="off" placeholder="例如：中国工商银行" required /></label>
                <div class="field"><span>银行卡类型</span><div class="type-toggle"><button type="button" :class="{ active: form.cardType === 'debit' }" @click="form.cardType = 'debit'">储蓄卡</button><button type="button" :class="{ active: form.cardType === 'credit' }" @click="form.cardType = 'credit'">信用卡</button></div></div>
                <label class="field"><span>银行卡号</span><input v-model="form.cardNumber" type="text" inputmode="numeric" autocomplete="off" placeholder="输入完整卡号" required @input="sanitizeCardNumber" /></label>
              </template>
              <template v-else>
                <label class="field"><span>账号名称</span><input v-model="form.title" maxlength="60" autocomplete="off" placeholder="例如：邮箱、网站或应用名称" required /></label>
                <label class="field"><span>用户名</span><input v-model="form.username" maxlength="120" autocapitalize="none" autocomplete="off" spellcheck="false" /></label>
                <label class="field"><span>密码</span><input v-model="form.password" type="password" maxlength="300" autocomplete="new-password" required /></label>
                <label class="field"><span>网址（可选）</span><input v-model="form.url" type="url" maxlength="300" autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="https://" /></label>
              </template>
              <label class="field"><span>备注（可选）</span><textarea v-model="form.note" maxlength="300" rows="2"></textarea></label>
              <p v-if="form.type === 'card'" class="vault-field-warning">请勿记录取款密码、CVV 安全码或短信验证码。</p>
              <p v-if="error" class="form-error" role="alert">{{ error }}</p>
              <button class="primary-button full-width" type="submit" :disabled="busy">{{ busy ? '正在加密...' : '加密并保存' }}</button>
            </form>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
