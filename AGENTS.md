# AGENTS.md

本文件为 Codex（Codex.ai/code）在此仓库中工作时提供指导。

## 行为规则

- **禁止直接推送到远端**：执行任何 `git push` 前必须先询问用户，得到明确同意后才能推送。
- **推送前必须先拉取**：推送前执行 `git pull --rebase origin main` 合并远端最新提交，再执行推送。
- **沟通与思考使用中文**：所有回复、分析、说明均用中文表达。
- **文档使用中文 Markdown**：新建或修改文档（含注释性文档）时，内容以中文书写，格式使用 Markdown。

## 常用命令

```bash
npm run dev            # 启动 Vite 开发服务器（仅 Chrome，支持 HMR）
npm run build          # 类型检查 + 生产构建 → dist/
npm run build:firefox  # 先构建 Chrome 产物，再打包 Firefox → time-master-firefox.zip
npm run test           # 运行单元测试（Vitest）
npm run typecheck      # 仅执行 vue-tsc --noEmit
```

运行单个测试文件：`npx vitest run src/lib/time.test.ts`

加载到 Chrome：`chrome://extensions` → 开启开发者模式 → 加载已解压的扩展程序 → 选择 `dist/`  
加载到 Firefox：`about:debugging` → 此 Firefox → 临时加载附加组件 → 选择 `dist-firefox/manifest.json`

## 架构说明

### 两个入口，共用同一个 Vue App

`src/popup/` 和 `src/standalone/` 各有一个 `index.html` + `main.ts`，都挂载同一个 `src/App.vue`，通过 `mode` prop（`'popup'` | `'standalone'`）区分。独立窗口通过 `chrome.runtime.sendMessage({ type: 'OPEN_STANDALONE' })` 触发，由 `src/background/service-worker.ts` 处理。

### 核心约定

**时间逻辑纯函数化、集中管理。** 所有时间戳和格式转换逻辑均在 `src/lib/time.ts` 中以纯函数形式提供，返回 `ParseResult<T>`。组件不直接调用 Day.js，而是调用 `formatTimestamp`、`parseToTimestamp`、`detectTsUnit` 等函数。错误值为 key（如 `'invalidTs'`），不是本地化字符串，组件通过 `t('errors.invalidTs')` 翻译。

**全局唯一 Timer。** `src/composables/useNow.ts` 在整个 App 中只运行一条 `setTimeout` 链。所有需要当前时间的组件调用 `useNow()`，共享同一个 `ref<number>`。通过订阅者计数管理生命周期：有订阅者时启动，全部卸载时停止。

**Storage 封装为响应式 ref。** `src/composables/useStorage.ts` 将 `chrome.storage.sync`（`windowBounds` 使用 `.local`）封装为模块级缓存的 `Ref`。`useStoredValue('key')` 返回有类型的 ref，自动初始化读取、变更时防抖写入（80ms），并监听 `chrome.storage.onChanged` 保持 popup ↔ 独立窗口之间的同步。`suppressWrite` 标志防止写入循环。

**自定义 i18n（非 vue-i18n）。** MV3 的 CSP 禁止 `new Function()`，而 vue-i18n 内部依赖此特性。项目使用 `src/i18n/index.ts` 中 30 行的自定义实现：模块级 `locale` ref + `t(key, params?)` 函数。组件通过 `src/composables/useT.ts` 的 `useT()` 访问。语言文件为 `src/locales/en.json` 和 `src/locales/zh.json`。

### Firefox 构建

`scripts/build-firefox.mjs` 对 Chrome 的 `dist/` 进行后处理，输出 `dist-firefox/`：

1. 将 `background.service_worker` 替换为 `background.scripts`（兼容 Firefox < 121 的 event page 模式）
2. 删除 `minimum_chrome_version`
3. 注入 `browser_specific_settings.gecko`（id、strict_min_version: 140、data_collection_permissions）
4. 添加 `gecko_android.strict_min_version: 142`
5. 用 `web-ext` 打包

### CI / 自动发版

`.github/workflows/build.yml` 在每次推送到 `main` 时触发，依次构建 Chrome 和 Firefox 两个 zip，然后运行 `semantic-release`：若存在可发布的提交，自动递增 `package.json` 版本号，创建 GitHub Release 并附上两个 zip，最后将版本号变更以 `[skip ci]` 提交回仓库。

提交类型规则：`feat:` → minor，`fix:` → patch，`BREAKING CHANGE` → major，`chore:`/`docs:` 不触发新版本。

### Storage 分区

- `chrome.storage.sync`：所有用户设置（`selectedTimezones`、`timeFormat`、`theme`、`tsUnit`、`defaultTimezone`、`defaultFormat`、`language`）
- `chrome.storage.local`：`windowBounds`（无需跨设备同步）+ 独立窗口 ID（`standaloneWindowId`，窗口关闭时主动清除）

### 世界时钟卡片昼夜配色

每张卡片的昼夜背景由 `src/lib/time.ts` 中的 `isDaytime(ms, tz)` 按时区计算。白天 = 6:00–17:59（常量 `DAY_START_HOUR`/`NIGHT_START_HOUR` 在 `src/lib/constants.ts`），白底为昼，`#1c1c1e` 为夜。

### 新增时区中文别名

编辑 `src/lib/constants.ts` 中的 `TIMEZONE_CN_ALIASES`。数组格式为 `[首选显示名, ...搜索词]`，index 0 在 locale 为 `zh` 时显示在卡片上。
