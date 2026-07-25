import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import tools from '../site.config.js'

const root = resolve(import.meta.dirname, '..')
const outputRoot = resolve(root, 'pages-dist')

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function homePage(items) {
  const cards = items.map((tool) => `
        <a class="tool-card" href="./${escapeHtml(tool.path)}/">
          <span class="tool-name">${escapeHtml(tool.name)}</span>
          <span class="tool-description">${escapeHtml(tool.description)}</span>
          <span class="tool-link">Open tool →</span>
        </a>`).join('')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Private browser-based utilities from Luobo Dev." />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://luobo-dev.github.io/" />
    <title>Luobo Dev Tools</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; color: #172033; background: #f4f7fb; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      main { width: min(1040px, calc(100% - 40px)); margin: 0 auto; padding: 80px 0; }
      .eyebrow { margin: 0 0 12px; color: #0757b9; font-size: 14px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
      h1 { margin: 0; font-size: clamp(38px, 7vw, 72px); line-height: 1; letter-spacing: -.05em; }
      .intro { max-width: 620px; margin: 22px 0 44px; color: #596579; font-size: 18px; line-height: 1.65; }
      .tools { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
      .tool-card { min-height: 220px; padding: 26px; display: flex; flex-direction: column; color: inherit; text-decoration: none; background: #fff; border: 1px solid #d8e0ec; border-radius: 16px; transition: border-color .18s ease, transform .18s ease; }
      .tool-card:hover { border-color: #0b69d1; transform: translateY(-2px); }
      .tool-name { font-size: 24px; font-weight: 760; letter-spacing: -.02em; }
      .tool-description { margin-top: 14px; color: #657187; line-height: 1.55; }
      .tool-link { margin-top: auto; color: #0757b9; font-weight: 700; }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">Luobo Dev Tools</p>
      <h1>Useful tools,<br />right in your browser.</h1>
      <p class="intro">A growing collection of focused web utilities. Simple to use, fast to load, and designed to keep your files on your device.</p>
      <section class="tools" aria-label="Available tools">${cards}
      </section>
    </main>
  </body>
</html>
`
}

await rm(outputRoot, { recursive: true, force: true })
await mkdir(outputRoot, { recursive: true })

for (const tool of tools) {
  const source = resolve(root, tool.source)
  const target = resolve(outputRoot, tool.path)
  await cp(source, target, {
    recursive: true,
    filter: (entry) => !entry.split('/').includes('.git'),
  })
}

await writeFile(resolve(outputRoot, 'index.html'), homePage(tools))
await writeFile(resolve(outputRoot, '.nojekyll'), '')
await writeFile(
  resolve(outputRoot, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: https://luobo-dev.github.io/sitemap.xml\n`,
)

const sitemaps = tools
  .filter((tool) => tool.sitemap)
  .map((tool) => `  <sitemap><loc>https://luobo-dev.github.io/${tool.path}/${tool.sitemap}</loc></sitemap>`)
  .join('\n')

await writeFile(
  resolve(outputRoot, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemaps}\n</sitemapindex>\n`,
)
