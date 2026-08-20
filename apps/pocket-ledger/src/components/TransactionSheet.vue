<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { PhX } from '@phosphor-icons/vue'
import { localDateString } from '../lib/date.js'
import { evaluateAmountExpression } from '../lib/amount.js'
import CategorySelect from './CategorySelect.vue'

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
    categoryId: '',
    event: '',
    note: '',
  }
}

const availableCategories = computed(() => props.categories.filter((item) => item.type === form.value.type))

watch(() => props.open, async (open) => {
  if (!open) return
  error.value = ''
  if (props.transaction) {
    form.value = {
      ...props.transaction,
      event: props.transaction.event || '',
      note: props.transaction.note || '',
    }
  } else {
    form.value = emptyForm()
    pickFirstCategory()
  }
  await nextTick()
  amountInput.value?.focus()
})

function pickFirstCategory() {
  const parents = availableCategories.value.filter((item) => !item.parentId)
  const children = availableCategories.value.filter((item) => item.parentId)
  const foodCategory = parents.find((item) => item.name === '食品酒水')
  const preferred = children.find((item) => item.parentId === foodCategory?.id && item.name === '早午晚餐')
  form.value.categoryId = preferred?.id || children[0]?.id || ''
}

function setType(type) {
  if (form.value.type === type) return
  form.value.type = type
  pickFirstCategory()
}

function sanitizeAmount() {
  form.value.amount = String(form.value.amount ?? '').replace(/[^\d.+\-−*/×÷]/g, '')
  error.value = ''
}

function appendOperator(operator) {
  const amount = String(form.value.amount ?? '')
  if (!amount && operator !== '-') return
  form.value.amount = /[+\-−*/×÷]$/.test(amount) ? `${amount.slice(0, -1)}${operator}` : `${amount}${operator}`
  error.value = ''
  amountInput.value?.focus()
}

function calculateAmount() {
  try {
    const amount = evaluateAmountExpression(form.value.amount)
    if (amount <= 0) throw new Error('计算结果需要大于 0')
    form.value.amount = String(amount)
    error.value = ''
    return amount
  } catch (calculationError) {
    error.value = calculationError.message
    return null
  }
}

function clearAmount() {
  form.value.amount = ''
  error.value = ''
  amountInput.value?.focus()
}

function submit() {
  const amount = calculateAmount()
  if (amount === null) return
  if (!form.value.date || !form.value.categoryId) {
    error.value = '请选择日期和分类'
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
        <section class="sheet-panel transaction-sheet" role="dialog" aria-modal="true" :aria-label="transaction ? '编辑流水' : '记一笔'">
          <div class="sheet-handle" aria-hidden="true"></div>
          <header class="sheet-header">
            <h2>{{ transaction ? '编辑流水' : '记一笔' }}</h2>
            <button class="icon-button" type="button" aria-label="关闭" @click="emit('close')">
              <PhX :size="22" />
            </button>
          </header>

          <form id="transaction-form" class="transaction-form" @submit.prevent="submit">
            <div class="type-toggle" aria-label="交易类型">
              <button type="button" :class="{ active: form.type === 'expense' }" @click="setType('expense')">支出</button>
              <button type="button" :class="{ active: form.type === 'income' }" @click="setType('income')">收入</button>
            </div>

            <div class="field amount-field">
              <span id="amount-label">金额</span>
              <span class="money-input">
                <span>¥</span>
                <input id="amount" ref="amountInput" v-model="form.amount" type="text" inputmode="decimal" enterkeyhint="done" aria-labelledby="amount-label" placeholder="0.00 或 12+8" @input="sanitizeAmount" @keydown.enter.prevent="calculateAmount" />
              </span>
              <div class="amount-operators" aria-label="金额运算">
                <button v-for="operator in ['+', '−', '×', '÷']" :key="operator" type="button" :aria-label="`${operator}运算`" @pointerdown.prevent @click="appendOperator(operator)">{{ operator }}</button>
                <button class="equals" type="button" aria-label="计算结果" @pointerdown.prevent @click="calculateAmount">=</button>
                <button class="clear" type="button" @pointerdown.prevent @click="clearAmount">清空</button>
              </div>
            </div>

            <label class="field">
              <span>日期</span>
              <input v-model="form.date" type="date" required />
            </label>

            <div class="field">
              <span>分类</span>
              <CategorySelect v-model="form.categoryId" :categories="availableCategories" />
            </div>

            <label class="field">
              <span>事项</span>
              <input v-model="form.event" maxlength="40" placeholder="例如：和朋友吃火锅" />
            </label>

            <label class="field">
              <span>备注</span>
              <textarea v-model="form.note" maxlength="120" rows="2" placeholder="地点、付款方式或其他补充"></textarea>
            </label>
          </form>

          <footer class="transaction-actions">
            <p v-if="error" class="form-error" role="alert">{{ error }}</p>
            <button class="primary-button full-width" type="submit" form="transaction-form">保存流水</button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
