<script setup>
import { computed, ref } from 'vue'
import { PhFolderSimple, PhPencilSimple, PhPlus, PhTrash, PhX } from '@phosphor-icons/vue'
import AppSelect from '../components/AppSelect.vue'

const props = defineProps({ categories: { type: Array, default: () => [] } })
const emit = defineEmits(['save', 'delete'])

const activeType = ref('expense')
const editorOpen = ref(false)
const error = ref('')
const form = ref({ id: '', name: '', type: 'expense', parentId: '' })

const groups = computed(() => props.categories
  .filter((item) => item.type === activeType.value && !item.parentId)
  .map((primary) => ({
    ...primary,
    children: props.categories.filter((item) => item.parentId === primary.id),
  })))

const parentOptions = computed(() => props.categories.filter((item) => item.type === form.value.type && !item.parentId && item.id !== form.value.id))

function openEditor(item = null, parentId = '') {
  error.value = ''
  form.value = item
    ? { id: item.id, name: item.name, type: item.type, parentId: item.parentId || '' }
    : { id: '', name: '', type: activeType.value, parentId }
  editorOpen.value = true
}

function submit() {
  if (!form.value.name.trim()) {
    error.value = '请输入分类名称'
    return
  }
  emit('save', { ...form.value, name: form.value.name.trim(), parentId: form.value.parentId || null })
  editorOpen.value = false
}
</script>

<template>
  <div class="view categories-view">
    <header class="page-header">
      <div>
        <p class="section-kicker">分类</p>
        <h1>整理你的分类</h1>
      </div>
      <button class="icon-button" type="button" aria-label="新增一级分类" @click="openEditor()"><PhPlus :size="21" /></button>
    </header>

    <div class="type-toggle category-type-toggle">
      <button type="button" :class="{ active: activeType === 'expense' }" @click="activeType = 'expense'">支出分类</button>
      <button type="button" :class="{ active: activeType === 'income' }" @click="activeType = 'income'">收入分类</button>
    </div>

    <div class="category-groups">
      <section v-for="group in groups" :key="group.id" class="category-group">
        <header>
          <span class="category-folder"><PhFolderSimple :size="20" weight="fill" /></span>
          <strong>{{ group.name }}</strong>
          <span>{{ group.children.length }} 个二级分类</span>
          <button type="button" :aria-label="`编辑${group.name}`" @click="openEditor(group)"><PhPencilSimple :size="17" /></button>
          <button type="button" :aria-label="`删除${group.name}`" @click="emit('delete', group)"><PhTrash :size="17" /></button>
        </header>
        <div class="category-children">
          <div v-for="child in group.children" :key="child.id">
            <span>{{ child.name }}</span>
            <span class="category-actions">
              <button type="button" :aria-label="`编辑${child.name}`" @click="openEditor(child)"><PhPencilSimple :size="16" /></button>
              <button type="button" :aria-label="`删除${child.name}`" @click="emit('delete', child)"><PhTrash :size="16" /></button>
            </span>
          </div>
          <button class="add-secondary" type="button" @click="openEditor(null, group.id)"><PhPlus :size="16" />新增二级分类</button>
        </div>
      </section>
    </div>

    <div v-if="!groups.length" class="empty-state">
      <span class="empty-mark">+</span>
      <h3>还没有分类</h3>
      <p>先创建一级分类，再添加更具体的二级分类。</p>
      <button class="secondary-button" type="button" @click="openEditor()">新增分类</button>
    </div>

    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="editorOpen" class="sheet-layer" @click.self="editorOpen = false">
          <section class="sheet-panel compact-sheet" role="dialog" aria-modal="true" aria-label="编辑分类">
            <div class="sheet-handle"></div>
            <header class="sheet-header">
              <div><p class="section-kicker">分类设置</p><h2>{{ form.id ? '编辑分类' : '新增分类' }}</h2></div>
              <button class="icon-button" type="button" aria-label="关闭" @click="editorOpen = false"><PhX :size="22" /></button>
            </header>
            <form class="category-form" @submit.prevent="submit">
              <div class="field"><span>交易类型</span><AppSelect v-model="form.type" :options="[{ value: 'expense', label: '支出' }, { value: 'income', label: '收入' }]" label="选择交易类型" :disabled="Boolean(form.id)" /></div>
              <div class="field"><span>上级分类</span><AppSelect v-model="form.parentId" :options="[{ value: '', label: '无，作为一级分类' }, ...parentOptions.map((item) => ({ value: item.id, label: item.name }))]" label="选择上级分类" :disabled="Boolean(form.id && !form.parentId)" /></div>
              <label class="field"><span>分类名称</span><input v-model="form.name" maxlength="12" placeholder="例如：早餐" /></label>
              <p v-if="error" class="form-error">{{ error }}</p>
              <button class="primary-button full-width" type="submit">保存分类</button>
            </form>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
