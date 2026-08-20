import { openDB } from 'idb'

const DB_NAME = 'pocket-ledger'
const DB_VERSION = 1

const defaultCategories = [
  ['expense-food', '食品酒水', 'expense', null, 10],
  ['expense-food-meal', '早午晚餐', 'expense', 'expense-food', 11],
  ['expense-food-snack', '零食饮料', 'expense', 'expense-food', 12],
  ['expense-transport', '交通', 'expense', null, 20],
  ['expense-transport-public', '公交地铁', 'expense', 'expense-transport', 21],
  ['expense-transport-taxi', '打车', 'expense', 'expense-transport', 22],
  ['expense-home', '居家', 'expense', null, 30],
  ['expense-home-daily', '日用品', 'expense', 'expense-home', 31],
  ['expense-home-bill', '水电燃气', 'expense', 'expense-home', 32],
  ['expense-shopping', '购物', 'expense', null, 40],
  ['expense-shopping-clothes', '衣物', 'expense', 'expense-shopping', 41],
  ['expense-shopping-digital', '数码', 'expense', 'expense-shopping', 42],
  ['expense-health', '健康', 'expense', null, 50],
  ['expense-health-medical', '医疗', 'expense', 'expense-health', 51],
  ['expense-health-sport', '运动', 'expense', 'expense-health', 52],
  ['expense-fun', '休闲', 'expense', null, 60],
  ['expense-fun-entertainment', '娱乐', 'expense', 'expense-fun', 61],
  ['expense-fun-travel', '旅行', 'expense', 'expense-fun', 62],
  ['income-work', '工作收入', 'income', null, 70],
  ['income-work-salary', '工资', 'income', 'income-work', 71],
  ['income-work-bonus', '奖金', 'income', 'income-work', 72],
  ['income-extra', '其他收入', 'income', null, 80],
  ['income-extra-refund', '退款', 'income', 'income-extra', 81],
  ['income-extra-gift', '红包礼金', 'income', 'income-extra', 82],
].map(([id, name, type, parentId, sortOrder]) => ({ id, name, type, parentId, sortOrder }))

function createId(prefix) {
  const value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${value}`
}

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    const categories = db.createObjectStore('categories', { keyPath: 'id' })
    categories.createIndex('by-type', 'type')
    categories.createIndex('by-parent', 'parentId')

    const transactions = db.createObjectStore('transactions', { keyPath: 'id' })
    transactions.createIndex('by-date', 'date')
    transactions.createIndex('by-category', 'categoryId')
    transactions.createIndex('by-type', 'type')
  },
})

async function mergeDuplicateDefaultMeal(db) {
  const categories = await db.getAll('categories')
  const foodParentIds = new Set(categories
    .filter((item) => !item.parentId && item.type === 'expense' && item.name === '食品酒水')
    .map((item) => item.id))
  const duplicates = categories.filter((item) => foodParentIds.has(item.parentId) && item.name === '早午晚餐')
  if (duplicates.length < 2) return

  const canonical = duplicates.find((item) => item.id !== 'expense-food-meal') || duplicates[0]
  const redundant = duplicates.filter((item) => item.id !== canonical.id)
  const transactionUpdates = []

  for (const category of redundant) {
    const usedTransactions = await db.getAllFromIndex('transactions', 'by-category', category.id)
    transactionUpdates.push(...usedTransactions.map((item) => ({ ...item, categoryId: canonical.id })))
  }

  const tx = db.transaction(['categories', 'transactions'], 'readwrite')
  await Promise.all([
    ...transactionUpdates.map((item) => tx.objectStore('transactions').put(item)),
    ...redundant.map((item) => tx.objectStore('categories').delete(item.id)),
  ])
  await tx.done
}

export async function initializeDatabase() {
  const db = await dbPromise
  if (await db.count('categories')) {
    const categories = await db.getAll('categories')
    const defaultFood = categories.find((item) => item.id === 'expense-food')
    const existingFood = categories.find((item) => item.id !== 'expense-food' && !item.parentId && item.type === 'expense' && item.name === '食品酒水')
    const defaultMeal = categories.find((item) => item.id === 'expense-food-meal')

    if (defaultFood?.name === '餐饮' && !existingFood) {
      await db.put('categories', { ...defaultFood, name: '食品酒水' })
    }
    if (defaultMeal) {
      await db.put('categories', {
        ...defaultMeal,
        name: defaultMeal.name === '正餐' ? '早午晚餐' : defaultMeal.name,
        parentId: existingFood && defaultMeal.parentId === defaultFood?.id ? existingFood.id : defaultMeal.parentId,
      })
    }
    await mergeDuplicateDefaultMeal(db)
    return
  }
  const tx = db.transaction('categories', 'readwrite')
  await Promise.all(defaultCategories.map((category) => tx.store.add(category)))
  await tx.done
}

export async function getAllData() {
  const db = await dbPromise
  const [categories, transactions] = await Promise.all([
    db.getAll('categories'),
    db.getAll('transactions'),
  ])
  return {
    categories: categories.sort((a, b) => a.sortOrder - b.sortOrder),
    transactions: transactions.sort((a, b) => b.date.localeCompare(a.date) || (b.updatedAt || '').localeCompare(a.updatedAt || '')),
  }
}

export async function saveTransaction(input) {
  const db = await dbPromise
  const now = new Date().toISOString()
  const transaction = {
    ...input,
    id: input.id || createId('tx'),
    amount: Math.round(Number(input.amount) * 100) / 100,
    createdAt: input.createdAt || now,
    updatedAt: now,
  }
  await db.put('transactions', transaction)
  return transaction
}

export async function removeTransaction(id) {
  const db = await dbPromise
  await db.delete('transactions', id)
}

export async function saveCategory(input) {
  const db = await dbPromise
  const category = {
    ...input,
    id: input.id || createId('category'),
    sortOrder: input.sortOrder ?? Date.now(),
  }
  await db.put('categories', category)
  return category
}

export async function removeCategory(id) {
  const db = await dbPromise
  const children = await db.getAllFromIndex('categories', 'by-parent', id)
  const used = await db.getAllFromIndex('transactions', 'by-category', id)
  if (children.length) throw new Error('请先删除这个分类下的二级分类')
  if (used.length) throw new Error('这个分类已被流水使用，不能删除')
  await db.delete('categories', id)
}

export async function exportDatabase() {
  const data = await getAllData()
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...data }, null, 2)
}

export async function importDatabase(payload) {
  if (!Array.isArray(payload?.categories) || !Array.isArray(payload?.transactions)) {
    throw new Error('这不是有效的一笔备份文件')
  }
  const db = await dbPromise
  const tx = db.transaction(['categories', 'transactions'], 'readwrite')
  await Promise.all([tx.objectStore('categories').clear(), tx.objectStore('transactions').clear()])
  await Promise.all(payload.categories.map((item) => tx.objectStore('categories').put(item)))
  await Promise.all(payload.transactions.map((item) => tx.objectStore('transactions').put(item)))
  await tx.done
}
