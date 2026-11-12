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
npm run build:packages # 生成并校验两个最终 ZIP
npm run test:e2e       # Chromium 扩展真实加载回归
```

运行单个测试文件：`npx vitest run src/lib/time.test.ts`

加载到 Chrome：`chrome://extensions` → 开启开发者模式 → 加载已解压的扩展程序 → 选择 `dist/`  
加载到 Firefox：`about:debugging` → 此 Firefox → 临时加载附加组件 → 选择 `dist-firefox/manifest.json`

## 架构说明

### 两个入口，共用同一个 Vue App

`src/popup/` 和 `src/standalone/` 各有一个 `index.html` + `main.ts`，都挂载同一个 `src/App.vue`，通过 `mode` prop（`'popup'` | `'standalone'`）区分。独立窗口通过 `chrome.runtime.sendMessage({ type: 'OPEN_STANDALONE' })` 触发，由 `src/background/service-worker.ts` 处理。

### 核心约定

**时间逻辑纯函数化、集中管理。** 所有时间戳和格式转换逻辑均在 `src/lib/time.ts` 中以纯函数形式提供，返回 `ParseResult<T>`。组件不直接调用 Day.js，而是调用 `formatTimestamp`、`parseToTimestamp`、`detectTsUnit` 等函数。错误值为 key（如 `'invalidTs'`），不是本地化字符串，组件通过 `t('errors.invalidTs')` 翻译。

**全局唯一实时时钟 Timer。** `src/composables/useNow.ts` 在整个 App 中只运行一条 `setTimeout` 链。所有需要当前时间的组件调用 `useNow()`，共享同一个 `ref<number>`。通过订阅者计数管理生命周期：有订阅者时启动，全部卸载时停止。暂停状态属于 `NowPanel`，不得暂停全局时钟。

**Storage 封装为响应式 ref。** `src/composables/useStorage.ts` 将 `chrome.storage.sync`（`windowBounds` 使用 `.local`）封装为模块级缓存的 `Ref`。`useStoredValue('key')` 返回有类型的 ref，自动初始化读取、变更时防抖写入（80ms），并监听 `chrome.storage.onChanged` 保持 popup ↔ 独立窗口之间的同步。监听器运行在独立 effect scope 中，生命周期与模块缓存一致。外部变更取消未发出的旧写入，已发出的写入使用有界快照识别旧回声；初始化不得覆盖较新编辑。`suppressWrite` 标志防止写入循环。

**自定义 i18n（非 vue-i18n）。** MV3 的 CSP 禁止 `new Function()`，而 vue-i18n 内部依赖此特性。项目使用 `src/i18n/index.ts` 中 30 行的自定义实现：模块级 `locale` ref + `t(key, params?)` 函数。组件通过 `src/composables/useT.ts` 的 `useT()` 访问。语言文件为 `src/locales/en.json` 和 `src/locales/zh.json`。

### Firefox 构建

`scripts/build-firefox.mjs` 对 Chrome 的 `dist/` 进行后处理，输出 `dist-firefox/`：

1. 将 `background.service_worker` 替换为 `background.scripts`（兼容 Firefox < 121 的 event page 模式）
2. 删除 `minimum_chrome_version`
3. 注入 `browser_specific_settings.gecko`（id、strict_min_version: 140、data_collection_permissions）
4. 添加 `gecko_android.strict_min_version: 142`
5. 用 `web-ext` 打包

### CI / 自动发版

`.github/workflows/build.yml` 在分支推送及 PR 上运行单测、类型检查、两个包的构建与 ZIP 内部版本校验，以及真实加载扩展的 Chromium E2E。仅 `main` 推送在验证后允许发布。

`semantic-release` 的 npm 插件先更新版本；随后 `scripts/release-prepare.mjs` 的 `prepare` 钩子构建 Chrome、清理旧 Firefox 目录并构建 Firefox、打包及校验实际 ZIP 版本。最后才上传 GitHub Release 并提交版本文件。不得恢复“构建完成后才更新版本”的顺序。

提交类型规则：`feat:` → minor，`fix:` → patch，`BREAKING CHANGE` → major，`chore:`/`docs:` 不触发新版本。Git 推送仍须获得用户明确同意。

### 统一转换与规划

统一转换在 `SmartConverter.vue`；常用格式复用 `defaultFormat`，目标时区复用 `defaultTimezone`，不存储输入内容。解析、格式化、ISO 输出、DST 候选与工作时间交集纯函数均在 `src/lib/time.ts`。目标时区字段使用 `Intl` 计算，UTC 日期仅作为钟面载体，避免宿主 DST 和 Day.js 的负毫秒回解析偏差。

`TimePlanner.vue` 维护页内规划状态，向列表发出选定绝对时刻。不存在的当地时间报错，重复时间提供两个候选；工作时间默认当地周一至周五 09–18，可调起止整点，交集按 15 分钟粒度计算。参考日边界必须兼容午夜缺口与完整跳日。

独立入口在 `App.vue` 调用 `useWindowBounds()`，用于 Firefox 缺少窗口边界事件时保存位置尺寸；不得另建世界时钟计时器。

### Storage 分区

- `chrome.storage.sync`：所有用户设置（`selectedTimezones`、`timeFormat`、`theme`、`tsUnit`、`defaultTimezone`、`defaultFormat`、`language`）
- `chrome.storage.local`：`windowBounds`（无需跨设备同步）+ 独立窗口 ID（`standaloneWindowId`，窗口关闭时主动清除）

### 世界时钟卡片昼夜配色

每张卡片的昼夜背景由 `src/lib/time.ts` 中的 `isDaytime(ms, tz)` 按时区计算。白天 = 6:00–17:59（常量 `DAY_START_HOUR`/`NIGHT_START_HOUR` 在 `src/lib/constants.ts`），白底为昼，`#1c1c1e` 为夜。

### 新增时区中文别名

编辑 `src/lib/constants.ts` 中的 `TIMEZONE_CN_ALIASES`。数组格式为 `[首选显示名, ...搜索词]`，index 0 在 locale 为 `zh` 时显示在卡片上。
