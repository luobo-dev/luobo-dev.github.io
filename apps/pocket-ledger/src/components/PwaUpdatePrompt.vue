<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { PhArrowClockwise, PhCheckCircle, PhX } from '@phosphor-icons/vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

let registration
let updateTimer

const {
  needRefresh,
  offlineReady,
  updateServiceWorker,
} = useRegisterSW({
  immediate: true,
  onRegisteredSW(_swUrl, swRegistration) {
    registration = swRegistration
  },
})

function checkForUpdate() {
  if (document.visibilityState === 'visible' && navigator.onLine) {
    registration?.update().catch(() => {})
  }
}

function closePrompt() {
  needRefresh.value = false
  offlineReady.value = false
}

async function applyUpdate() {
  await updateServiceWorker(true)
}

onMounted(() => {
  document.addEventListener('visibilitychange', checkForUpdate)
  updateTimer = window.setInterval(checkForUpdate, 60 * 60 * 1000)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', checkForUpdate)
  window.clearInterval(updateTimer)
})
</script>

<template>
  <Transition name="update-prompt">
    <aside v-if="needRefresh || offlineReady" class="pwa-update-prompt" role="status" aria-live="polite">
      <span class="pwa-update-icon">
        <PhArrowClockwise v-if="needRefresh" :size="21" weight="bold" />
        <PhCheckCircle v-else :size="21" weight="fill" />
      </span>
      <div>
        <strong>{{ needRefresh ? '发现新版本' : '已经可以离线使用' }}</strong>
        <p>{{ needRefresh ? '更新只替换应用文件，不会删除账本。' : '断开网络后也能继续记账。' }}</p>
      </div>
      <button v-if="needRefresh" class="pwa-update-action" type="button" @click="applyUpdate">立即更新</button>
      <button v-else class="pwa-update-close" type="button" aria-label="关闭提示" @click="closePrompt"><PhX :size="19" /></button>
    </aside>
  </Transition>
</template>
