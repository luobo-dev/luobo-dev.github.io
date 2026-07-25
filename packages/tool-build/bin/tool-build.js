#!/usr/bin/env node

import { build, createServer, loadEnv, preview } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import { fileURLToPath, pathToFileURL, URL } from 'node:url'
import { resolve } from 'node:path'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'

const command = process.argv[2] || 'build'
const root = process.cwd()
const vueShim = fileURLToPath(new URL('../runtime/vue-shim.js', import.meta.url))

async function loadToolConfig() {
  const configPath = resolve(root, 'tool.config.js')
  try {
    await access(configPath)
  } catch (error) {
    if (error?.code === 'ENOENT') return {}
    throw error
  }
  return (await import(`${pathToFileURL(configPath).href}?t=${Date.now()}`)).default || {}
}

function siteBase(siteUrl = '') {
  if (!siteUrl) return '/'
  try {
    const pathname = new URL(siteUrl).pathname
    return pathname.endsWith('/') ? pathname : `${pathname}/`
  } catch {
    return '/'
  }
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeHtml(value) {
  return escapeAttribute(value).replaceAll("'", '&#39;')
}

function replaceMeta(html, selector, value) {
  const escaped = escapeAttribute(value)
  const pattern = new RegExp(`(<meta[^>]+${selector}[^>]+content=")[^"]*(")`, 'i')
  return html.replace(pattern, `$1${escaped}$2`)
}

function pagePath(slug) {
  return slug === 'en' ? '/' : `/${slug}/`
}

function pageUrl(siteUrl, slug) {
  return new URL(pagePath(slug).replace(/^\//, ''), `${siteUrl.replace(/\/+$/, '')}/`).href
}

function prerenderApp(prerender = {}) {
  return `<div id="app"><main><section class="empty-layout"><div class="dropzone"><h1 class="sr-only">${escapeHtml(prerender.title || '')}</h1><h2>${escapeHtml(prerender.dropTitle || '')}</h2><p>${escapeHtml(prerender.dropDescription || '')}</p><button class="primary-button" type="button">${escapeHtml(prerender.selectFile || '')}</button><div class="drop-divider"><span>${escapeHtml(prerender.otherMethods || '')}</span></div><div class="secondary-actions"><button type="button">${escapeHtml(prerender.pasteClipboard || '')}</button><button type="button">${escapeHtml(prerender.viewShortcuts || '')}</button></div><p class="local-note">${escapeHtml(prerender.localNotice || '')}</p></div></section></main></div>`
}

function createSitemap(siteUrl, entries) {
  const urls = entries.map(([slug, page]) => {
    const alternates = entries
      .map(([targetSlug, targetPage]) => `<xhtml:link rel="alternate" hreflang="${escapeAttribute(targetPage.lang)}" href="${escapeAttribute(pageUrl(siteUrl, targetSlug))}" />`)
      .join('')
    return `<url><loc>${escapeHtml(pageUrl(siteUrl, slug))}</loc>${alternates}<xhtml:link rel="alternate" hreflang="x-default" href="${escapeAttribute(pageUrl(siteUrl, 'en'))}" /></url>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>\n`
}

async function createLocalizedPages(localizedPages = {}, siteUrl = '') {
  const entries = Object.entries(localizedPages)
  if (!entries.length) return

  const outputRoot = resolve(root, 'dist')
  const sourceHtml = await readFile(resolve(outputRoot, 'index.html'), 'utf8')

  for (const [slug, page] of entries) {
    const prefix = slug === 'en' ? './' : '../'
    const alternates = entries
      .map(([targetSlug, targetPage]) => {
        const href = siteUrl
          ? pageUrl(siteUrl, targetSlug)
          : targetSlug === 'en' ? prefix : `${prefix}${targetSlug}/`
        return `<link rel="alternate" hreflang="${escapeAttribute(targetPage.lang)}" href="${href}" />`
      })
      .join('')
    const defaultHref = siteUrl ? pageUrl(siteUrl, 'en') : slug === 'en' ? './' : '../'
    const canonicalHref = siteUrl ? pageUrl(siteUrl, slug) : './'
    let html = sourceHtml
      .replace(/<html[^>]*>/i, `<html lang="${escapeAttribute(page.lang)}" dir="${escapeAttribute(page.dir || 'ltr')}">`)
      .replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttribute(page.title)}</title>`)
      .replace('<div id="app"></div>', prerenderApp(page.prerender))
      .replace('</head>', `<link rel="canonical" href="${escapeAttribute(canonicalHref)}" />${alternates}<link rel="alternate" hreflang="x-default" href="${escapeAttribute(defaultHref)}" /></head>`)

    html = replaceMeta(html, 'name="description"', page.description)
    html = replaceMeta(html, 'name="keywords"', page.keywords)
    html = replaceMeta(html, 'name="application-name"', page.title)
    html = replaceMeta(html, 'property="og:title"', page.title)
    html = replaceMeta(html, 'property="og:description"', page.socialDescription)
    html = replaceMeta(html, 'name="twitter:title"', page.title)
    html = replaceMeta(html, 'name="twitter:description"', page.twitterDescription)

    const pageDirectory = slug === 'en' ? outputRoot : resolve(outputRoot, slug)
    await mkdir(pageDirectory, { recursive: true })
    await writeFile(resolve(pageDirectory, 'index.html'), html)
  }

  if (siteUrl) {
    await writeFile(resolve(outputRoot, 'sitemap.xml'), createSitemap(siteUrl, entries))
  }
}

const config = {
  root,
  plugins: [vue()],
  resolve: {
    alias: {
      vue: vueShim,
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          content: [
            resolve(root, 'index.html'),
            resolve(root, 'src/**/*.{html,vue,js}'),
          ],
          theme: {
            extend: {},
          },
          plugins: [],
        }),
        autoprefixer(),
      ],
    },
  },
  server: {
    host: '127.0.0.1',
  },
  preview: {
    host: '127.0.0.1',
  },
  build: {
    outDir: resolve(root, 'dist'),
    emptyOutDir: true,
  },
}

if (command === 'dev') {
  const server = await createServer(config)
  await server.listen()
  server.printUrls()
} else if (command === 'preview') {
  const server = await preview(config)
  server.printUrls()
} else if (command === 'build') {
  const externalEnv = { ...process.env }
  Object.assign(process.env, loadEnv('production', root, ''), externalEnv)
  const toolConfig = await loadToolConfig()
  config.base = toolConfig.base || siteBase(toolConfig.siteUrl)
  await build(config)
  await createLocalizedPages(toolConfig.localizedPages, toolConfig.siteUrl)
} else {
  console.error(`Unknown command: ${command}`)
  process.exitCode = 1
}
