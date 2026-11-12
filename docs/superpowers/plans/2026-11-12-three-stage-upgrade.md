# 三阶段升级实施计划

> 执行方式：主代理负责时间核心与界面，独立子任务按明确文件范围实现运行时修复和构建链路，Git 写操作仅主代理执行。使用测试驱动开发与独立代码审查。

**目标：** 完成稳定性修复、统一转换和跨时区规划，产出可本地加载的扩展，不自动推送、合并或发布。

**架构：** 纯函数集中在时间模块；响应式设置使用模块级生命周期；当前时钟和计划时刻分离；界面复用双语、时区选择和复制控件。

## 任务 1：时间核心与回归

文件：`src/lib/time.ts`、`src/lib/time.test.ts`、新增 `src/lib/time-upgrade.test.ts`。

- [x] 先添加并运行失败用例：非法日期、ISO +08:00 往返、纽约跨日、印度 −2.5 小时、显式毫秒、溢出、纽约 DST 缺口与重复。
- [x] 严格日期解析；枚举有效偏移生成 DST 候选；添加统一输入解析、输出格式、工作时间和重叠时段纯函数。
- [x] `npm test -- src/lib/time.test.ts src/lib/time-upgrade.test.ts` 通过。

## 任务 2：设置、时钟与窗口

文件：`src/composables/useStorage.ts`、`useNow.ts`、`useClipboard.ts`、新增对应测试、`src/background/service-worker.ts`、新增后台测试、`src/composables/useWindowBounds.ts`。

- [x] 先复现组件 scope 卸载、同步覆盖、复制 false、并发开窗。
- [x] 存储监听器放入独立 scope，取消旧待写任务，防初始化覆盖；唯一时钟无全局暂停，面板局部暂停。
- [x] 开窗使用共享进行中 Promise；Firefox 独立窗口页面防抖保存外边框坐标与尺寸；处理失败和不可用 API。
- [x] 对应 Vitest 回归通过，不访问真实扩展存储。

## 任务 3：发布与构建

文件：`scripts/build-firefox.mjs`、新增 `scripts/release-prepare.mjs`、`scripts/verify-packages.mjs` 和构建测试、`.releaserc.json`、`.github/workflows/build.yml`、`package.json`。

- [x] 打包前清理 Firefox 目录。
- [x] 自定义本地 release prepare 插件排在 npm 更新版本之后，执行双浏览器构建、打包和版本断言；保留 GitHub 上传与版本提交。
- [x] CI 在 PR 和功能分支执行验证，仅 main push 允许语义化发布。
- [x] 不运行真实 semantic-release，不推送。

## 任务 4：统一转换界面

文件：新增 `src/components/TimestampTool/SmartConverter.vue`，修改 `TimestampTool.vue`、`NowPanel.vue`、`src/composables/useTimezones.ts`、`src/components/common/TimezoneSelect.vue`、语言文件。

- [x] 新界面使用纯函数解析，保留常用格式设置和显式数字单位。
- [x] 展示六种结果与复制状态；错误不展示旧结果；删除失去引用的旧转换卡片。
- [x] UTC、中文别名、精确偏移搜索和键盘关闭可用。

## 任务 5：跨时区规划界面

文件：新增 `src/components/WorldClock/TimePlanner.vue`，修改 `WorldClockList.vue`、`WorldClockItem.vue`、语言文件。

- [x] 参考时区、日期时间、15 分钟滑块、DST 候选选择、恢复实时。
- [x] 卡片联动及工作状态；显示可调整工作时间和共同可用时段。
- [x] 按日期重新计算偏移，不复用当前时刻的 DST。

## 任务 6：交付验证与文档

文件：`README.md`、`AGENTS.md`、本计划，新增必要界面回归。

- [x] 完整测试、类型检查、双浏览器构建、包版本断言和 lint。
- [x] 检查 popup 和 standalone，覆盖统一转换、规划、切换标签和设置持久化。
- [x] 独立审查差异，修复重要问题并定向重测。
- [x] 文档记录实际结果、限制和未推送状态；主代理检查差异后本地提交。

## 当前状态

设计已由代理依据用户确认的三阶段方向及项目自主推进规则审定。基线 `f2d4b9f`，工作分支 `feature-three-stage-upgrade`；实施开始前工作区干净。


## 最终记录

三个阶段实现及相关验证完成：96 项单测、10 项真实 Chromium 扩展测试、三种宿主时区的核心回归、类型检查、双包构建及实际 ZIP 版本校验通过。运行时与特性分别进行了独立审查，重要问题已修复并复审。Firefox lint 为 0 错误、2 警告；真实 Firefox 尚未回归。

完整证据和限制见 `docs/2026-11-12-upgrade-validation.md`。未推送、未创建 PR、未合并、未发版；本地完成提交后保留功能分支，等待用户明确推送授权。
