<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { PhX } from '@phosphor-icons/vue'
import { localDateString } from '../lib/date.js'

const props = defineProps({
  open: Boolean,
  transaction: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'save'])
const amountInput = ref(null)
const error = ref('')
const form = ref(emptyForm())

function emptyForm() {
  return {
    id: '',
    type: 'expense',
    amount: '',
    date: localDateString(),
    primaryCategoryId: '',
    categoryId: '',
    event: '',
    note: '',
  }
}

const primaryCategories = computed(() => props.categories.filter((item) => item.type === form.value.type && !item.parentId))
const secondaryCategories = computed(() => props.categories.filter((item) => item.parentId === form.value.primaryCategoryId))

watch(() => props.open, async (open) => {
  if (!open) return
  error.value = ''
  if (props.transaction) {
    const category = props.categories.find((item) => item.id === props.transaction.categoryId)
    form.value = {
      ...props.transaction,
      event: props.transaction.event || '',
      note: props.transaction.note || '',
      primaryCategoryId: category?.parentId || category?.id || '',
    }
  } else {
    form.value = emptyForm()
    pickFirstCategory()
  }
  await nextTick()
  amountInput.value?.focus()
})

function pickFirstCategory() {
  const primary = props.categories.find((item) => item.type === form.value.type && !item.parentId)
  form.value.primaryCategoryId = primary?.id || ''
  form.value.categoryId = props.categories.find((item) => item.parentId === primary?.id)?.id || ''
}

function setType(type) {
  if (form.value.type === type) return
  form.value.type = type
  pickFirstCategory()
}

function pickFirstSecondary() {
  form.value.categoryId = secondaryCategories.value[0]?.id || ''
}

function submit() {
  const amount = Number(form.value.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    error.value = '请输入大于 0 的金额'
    return
  }
  if (!form.value.date || !form.value.primaryCategoryId || !form.value.categoryId) {
    error.value = '请完整选择日期和分类'
    return
  }
  emit('save', {
    id: form.value.id || undefined,
    type: form.value.type,
    amount,
    date: form.value.date,
    categoryId: form.value.categoryId,
    event: form.value.event.trim(),
    note: form.value.note.trim(),
    createdAt: form.value.createdAt,
  })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="sheet-layer" @click.self="emit('close')">
        <section class="sheet-panel" role="dialog" aria-modal="true" :aria-label="transaction ? '编辑流水' : '记一笔'">
          <div class="sheet-handle" aria-hidden="true"></div>
          <header class="sheet-header">
            <div>
              <p class="section-kicker">{{ transaction ? '修改记录' : '新的记录' }}</p>
              <h2>{{ transaction ? '编辑流水' : '记一笔' }}</h2>
            </div>
            <button class="icon-button" type="button" aria-label="关闭" @click="emit('close')">
              <PhX :size="22" />
            </button>
          </header>

          <form class="transaction-form" @submit.prevent="submit">
            <div class="type-toggle" aria-label="交易类型">
              <button type="button" :class="{ active: form.type === 'expense' }" @click="setType('expense')">支出</button>
              <button type="button" :class="{ active: form.type === 'income' }" @click="setType('income')">收入</button>
            </div>

            <label class="field amount-field">
              <span>金额</span>
              <span class="money-input">
                <span>¥</span>
                <input ref="amountInput" v-model="form.amount" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="0.00" />
              </span>
            </label>

            <label class="field">
              <span>日期</span>
              <input v-model="form.date" type="date" required />
            </label>

            <div class="field-grid">
              <label class="field">
                <span>一级分类</span>
                <select v-model="form.primaryCategoryId" required @change="pickFirstSecondary">
                  <option v-for="item in primaryCategories" :key="item.id" :value="item.id">{{ item.name }}</option>
                </select>
              </label>
              <label class="field">
                <span>二级分类</span>
                <select v-model="form.categoryId" required>
                  <option v-for="item in secondaryCategories" :key="item.id" :value="item.id">{{ item.name }}</option>
                </select>
              </label>
            </div>

            <label class="field">
              <span>事项</span>
              <input v-model="form.event" maxlength="40" placeholder="例如：和朋友吃火锅" />
              <small>写下这笔钱对应的事件，之后更容易回想。</small>
            </label>

            <label class="field">
              <span>备注</span>
              <textarea v-model="form.note" maxlength="120" rows="3" placeholder="地点、付款方式或其他补充"></textarea>
            </label>

            <p v-if="error" class="form-error" role="alert">{{ error }}</p>
            <button class="primary-button full-width" type="submit">保存流水</button>
          </form>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
