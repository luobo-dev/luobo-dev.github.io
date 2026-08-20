<script setup>
import { computed, nextTick, ref } from 'vue'
import { PhCaretDown, PhCheck, PhX } from '@phosphor-icons/vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  categories: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])
const open = ref(false)
const activeParentId = ref('')
const trigger = ref(null)
const panel = ref(null)

const parents = computed(() => props.categories.filter((item) => !item.parentId))
const children = computed(() => props.categories.filter((item) => item.parentId === activeParentId.value))
const selectedChild = computed(() => props.categories.find((item) => item.id === props.modelValue))
const selectedParent = computed(() => props.categories.find((item) => item.id === selectedChild.value?.parentId))

async function openPicker() {
  activeParentId.value = selectedParent.value?.id || parents.value[0]?.id || ''
  open.value = true
  await nextTick()
  panel.value?.focus()
}

async function closePicker() {
  open.value = false
  await nextTick()
  trigger.value?.focus()
}

function choose(id) {
  emit('update:modelValue', id)
  closePicker()
}
</script>

<template>
  <button ref="trigger" class="app-select-trigger" type="button" aria-label="选择分类" aria-haspopup="dialog" :aria-expanded="open" @click="openPicker">
    <span :class="{ placeholder: !selectedChild }">{{ selectedChild ? `${selectedParent?.name || '未分类'} / ${selectedChild.name}` : '请选择分类' }}</span>
    <PhCaretDown :size="17" weight="bold" />
  </button>

  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="select-layer" @click.self="closePicker" @keydown.esc="closePicker">
        <section ref="panel" class="select-panel category-select-panel" role="dialog" aria-modal="true" aria-label="选择分类" tabindex="-1">
          <div class="sheet-handle" aria-hidden="true"></div>
          <header class="select-header">
            <h2>选择分类</h2>
            <button class="icon-button" type="button" aria-label="关闭分类选择" @click="closePicker"><PhX :size="21" /></button>
          </header>

          <div class="category-primary-tabs" role="tablist" aria-label="一级分类">
            <button v-for="item in parents" :key="item.id" type="button" role="tab" :aria-selected="activeParentId === item.id" :class="{ active: activeParentId === item.id }" @click="activeParentId = item.id">{{ item.name }}</button>
          </div>

          <div v-if="children.length" class="select-options category-secondary-options" role="listbox" aria-label="二级分类">
            <button v-for="item in children" :key="item.id" type="button" role="option" :aria-selected="item.id === modelValue" :class="{ selected: item.id === modelValue }" @click="choose(item.id)">
              <span>{{ item.name }}</span>
              <PhCheck v-if="item.id === modelValue" :size="20" weight="bold" />
            </button>
          </div>
          <p v-else class="category-select-empty">这个一级分类还没有二级分类</p>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
