<script setup>
import { computed } from 'vue'
import { PhArrowDownLeft, PhArrowUpRight, PhPencilSimple, PhTrash } from '@phosphor-icons/vue'
import { formatFriendlyDate, formatMoney } from '../lib/date.js'

const props = defineProps({
  transactions: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
  limit: { type: Number, default: 0 },
  showDate: { type: Boolean, default: true },
})

defineEmits(['edit', 'delete'])

const visibleTransactions = computed(() => props.limit ? props.transactions.slice(0, props.limit) : props.transactions)
const categoryMap = computed(() => new Map(props.categories.map((item) => [item.id, item])))

function categoryInfo(id) {
  const child = categoryMap.value.get(id)
  const parent = child?.parentId ? categoryMap.value.get(child.parentId) : null
  return {
    primary: parent?.name || '',
    secondary: child?.name || '未分类',
  }
}
</script>

<template>
  <div v-if="visibleTransactions.length" class="transaction-list">
    <article v-for="item in visibleTransactions" :key="item.id" class="transaction-row">
      <span class="transaction-icon" :class="item.type">
        <PhArrowUpRight v-if="item.type === 'expense'" :size="19" weight="bold" />
        <PhArrowDownLeft v-else :size="19" weight="bold" />
      </span>
      <div class="transaction-copy">
        <strong>{{ item.event || categoryInfo(item.categoryId).secondary }}</strong>
        <span><template v-if="showDate">{{ formatFriendlyDate(item.date) }} · </template><template v-if="categoryInfo(item.categoryId).primary">{{ categoryInfo(item.categoryId).primary }} / </template>{{ categoryInfo(item.categoryId).secondary }}</span>
        <small v-if="item.note">{{ item.note }}</small>
      </div>
      <div class="transaction-amount" :class="item.type">
        <strong>{{ item.type === 'expense' ? '-' : '+' }}{{ formatMoney(item.amount) }}</strong>
        <span>{{ item.type === 'expense' ? '支出' : '收入' }}</span>
      </div>
      <div class="row-actions">
        <button type="button" aria-label="编辑流水" @click="$emit('edit', item)"><PhPencilSimple :size="17" /></button>
        <button type="button" aria-label="删除流水" @click="$emit('delete', item)"><PhTrash :size="17" /></button>
      </div>
    </article>
  </div>
</template>
