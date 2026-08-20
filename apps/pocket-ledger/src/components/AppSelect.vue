<script setup>
import { computed, nextTick, ref } from 'vue'
import { PhCaretDown, PhCheck, PhX } from '@phosphor-icons/vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  label: { type: String, required: true },
  placeholder: { type: String, default: '请选择' },
  disabled: Boolean,
})

const emit = defineEmits(['update:modelValue', 'change'])
const open = ref(false)
const trigger = ref(null)
const panel = ref(null)
const selectedOption = computed(() => props.options.find((item) => item.value === props.modelValue))

async function openPicker() {
  if (props.disabled) return
  open.value = true
  await nextTick()
  panel.value?.focus()
}

async function closePicker() {
  open.value = false
  await nextTick()
  trigger.value?.focus()
}

function choose(value) {
  emit('update:modelValue', value)
  emit('change', value)
  closePicker()
}
</script>

<template>
  <button ref="trigger" class="app-select-trigger" type="button" :disabled="disabled" :aria-label="label" aria-haspopup="listbox" :aria-expanded="open" @click="openPicker">
    <span :class="{ placeholder: !selectedOption }">{{ selectedOption?.label || placeholder }}</span>
    <PhCaretDown :size="17" weight="bold" />
  </button>

  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="select-layer" @click.self="closePicker" @keydown.esc="closePicker">
        <section ref="panel" class="select-panel" role="dialog" aria-modal="true" :aria-label="label" tabindex="-1">
          <div class="sheet-handle" aria-hidden="true"></div>
          <header class="select-header">
            <h2>{{ label }}</h2>
            <button class="icon-button" type="button" aria-label="关闭选项" @click="closePicker"><PhX :size="21" /></button>
          </header>
          <div class="select-options" role="listbox" :aria-label="label">
            <button v-for="item in options" :key="item.value" type="button" role="option" :aria-selected="item.value === modelValue" :class="{ selected: item.value === modelValue }" @click="choose(item.value)">
              <span>{{ item.label }}</span>
              <PhCheck v-if="item.value === modelValue" :size="20" weight="bold" />
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
