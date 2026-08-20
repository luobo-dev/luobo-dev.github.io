import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.BASE_PATH || '/pocket-ledger/'

export default defineConfig({
  base,
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon-v3.png'],
      manifest: {
        name: '一笔 - 私人记账',
        short_name: '一笔',
        description: '无广告、数据只保存在本机的私人记账工具',
        theme_color: '#163f31',
        background_color: '#f4f1e9',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        lang: 'zh-CN',
        icons: [
          {
            src: 'icons/icon-192-v3.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512-v3.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512-maskable-v3.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true
      }
    })
  ]
})
