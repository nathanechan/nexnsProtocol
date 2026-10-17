# NEXNS 视觉升级 · Step 2 基础设计系统

## 范围

本轮把 Step 1 的浅色方向整理为全站基础控件。页面信息架构、布局、Curve、参与、质押、结算、领取、模拟数据与金融持久化不变。市场列表和终端的完整布局升级仍分别属于 Step 3/4。

- 样式入口：`src/app/design-system.css`，在旧页面样式之后载入。
- 已迁移旧基础按钮与输入定义，保留搜索、表格、终端等页面布局规则。
- 组件预览：`/visual-preview/components`，不加入普通产品主导航。
- 页面样板：`/visual-preview` 与 `?view=operating` 继续可用。

## Token 与组件契约

| 类别   | 规范                                                             |
| ------ | ---------------------------------------------------------------- |
| 品牌色 | `--nexns-accent` / hover / soft                                  |
| 中性色 | canvas / surface / ink / secondary / muted / line / control-line |
| 反馈色 | success / danger 及对应浅色背景                                  |
| 间距   | 4 / 8 / 12 / 16 / 24px                                           |
| 圆角   | 控件 10px、面板 18px，弹窗桌面 20px、手机 16px                   |
| 焦点   | 统一外轮廓；输入框使用边框加光环                                 |
| 动效   | 控件 140ms、浮层 180ms；尊重系统减少动态效果                     |
| 浮层   | 遮罩 1000、弹窗 1001、提示 1100                                  |

基础小字 muted 使用 `#5F7088`，对白底对比度约 5.05:1、对页面底约 4.67:1；主操作白字对蓝底约 4.92:1。此检查仅覆盖基础 token，页面内遗留的硬编码文字色留待页面步骤逐一检查。

旧的 `--canvas`、`--ink`、`--line`、`--blue` 等变量保留为新 token 的别名，避免页面迁移时断开引用。

### 按钮

主、次、轻操作具备 normal / hover / pressed / focus / disabled 状态。`Button` 新增可选 `loading` 属性，保持原 children 和 variant 接口；loading 显示无障碍隐藏的加载图标，设置 `aria-busy` 并禁用重复点击。原生 disabled、点击事件和默认表单行为保留。

Curve 交易、Operating 操作与创建项目沿用各自原有 processing 状态，新增加载视觉。没有增加新的执行延时或模拟成功路径。

### 表单与切换

统一 Input、Select 与创建表单 textarea 的背景、边框、焦点、无效与禁用外观；错误继续通过既有 aria-invalid / aria-describedby 关联。ProductTabs 保留原有方向键、Home / End、aria-selected 与焦点行为。

### 弹窗与反馈

沿用 Radix 的 Portal、焦点约束、Escape、关闭与焦点恢复。仅修改表面、层级、排版和动效；确认内容、经济警告和阻止处理中关闭的逻辑不变。
普通、成功、失败消息使用不同语义外观，失败增加 operation-error 类。反馈文案、金额和状态仍由原组件生成。Toast 在手机底部导航与安全区之上显示。

## 组件预览页

包含按钮变体、加载到完成、输入错误、禁用输入、选择器、键盘标签、确认弹窗和消息样式。
示例金额明确为组件展示，不调用金融 store；示例 loading 定时器仅属于该预览页，并在卸载清理。

## 验证方法

运行原有完整单元/集成测试；生产构建内进行 lint 与类型检查。
`scripts/foundation-step2-browser-check.mjs` 检查中英文及 1440/768/430/390：无溢出、pending 禁用及 aria-busy、输入焦点与错误关联、Select、键盘标签、弹窗尺寸/焦点/关闭恢复、减少动效。
复跑现有业务浏览器脚本，检查创建、买卖、迁移、参与、Stake/Unstake、Claim、资产、搜索、语言及移动导航。实际结果与截图写入忽略目录 `test-results/foundation-step2/`。

本轮完成后停在 Step 2 审核；不自动推送或部署，不开展 Step 3 页面重构。
