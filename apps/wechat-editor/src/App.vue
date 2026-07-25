<script setup>
import { nextTick, onMounted, ref } from 'vue'
import {
  AlignCenter,
  AlignLeft,
  Bold,
  Check,
  Clipboard,
  Code2,
  Heading2,
  Highlighter,
  Italic,
  Palette,
  Quote,
  RotateCcw,
  Type,
} from 'lucide-vue-next'

const editor = ref(null)
const toast = ref('')
const showHtml = ref(false)
const htmlOutput = ref('')
let toastTimer

const initialContent = `
  <section style="margin:0 auto;padding:0 18px 48px;max-width:677px;box-sizing:border-box;color:#262626;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;font-size:16px;line-height:1.9;word-break:break-word;">
    <header style="padding:34px 0 28px;text-align:center;">
      <h1 style="margin:0 0 12px;font-size:25px;line-height:1.42;font-weight:700;color:#202020;">长江存储的十年</h1>
      <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:#303030;">一颗国产 NAND 芯片如何闯入全球牌桌？</p>
      <p style="margin:0;font-size:13px;color:#a2a2a2;">芯片｜算力｜AI产业新媒体</p>
    </header>

    <p style="margin:0 0 22px;">长江存储不是一家单纯生产 SSD 的硬盘品牌，而是专注于 <strong style="color:#e84537;">3D NAND 闪存</strong>设计、晶圆制造、封装测试、存储产品和销售服务的企业。</p>

    <section style="margin:26px 0;padding:16px 18px;background:#f8f2e6;color:#333;line-height:1.75;">
      长江存储已经获得进入全球 NAND 牌桌的资格。下一阶段决定其位置的，不再是能否做出先进芯片，而是<strong style="color:#16a265;">先进产品能否高度量产、企业级市场能否突破</strong>。
    </section>

    <div style="margin:34px 0 30px;height:6px;background:#d5a339;"></div>

    <p style="margin:0 0 24px;font-weight:600;">一文看懂 <span style="color:#7957a8;">长江存储</span></p>

    <table style="width:100%;margin:0 0 34px;border-collapse:collapse;font-size:15px;line-height:1.6;">
      <tbody>
        <tr><td style="width:28%;padding:7px 12px;background:#fbf3e3;color:#a56f19;font-weight:700;">成立时间</td><td style="padding:7px 12px;">2016年7月</td></tr>
        <tr><td style="padding:7px 12px;background:#fbf3e3;color:#a56f19;font-weight:700;">总部</td><td style="padding:7px 12px;">湖北武汉</td></tr>
        <tr><td style="padding:7px 12px;background:#fbf3e3;color:#a56f19;font-weight:700;">企业模式</td><td style="padding:7px 12px;">3D NAND 存储器 IDM</td></tr>
        <tr><td style="padding:7px 12px;background:#fbf3e3;color:#a56f19;font-weight:700;">核心技术</td><td style="padding:7px 12px;">晶栈® Xtacking® 架构</td></tr>
        <tr><td style="padding:7px 12px;background:#fbf3e3;color:#a56f19;font-weight:700;">主要产品</td><td style="padding:7px 12px;">闪存颗粒、嵌入式存储、消费级及企业级 SSD</td></tr>
      </tbody>
    </table>

    <section style="margin:38px 0 28px;display:table;width:100%;border-collapse:collapse;">
      <span style="display:table-cell;width:56px;padding:0 6px;background:#171717;color:#fff;font-size:17px;font-weight:700;text-align:center;vertical-align:middle;transform:none;">01</span>
      <h2 style="display:table-cell;margin:0;padding:12px 16px;background:#f1cb6b;color:#171717;font-size:18px;line-height:1.45;font-weight:700;vertical-align:middle;">长江存储到底是做什么的？</h2>
    </section>

    <p style="margin:0 0 22px;">长江存储成立于 2016 年 7 月，总部位于武汉，是一家<strong style="color:#d5a339;">专注于 3D NAND 闪存的 IDM 企业</strong>。所谓 IDM，即垂直整合制造模式，企业不仅负责芯片设计，也覆盖晶圆制造、封装测试、产品开发和销售服务。</p>

    <p style="margin:0 0 22px;">其产品已经覆盖闪存颗粒、嵌入式存储芯片、消费级固态硬盘和企业级固态硬盘，应用场景包括手机、电脑、消费电子和数据中心。</p>

    <section style="margin:26px 0;padding:15px 18px;background:#f8f2e6;">
      <strong style="color:#9f6b19;">产业链定位</strong>　3D NAND 技术研发 → 晶圆制造 → NAND 颗粒与封装 → 嵌入式存储和 SSD → 手机、电脑、服务器与数据中心。
    </section>

    <p style="margin:0 0 22px;">这条链路越完整，企业对产品性能、成本、供货和质量的控制能力就越强，但需要承担的研发投入、设备投入和经营风险也越高。</p>

    <section style="margin:38px 0 28px;display:table;width:100%;border-collapse:collapse;">
      <span style="display:table-cell;width:56px;padding:0 6px;background:#171717;color:#fff;font-size:17px;font-weight:700;text-align:center;vertical-align:middle;">02</span>
      <h2 style="display:table-cell;margin:0;padding:12px 16px;background:#f1cb6b;color:#171717;font-size:18px;line-height:1.45;font-weight:700;vertical-align:middle;">为什么 NAND 是一门极难进入的生意？</h2>
    </section>
    <p style="margin:0;">在这里继续编辑你的正文。选中文字后，可以使用上方工具栏调整格式。</p>
  </section>`

function notify(message) {
  toast.value = message
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toast.value = ''), 2600)
}

function focusEditor() {
  editor.value?.focus()
}

function runCommand(command, value = null) {
  focusEditor()
  document.execCommand(command, false, value)
}

function formatBlock(tag) {
  runCommand('formatBlock', tag)
}

function addCallout() {
  focusEditor()
  document.execCommand(
    'insertHTML',
    false,
    '<section style="margin:26px 0;padding:16px 18px;background:#f8f2e6;color:#333;line-height:1.75;">在这里输入提示或摘要内容</section><p style="margin:0 0 22px;"><br></p>',
  )
}

function addSection() {
  focusEditor()
  const number = String(editor.value?.querySelectorAll('h2').length + 1).padStart(2, '0')
  document.execCommand(
    'insertHTML',
    false,
    `<section style="margin:38px 0 28px;display:table;width:100%;border-collapse:collapse;"><span style="display:table-cell;width:56px;padding:0 6px;background:#171717;color:#fff;font-size:17px;font-weight:700;text-align:center;vertical-align:middle;">${number}</span><h2 style="display:table-cell;margin:0;padding:12px 16px;background:#f1cb6b;color:#171717;font-size:18px;line-height:1.45;font-weight:700;vertical-align:middle;">输入章节标题</h2></section><p style="margin:0 0 22px;"><br></p>`,
  )
}

function cleanedHtml() {
  const clone = editor.value.cloneNode(true)
  clone.removeAttribute('contenteditable')
  clone.removeAttribute('spellcheck')
  clone.removeAttribute('aria-label')
  clone.removeAttribute('class')
  clone.querySelectorAll('[contenteditable], [class]').forEach((node) => {
    node.removeAttribute('contenteditable')
    node.removeAttribute('class')
  })
  return clone.innerHTML.trim()
}

async function copyForWechat() {
  const html = cleanedHtml()
  const plain = editor.value.innerText
  try {
    if (navigator.clipboard?.write && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ])
    } else {
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(editor.value)
      selection.removeAllRanges()
      selection.addRange(range)
      document.execCommand('copy')
      selection.removeAllRanges()
    }
    notify('已复制 HTML，可直接粘贴到公众号编辑器')
  } catch {
    notify('复制失败，请允许浏览器访问剪贴板后重试')
  }
}

function openHtml() {
  htmlOutput.value = cleanedHtml()
  showHtml.value = true
}

function resetTemplate() {
  if (!window.confirm('确定恢复示例模板吗？当前编辑内容将被替换。')) return
  editor.value.innerHTML = initialContent
  notify('已恢复示例模板')
}

onMounted(async () => {
  await nextTick()
  editor.value.innerHTML = initialContent
})
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark"><Code2 :size="18" aria-hidden="true" /></div>
        <div>
          <h1>公众号排版复制工具</h1>
          <p>编辑后以 HTML 格式复制</p>
        </div>
      </div>
      <div class="top-actions">
        <button class="secondary-button" type="button" @click="resetTemplate">
          <RotateCcw :size="16" aria-hidden="true" />恢复模板
        </button>
        <button class="primary-button" type="button" @click="copyForWechat">
          <Clipboard :size="17" aria-hidden="true" />复制到公众号
        </button>
      </div>
    </header>

    <main>
      <div class="notice">
        <Check :size="17" aria-hidden="true" />
        <span>所有内容只在本地浏览器中处理。复制时会同时写入 <code>text/html</code> 与纯文本。</span>
      </div>

      <div class="workspace">
        <aside class="toolbar" aria-label="排版工具">
          <div class="tool-group">
            <span class="tool-label">文字</span>
            <div class="tool-row">
              <button title="加粗" aria-label="加粗" @click="runCommand('bold')"><Bold :size="17" /></button>
              <button title="斜体" aria-label="斜体" @click="runCommand('italic')"><Italic :size="17" /></button>
              <button title="正文" aria-label="设为正文" @click="formatBlock('p')"><Type :size="17" /></button>
              <button title="小标题" aria-label="设为小标题" @click="formatBlock('h3')"><Heading2 :size="17" /></button>
            </div>
          </div>

          <div class="tool-group">
            <span class="tool-label">颜色</span>
            <div class="swatches">
              <button class="swatch ink" aria-label="黑色文字" @click="runCommand('foreColor', '#262626')"></button>
              <button class="swatch gold" aria-label="金色文字" @click="runCommand('foreColor', '#c28a24')"></button>
              <button class="swatch red" aria-label="红色文字" @click="runCommand('foreColor', '#e84537')"></button>
              <button class="swatch green" aria-label="绿色文字" @click="runCommand('foreColor', '#16a265')"></button>
              <button class="swatch purple" aria-label="紫色文字" @click="runCommand('foreColor', '#7957a8')"></button>
            </div>
          </div>

          <div class="tool-group">
            <span class="tool-label">对齐</span>
            <div class="tool-row">
              <button title="左对齐" aria-label="左对齐" @click="runCommand('justifyLeft')"><AlignLeft :size="17" /></button>
              <button title="居中" aria-label="居中" @click="runCommand('justifyCenter')"><AlignCenter :size="17" /></button>
            </div>
          </div>

          <div class="tool-group">
            <span class="tool-label">内容块</span>
            <button class="wide-tool" type="button" @click="addCallout"><Quote :size="16" />插入摘要框</button>
            <button class="wide-tool" type="button" @click="addSection"><Highlighter :size="16" />插入章节标题</button>
          </div>

          <div class="toolbar-footer">
            <button class="text-button" type="button" @click="openHtml"><Palette :size="15" />查看 HTML</button>
          </div>
        </aside>

        <section class="canvas" aria-label="文章编辑画布">
          <div class="canvas-head">
            <span>公众号正文预览</span>
            <span>点击正文直接编辑</span>
          </div>
          <article
            ref="editor"
            class="article-editor"
            contenteditable="true"
            spellcheck="true"
            aria-label="公众号文章内容"
          ></article>
        </section>
      </div>
    </main>

    <div v-if="toast" class="toast" role="status">{{ toast }}</div>

    <div v-if="showHtml" class="modal-backdrop" @click.self="showHtml = false">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="html-title">
        <div class="modal-head">
          <div>
            <h2 id="html-title">HTML 源码</h2>
            <p>这是复制到剪贴板的实际内容。</p>
          </div>
          <button class="close-button" aria-label="关闭" @click="showHtml = false">×</button>
        </div>
        <textarea readonly :value="htmlOutput"></textarea>
        <div class="modal-actions">
          <button class="secondary-button" @click="showHtml = false">关闭</button>
          <button class="primary-button" @click="copyForWechat"><Clipboard :size="16" />复制 HTML</button>
        </div>
      </section>
    </div>
  </div>
</template>
