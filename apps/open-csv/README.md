# Gridline CSV Viewer

一个完全在浏览器本地运行的 CSV 预览工具，使用 Vue 3、Vite、Tailwind CSS 和 JavaScript 构建。

## 功能

- 拖放、选择文件、粘贴剪贴板
- Papa Parse CSV 解析
- 全表搜索、列排序、列显隐
- 单击标题选择整列，双击单元格直接编辑
- 导出过滤后且仅包含可见列的 CSV
- 英文基准文案及 39 种完整翻译，按语言目录生成独立 SEO 页面
- 键盘快捷键、语义化表格、减少动画支持
- 文件不会上传到服务器
- Vue 运行时通过 `https://cdn.jsdelivr.net/npm/vue@3.5.40/dist/vue.global.min.js` 加载，不进入生产包

## 本地运行

```bash
pnpm dev
```

生产构建：

```bash
pnpm build
```

依赖由仓库根目录的 pnpm workspace 统一安装，共享 `@tools/tool-build` 构建程序。当前项目独立输出为 `apps/open-csv/dist/index.html`。

英文文案位于 `src/locales/en.js`。更新英文 key 后可运行 `pnpm locales:generate` 补齐其他语言；生成结果集中保存在 `src/locales/generated.js`，无需维护多份源码页面。

发布前在 `.env` 中配置正式站点地址：

```bash
SITE_URL=https://kelyn8.github.io/open-csv/
```

构建程序会据此为每个语言页面生成绝对 canonical、绝对 `hreflang` 和 `dist/sitemap.xml`。未配置正式域名时只生成可解析的相对自引用 canonical，不会生成包含错误域名的 sitemap。
