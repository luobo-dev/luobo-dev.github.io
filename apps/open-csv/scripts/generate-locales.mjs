import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import en from '../src/locales/en.js'

const runFile = promisify(execFile)

const languageTargets = {
  zh: ['zh-CN', '简体中文'],
  'zh-tw': ['zh-TW', '繁體中文'],
  ja: ['ja', '日本語'],
  de: ['de', 'Deutsch'],
  fr: ['fr', 'Français'],
  es: ['es', 'Español'],
  it: ['it', 'Italiano'],
  pt: ['pt', 'Português'],
  ko: ['ko', '한국어'],
  nl: ['nl', 'Nederlands'],
  pl: ['pl', 'Polski'],
  tr: ['tr', 'Türkçe'],
  ru: ['ru', 'Русский'],
  ar: ['ar', 'العربية'],
  hi: ['hi', 'हिन्दी'],
  id: ['id', 'Bahasa Indonesia'],
  vi: ['vi', 'Tiếng Việt'],
  th: ['th', 'ไทย'],
  fil: ['tl', 'Filipino'],
  ms: ['ms', 'Bahasa Melayu'],
  fa: ['fa', 'فارسی'],
  he: ['he', 'עברית'],
  uk: ['uk', 'Українська'],
  cs: ['cs', 'Čeština'],
  sv: ['sv', 'Svenska'],
  da: ['da', 'Dansk'],
  fi: ['fi', 'Suomi'],
  no: ['no', 'Norsk'],
  ro: ['ro', 'Română'],
  hu: ['hu', 'Magyar'],
  el: ['el', 'Ελληνικά'],
  sk: ['sk', 'Slovenčina'],
  bg: ['bg', 'Български'],
  ca: ['ca', 'Català'],
  uz: ['uz', 'Oʻzbekcha'],
  ur: ['ur', 'اردو'],
  ta: ['ta', 'தமிழ்'],
  te: ['te', 'తెలుగు'],
  bn: ['bn', 'বাংলা'],
}

const rtlLanguages = new Set(['ar', 'fa', 'he', 'ur'])
const refreshKeys = new Set(
  process.argv
    .find((argument) => argument.startsWith('--refresh='))
    ?.slice('--refresh='.length)
    .split(',')
    .filter(Boolean) || [],
)

function flatten(value, prefix = '', output = {}) {
  for (const [key, item] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof item === 'string') output[path] = item
    else if (item && typeof item === 'object') flatten(item, path, output)
  }
  return output
}

function unflatten(values) {
  const output = {}
  for (const [path, value] of Object.entries(values)) {
    const keys = path.split('.')
    const last = keys.pop()
    const parent = keys.reduce((current, key) => (current[key] ??= {}), output)
    parent[last] = value
  }
  return output
}

async function translateText(text, target) {
  const placeholders = [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1])
  const protectedText = text.replace(/\{(\w+)\}/g, (_, key) => `ZXQVAR${placeholders.indexOf(key)}QXZ`)
  const url = new URL('https://translate.googleapis.com/translate_a/single')
  url.searchParams.set('client', 'gtx')
  url.searchParams.set('sl', 'en')
  url.searchParams.set('tl', target)
  url.searchParams.set('dt', 't')
  url.searchParams.set('q', protectedText)
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const { stdout } = await runFile('curl', ['--silent', '--show-error', '--fail', url.toString()], {
        maxBuffer: 1024 * 1024,
      })
      const data = JSON.parse(stdout)
      return data[0]
        .map((part) => part[0])
        .join('')
        .replace(/ZXQVAR(\d+)QXZ/gi, (_, index) => `{${placeholders[Number(index)]}}`)
    } catch (error) {
      if (attempt === 4) throw error
      await new Promise((resolvePromise) => setTimeout(resolvePromise, attempt * 800))
    }
  }
}

const flatEnglish = flatten(en)
delete flatEnglish['meta.locale']
delete flatEnglish['meta.languageName']
delete flatEnglish['meta.direction']

const entries = Object.entries(flatEnglish)
const outputPath = resolve('src/locales/generated.js')
let generated = {}

try {
  const existingSource = await readFile(outputPath, 'utf8')
  const jsonStart = existingSource.indexOf('{')
  generated = JSON.parse(existingSource.slice(jsonStart).replace(/\n$/, ''))
} catch {
  generated = {}
}

async function saveGenerated() {
  const output = `// Generated from src/locales/en.js by scripts/generate-locales.mjs.\n// Edit the English source and regenerate instead of editing this file manually.\nexport default ${JSON.stringify(generated, null, 2)}\n`
  await mkdir(resolve('src/locales'), { recursive: true })
  await writeFile(outputPath, output)
}

function getAtPath(value, path) {
  return path.split('.').reduce((current, key) => current?.[key], value)
}

function setAtPath(value, path, nextValue) {
  const keys = path.split('.')
  const last = keys.pop()
  const parent = keys.reduce((current, key) => (current[key] ??= {}), value)
  parent[last] = nextValue
}

function placeholderSignature(value) {
  return [...String(value).matchAll(/\{\w+\}/g)].map((match) => match[0]).sort().join('|')
}

for (const [slug, [target, languageName]] of Object.entries(languageTargets)) {
  if (generated[slug]) {
    const invalidEntries = entries.filter(
      ([key, englishValue]) =>
        refreshKeys.has(key)
        || typeof getAtPath(generated[slug], key) !== 'string'
        || placeholderSignature(getAtPath(generated[slug], key)) !== placeholderSignature(englishValue),
    )
    if (!invalidEntries.length) {
      process.stdout.write(`Skipping ${slug} (already generated).\n`)
      continue
    }
    process.stdout.write(`Repairing ${slug} (${invalidEntries.length} placeholders)…\n`)
    for (const [key, englishValue] of invalidEntries) {
      setAtPath(generated[slug], key, await translateText(englishValue, target))
    }
    await saveGenerated()
    continue
  }
  process.stdout.write(`Translating ${slug}…\n`)
  const translatedEntries = []
  for (let index = 0; index < entries.length; index += 8) {
    const batch = entries.slice(index, index + 8)
    const results = await Promise.all(batch.map(([, value]) => translateText(value, target)))
    translatedEntries.push(...batch.map(([key], itemIndex) => [key, results[itemIndex]]))
  }
  const locale = unflatten(Object.fromEntries(translatedEntries))
  locale.meta = {
    locale: slug === 'zh' ? 'zh-CN' : slug === 'zh-tw' ? 'zh-TW' : slug === 'fil' ? 'fil' : target,
    languageName,
    direction: rtlLanguages.has(slug) ? 'rtl' : 'ltr',
  }
  generated[slug] = locale
  await saveGenerated()
}
