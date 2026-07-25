import { ref } from 'vue'
import en from './locales/en'
import generatedLocales from './locales/generated'

export const locales = { en, ...generatedLocales }
export const languageOptions = Object.entries(locales).map(([slug, messages]) => ({
  slug,
  label: messages.meta.languageName,
}))

function pathInfo() {
  const segments = window.location.pathname.split('/').filter(Boolean)
  if (segments.at(-1)?.toLowerCase() === 'index.html') segments.pop()
  const candidate = segments.at(-1)?.toLowerCase()
  const hasExplicitLocale = Object.hasOwn(locales, candidate)
  const slug = hasExplicitLocale ? candidate : 'en'
  if (hasExplicitLocale) segments.pop()
  return {
    slug,
    base: `/${segments.join('/')}${segments.length ? '/' : ''}`,
  }
}

const initialSlug = pathInfo().slug
const currentMessages = ref(locales[initialSlug])
export const localeSlug = ref(initialSlug)
export const locale = ref(currentMessages.value.meta.locale)
const defaultAlternateHref = document.querySelector('link[rel="alternate"][hreflang="x-default"]')?.getAttribute('href')
const canonicalBaseUrl = defaultAlternateHref
  ? new URL(defaultAlternateHref, window.location.href).href
  : new URL(pathInfo().base, window.location.origin).href

const numberFormatters = new Map()

function setMeta(selector, value) {
  document.querySelector(selector)?.setAttribute('content', value)
}

function applyDocumentLanguage() {
  const messages = currentMessages.value
  document.documentElement.lang = messages.meta.locale
  document.documentElement.dir = messages.meta.direction
  document.title = messages.seo.title
  setMeta('meta[name="description"]', messages.seo.description)
  setMeta('meta[name="keywords"]', messages.seo.keywords)
  setMeta('meta[name="application-name"]', messages.seo.title)
  setMeta('meta[property="og:title"]', messages.seo.title)
  setMeta('meta[property="og:description"]', messages.seo.socialDescription)
  setMeta('meta[name="twitter:title"]', messages.seo.title)
  setMeta('meta[name="twitter:description"]', messages.seo.twitterDescription)

  const canonical = document.querySelector('link[rel="canonical"]')
  if (canonical) {
    const localePath = localeSlug.value === 'en' ? '' : `${localeSlug.value}/`
    canonical.setAttribute('href', new URL(localePath, canonicalBaseUrl).href)
  }
}

export function languageHref(slug) {
  const { base } = pathInfo()
  return slug === 'en' ? base : `${base}${slug}/`
}

function applyLanguage(slug) {
  const nextSlug = Object.hasOwn(locales, slug) ? slug : 'en'
  localeSlug.value = nextSlug
  currentMessages.value = locales[nextSlug]
  locale.value = currentMessages.value.meta.locale
  applyDocumentLanguage()
}

export function switchLanguage(slug) {
  if (!Object.hasOwn(locales, slug)) return
  if (slug !== localeSlug.value) {
    window.history.pushState({ locale: slug }, '', languageHref(slug))
    applyLanguage(slug)
  }
}

window.addEventListener('popstate', () => {
  applyLanguage(pathInfo().slug)
})

applyDocumentLanguage()

export function t(path, params = {}) {
  const value = path.split('.').reduce((current, key) => current?.[key], currentMessages.value)
  if (typeof value !== 'string') return path
  return value.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`)
}

export function formatNumber(value) {
  if (!numberFormatters.has(locale.value)) {
    numberFormatters.set(locale.value, new Intl.NumberFormat(locale.value))
  }
  return numberFormatters.get(locale.value).format(value)
}
