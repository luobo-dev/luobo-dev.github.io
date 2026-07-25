# Browser Tools

一个 pnpm workspace。所有工具由同一个 `Kelyn8/Kelyn8.github.io` 仓库管理，并共享同一套构建程序。

```text
tools/
├── package.json
├── pnpm-workspace.yaml
├── apps/
│   ├── open-csv/
│   │   ├── package.json
│   │   ├── index.html
│   │   └── src/
│   └── wechat-editor/
│       ├── package.json
│       ├── index.html
│       └── src/
├── packages/
│   └── tool-build/       # 共享 Vite、Tailwind、Vue CDN 构建程序
└── scripts/
    └── prepare-pages.mjs
```

每个工具独立输出自己的构建目录：

```text
apps/open-csv/index.html     → apps/open-csv/dist/index.html
apps/wechat-editor/index.html → apps/wechat-editor/dist/index.html
```

## 命令

```bash
pnpm install
pnpm dev:open-csv       # 开发 Open CSV
pnpm build:open-csv     # 只构建 Open CSV
pnpm build              # 构建所有工具
pnpm build:pages        # 构建所有工具并汇总到 pages-dist
```

也可以进入工具目录执行 `pnpm dev`、`pnpm build`。Vue 运行时由各入口 HTML 通过指定的 jsDelivr CDN 加载，不会打进产物。

## GitHub Pages

仓库使用 `.github/workflows/deploy-pages.yml` 自动发布。推送到 `main` 后，Actions 会安装依赖、执行 `pnpm build:pages`，并把 `pages-dist` 发布到：

```text
https://kelyn8.github.io/
├── open-csv/
└── wechat-editor/
```

工具的源码目录与发布路径在 `site.config.js` 中统一配置。新增工具后，在该文件增加一项即可汇总到 Pages 产物。
