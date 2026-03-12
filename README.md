# Deployment Playground

Deployment Playground 是一个面向培训与架构演练的可视化部署仿真沙盘。  
你可以在画布中拼装系统拓扑，注入故障事件，观察指标变化，并基于评分体系完成场景通关与复盘。

## 核心能力

- 可视化拓扑设计：拖拽建模、连接规则校验、批量编辑、模板加载/保存
- 仿真内核：流量传播、请求生命周期、资源消耗、自动扩缩容、策略执行
- 故障演练：事件库注入、串并行编排、概率触发、时间窗触发
- 场景系统：多关卡目标约束、解锁进度、星级评分、自动复盘报告
- 可观测调试：热力图、调用链、事件时间线、内部状态快照、事件回放、性能剖析
- 协作能力：架构快照、导出分享、方案对比、模板市场
- 工程保障：单测/集成/E2E/性能基线 + CI 流水线

## 技术栈

- 前端：React 19 + TypeScript + Vite
- 画布：@xyflow/react
- 状态管理：Zustand
- 样式：CSS + 主题变量（兼容 Tailwind 依赖）
- 测试：Vitest + Testing Library + jsdom
- 质量：ESLint + GitHub Actions CI

## 快速开始

### 1) 安装依赖

```bash
npm ci
```

### 2) 启动开发环境

```bash
npm run dev
```

默认地址：`http://localhost:5173/`

### 3) 构建与预览

```bash
npm run build
npm run preview
```

## 常用脚本

- `npm run dev`：本地开发
- `npm run lint`：代码检查
- `npm test`：执行全部测试
- `npm run test:perf`：执行性能基线专项测试
- `npm run build`：TypeScript 构建 + Vite 打包
- `npm run preview`：预览构建产物

## 项目结构

```text
src/
  data/        场景、节点、事件模板
  engine/      仿真内核、策略、调试工具、持久化能力
  store/       全局状态分层（画布/仿真/监控/场景）
  components/  错误边界等通用组件
  App.tsx      主要交互与业务编排
```

## 场景与演练

当前包含 6+ 可演练场景，覆盖：

- 缓存与洪峰处理
- 搜索与热分片
- 多地域容灾
- 发布治理（灰度与回滚）
- 成本优化与 SLA 平衡
- 合规安全约束

场景配置与目标定义位于 `src/data/scenarios.ts`，支持约束、评分权重、通关标准。

## 可重复故障注入

项目支持故障种子（Seed）驱动的可重复演练：

- 在事件编排面板设置故障种子
- 同一种子 + 同序列下可复现相同注入序列
- 可通过“重置随机序列”进入下一个可重复序列

相关实现：

- `src/engine/random.ts`
- `src/engine/orchestration.ts`
- `src/engine/orchestration.reproducible.test.ts`

## 持久化与异常处理

- 草稿自动保存/恢复：`src/engine/draft.ts`
- 快照与模板：`src/engine/snapshots.ts`、`src/engine/templateMarket.ts`
- 错误边界与全局异常上报：`src/components/AppErrorBoundary.tsx`、`src/engine/errorReporter.ts`

## 风险约束与口径

风险边界与参数护栏见：

- `src/config/guardrails.ts`
- `docs/risk-and-guardrails.md`

包含仿真精度边界、参数上下限、性能开销控制与评分术语统一口径。

## CI 与质量保障

CI 工作流位于 `.github/workflows/ci.yml`，覆盖：

- 安装依赖
- Lint
- Test
- Build
- dist 产物归档

当前测试体系包含单元测试、集成测试、端到端测试与性能基线测试。

## 文档

- 用户使用手册：`docs/user-manual.md`
- 风险与边界约束：`docs/risk-and-guardrails.md`
