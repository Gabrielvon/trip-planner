# 行程安排网页工具 PRD

版本：v1.0  
日期：2026-03-24  
作者：GPT-5.4 Thinking（基于本次会话沉淀）

---

## 1. 文档目的

本文档用于将“行程安排网页工具”从概念原型推进为可由 VS Code Copilot / Codex 接手继续开发的正式产品需求文档。本文档覆盖：

- 产品目标与边界
- 用户场景与核心价值
- 功能需求与非功能需求
- 数据模型与系统架构
- 前后端接口契约
- 开发阶段、验收标准与风险

本文档默认目标是 **MVP 可落地**，而不是一次性做成 OTA / 旅游平台 / 完整 AI 助手。

---

## 2. 产品定义

### 2.1 产品名称
行程安排网页工具（Trip Planner）

### 2.2 产品一句话定义
一个能够读取自然语言描述或日历事件，理解多日行程约束，调用地图与日历能力，自动生成可执行时间表与路线导航的多日排程工具。

### 2.3 根本目标
把“模糊输入 + 多日约束 + 路线优化 + 时间安排”压缩为一个 **可执行、可解释、可导出** 的行程结果。

### 2.4 本产品不是
以下能力不属于首版目标：

- 不做 OTA 预订平台（酒店/机票/餐厅一键预订）
- 不做旅游攻略社区
- 不做多人协同项目排程系统
- 不做国际复杂联运（多城市、多航段、多签证规则）
- 不做预算优化/费用报销系统

---

## 3. 核心用户与典型场景

### 3.1 核心用户画像

#### A. 商务差旅用户
特点：
- 需要在一到多天内拜访多个机构/客户/地点
- 每个点的交流时长不完全固定
- 已有航班/高铁/会议/酒店等硬约束
- 更关心“顺路”“不迟到”“别太折返”

#### B. 自由行用户
特点：
- 有多个想去的景点/餐厅/预约
- 希望自动安排更顺路的日程
- 需要地图与时间表双输出

#### C. 已有日历重排用户
特点：
- 已有既定事件，希望把新增事项插入空档
- 需要系统识别冲突与不可行性

### 3.2 本项目最优先服务的用户
**商务差旅 / 尽调走访 / 多机构会面** 场景。

原因：
- 用户价值密度高
- 约束复杂，自动化价值显著
- 更容易定义“好结果”的标准（不冲突、顺路、不迟到、节奏合理）

---

## 4. 用户价值主张

用户输入一句自然语言，或者导入已有日历后，系统能够：

1. 理解多日行程中的地点、时间窗、停留时长、固定顺序与偏好
2. 调用地图服务将地点标准化并估算真实路程
3. 按“最顺路 / 用时最少 / 平衡模式”等目标优化顺序
4. 输出：
   - 多日时间表
   - 分日路线图
   - 分日导航链接
   - 解释说明（为何这样排）
5. 支持导出或写回日历

---

## 5. 产品边界与 MVP 范围

## 5.1 MVP 范围（必须做）

### 输入
- 自然语言输入
- 手动编辑参数
- 预留 Google Calendar / ICS 导入入口

### 理解
- 将自然语言解析为结构化多日行程
- 识别 day / stop / 时间窗 / 时长 / 固定顺序 / 起终点

### 地图
- 地图 Provider 抽象层
- 首版优先支持 **高德地图**
- 预留 Google Maps / Mapbox 适配位

### 优化
- 多日分段优化
- 每日内部顺序优化
- 时间表生成
- 导航链接生成

### 输出
- 分日时间表
- 分日顺序
- 分日路线图（MVP 可先用简化图层，后接真实地图组件）
- 导出日历入口

## 5.2 MVP 明确不做
- 不做酒店/航班/餐厅预订
- 不做多人协同
- 不做预算/费用报销联动
- 不做完整国际跨城市联运
- 不做推荐引擎（景点/餐厅推荐）

---

## 6. 产品原则

### 6.1 先约束，后优化
先满足硬约束：
- 航班 / 高铁 / 会议 / 酒店入住退房
- 最早开始 / 最晚到达
- 固定顺序

再优化软目标：
- 更顺路
- 总用时更少
- 减少折返
- 同区域聚合
- 每天节奏更均衡

### 6.2 多日不混算
不能把所有地点扔成一个总路径问题。必须：
1. 先按 day 切分
2. 每日内部优化
3. 再处理跨日衔接（酒店、次日起点、交通锚点）

### 6.3 地图不是展示层，而是能力层
地图层不仅负责显示，还负责：
- 地理编码
- POI 搜索
- 路径矩阵
- 路径规划
- 导航链接生成

因此必须设计 **Map Provider Adapter**，业务层不得直接耦合某个 provider 的原始响应。

### 6.4 页面必须保持“薄壳”
复杂逻辑不得继续堆进单个页面文件。页面只承担：
- 展示
- 用户交互
- API 调用
- 状态管理

复杂逻辑必须拆到 `lib/trip/*` 与 `app/api/trip/*`。

---

## 7. 关键需求

## 7.1 需求一：理解行程

### 7.1.1 自然语言输入
用户可以输入类似：

- “D1 上午从东京站出发，先去浅草寺，停留 60 分钟；中午 12:30 前到上野吃饭；下午去东京国立博物馆；傍晚去银座见客户；晚上回酒店。”
- “第二天上午从酒店出发，先去横滨红砖仓库，中午在港未来附近吃饭，下午再去杯面博物馆，晚上回东京站。”

系统应解析：
- day
- stop title
- rawLocation
- durationMin
- earliestStart / latestArrival
- fixedOrder
- 起点 / 终点
- 交通模式（若明确表达）

### 7.1.2 日历输入
首版要求：
- UI 中保留入口
- 后端契约预留
- 后续支持：
  - Google Calendar 读取既有事件
  - ICS 导入

### 7.1.3 手动编辑
用户需能在 UI 中修正：
- 站点名称
- 地点
- 时长
- 时间窗
- 顺序约束

---

## 7.2 需求二：地图与工具调用

### 7.2.1 高德地图优先
由于中国大陆场景兼容性与中文 POI 体验，高德地图为首版默认 provider。

### 7.2.2 Provider 抽象层
必须支持以下接口：
- `geocode(query)`
- `searchPOI(query, city?)`
- `routeMatrix(points, mode)`
- `routePath(origin, destination, waypoints, mode)`
- `buildNavigationLink(...)`

### 7.2.3 真实能力接入顺序
1. Mock provider
2. AMap adapter
3. Google / Mapbox adapter

---

## 7.3 需求三：多日路线优化

### 7.3.1 目标模式
系统至少支持三种优化目标：
- `fastest`：总时间最少
- `shortest`：尽量更顺路 / 折返更少
- `balanced`：兼顾效率与可执行性

### 7.3.2 首版优化策略
首版不强求复杂运筹求解器，要求：
- 稳定
- 可解释
- 足够快
- 能覆盖大多数真实商务差旅场景

建议流程：
1. 可行性检查
2. 分日求解
3. 时间窗回填
4. 冲突检测
5. 解释生成

### 7.3.3 冲突处理
如果无法满足硬约束，系统不得伪装成“合理方案”，而必须返回：
- 冲突点
- 哪个约束不可满足
- 可能的替代建议

---

## 7.4 需求四：输出时间表与导航图

### 7.4.1 输出必须同时包含
- 分日时间表
- 分日站点顺序
- 分日路线/导航图
- 导航链接
- 解释文本

### 7.4.2 不合格输出
以下输出视为不合格：
- 只有路线图，没有到达/离开时间
- 只有时间表，没有路线/导航
- 没有说明为什么这样排

---

## 8. 核心交互流程

## 8.1 主流程
1. 用户输入自然语言或导入日历
2. 系统解析为多日结构化草稿
3. 用户确认或修正地点/参数
4. 用户选择优化目标与交通方式
5. 系统进行分日优化
6. 系统输出时间表 + 路线 + 导航链接
7. 用户导出/写回日历

## 8.2 异常流程
- 地点歧义：要求用户确认候选地点
- 排程不可行：展示冲突
- API 不可用：回退到 mock，且显式提示

---

## 9. 信息架构与页面结构

### 9.1 页面模块
- 输入区
- 参数区
- 解析结果区
- 分日路线图区
- 分日时间表区
- 解释区
- 导航链接区
- 导出区

### 9.2 页面职责
页面文件 (`app/trip/page.tsx`) 必须保持轻量，仅承担：
- 表单状态
- 调用 client 封装函数
- 展示结果

复杂逻辑不得再堆回页面。

---

## 10. 数据模型

## 10.1 核心顶层对象

```ts
export type MultiDayTrip = {
  tripId?: string;
  title?: string;
  timezone: string;
  mapProvider: 'amap' | 'google' | 'mapbox';
  transportMode: 'driving' | 'walking' | 'cycling' | 'transit';
  objective: 'fastest' | 'shortest' | 'balanced';
  preferences?: TripPreferences;
  days: TripDay[];
  hardConstraints: HardConstraint[];
  source?: TripSource;
};
```

## 10.2 每日对象

```ts
export type TripDay = {
  day: number;
  date?: string;
  start?: DayEndpoint;
  end?: DayEndpoint;
  hotel?: HotelStay;
  stops: TaskStop[];
};
```

## 10.3 站点对象

```ts
export type TaskStop = {
  id: string;
  title: string;
  rawLocation: string;
  resolvedPlace?: ResolvedPlace;
  durationMin: number;
  earliestStart?: string;
  latestArrival?: string;
  fixedOrder?: boolean;
  priority?: number;
  category?: 'meeting' | 'meal' | 'sightseeing' | 'hotel' | 'transport' | 'custom';
  notes?: string;
};
```

## 10.4 地点对象

```ts
export type ResolvedPlace = {
  provider: 'amap' | 'google' | 'mapbox';
  placeId?: string;
  name: string;
  address?: string;
  city?: string;
  district?: string;
  lat: number;
  lng: number;
};
```

## 10.5 偏好与约束对象
至少支持：
- 日历块约束
- 最晚到达约束
- 最早开始约束
- 固定顺序约束
- 交通锚点约束

---

## 11. 系统架构

## 11.1 技术栈

### 前端
- Next.js App Router
- TypeScript
- React
- Tailwind / shadcn（可选，当前代码可继续迭代）

### 后端
- Next.js Route Handlers
- `lib/trip/server.ts` 作为服务端业务核心

### 外部能力
- AMap（优先）
- Google Calendar（后续）
- OpenAI Structured Outputs（后续）

## 11.2 目录建议

```text
app/
  trip/
    page.tsx
  api/
    trip/
      parse/route.ts
      optimize/route.ts
      navigation-links/route.ts

lib/
  trip/
    types.ts
    mock.ts
    ui-mappers.ts
    parse-client.ts
    server.ts
```

## 11.3 当前分层原则
- `types.ts`：统一类型
- `mock.ts`：本地假数据与启发式逻辑
- `ui-mappers.ts`：前后端结构转换
- `parse-client.ts`：API 请求 + fallback 封装
- `server.ts`：服务端 route 业务实现
- `page.tsx`：薄页面壳

---

## 12. API 设计

## 12.1 `POST /api/trip/parse`

### 作用
将自然语言解析为多日行程草稿。

### 请求
```json
{
  "text": "D1 上午从东京站出发...",
  "timezone": "Asia/Tokyo",
  "mapProvider": "amap",
  "calendarBlocks": []
}
```

### 响应
```json
{
  "trip": { ... },
  "warnings": []
}
```

### 当前状态
- 已有最小服务端实现
- 仍未接入真实 LLM 结构化解析
- 当前按示例规则或占位草稿返回

## 12.2 `POST /api/trip/optimize`

### 作用
将结构化多日行程转为优化后的结果。

### 请求
```json
{
  "trip": { ... }
}
```

### 响应
```json
{
  "optimizedTrip": { ... },
  "explanations": [],
  "conflicts": []
}
```

### 当前状态
- 已有最小服务端实现
- 使用启发式分日优化
- 暂未接真实地图 ETA / route matrix

## 12.3 `POST /api/trip/navigation-links`

### 作用
为每一天生成导航链接。

### 请求
```json
{
  "trip": { ... }
}
```

### 响应
```json
{
  "days": [
    { "day": 1, "navigationUrl": "..." }
  ]
}
```

### 当前状态
- 已实现高德 URI 形式导航链接生成
- 暂未做多 waypoint 完整深链能力增强

---

## 13. 当前实现状态（对接 Copilot/Codex 的现实描述）

### 已完成
- 完成产品方向与边界定义
- 完成多日行程模型设计
- 完成地图 Provider 抽象思路
- 完成前端薄壳页面结构
- 完成 mock fallback 机制
- 完成最小服务端 route handlers
- 前端已优先请求真实 `/api/trip/*`

### 未完成
- 未接 OpenAI Structured Outputs
- 未接真实高德 geocode / route matrix / route path
- 未接 Google Calendar / ICS
- 未实现地点歧义确认 UI
- 未实现冲突详情 UI
- 未实现真实地图组件渲染

---

## 14. 非功能需求

### 14.1 性能
- 单次 parse / optimize 交互应在可接受范围内完成
- 页面不能因接口不可用而整体报废
- 前端应保留 fallback 机制直到真实后端稳定

### 14.2 可维护性
- 严禁继续把复杂逻辑塞回 `page.tsx`
- 严禁继续把整个系统塞进单个 canvas / 单文件
- 业务逻辑必须模块化

### 14.3 可扩展性
后续必须能平滑扩展到：
- 真实 AMap provider
- Google / Mapbox provider
- OpenAI structured parsing
- 日历同步

---

## 15. 开发阶段建议

## 阶段 1：打通真实前后端闭环（当前已接近完成）
目标：页面真实命中 route handlers，而非纯 mock。

## 阶段 2：接真实结构化解析
目标：用 OpenAI Structured Outputs 将自然语言转成严格 JSON。

## 阶段 3：接真实地图 provider
目标：高德地图 geocode / route matrix / navigation link 真接入。

## 阶段 4：接真实地图渲染
目标：用高德地图组件替换简化路线图。

## 阶段 5：接日历能力
目标：Google Calendar / ICS 导入导出。

## 阶段 6：增强优化器与冲突处理
目标：提升可解释性与时间窗求解能力。

---

## 16. 验收标准（MVP）

一个最小可验收的版本，应满足：

1. 用户可在 `/trip` 页面输入多日自然语言
2. 点击“解析行程”后，能得到结构化分日站点结果
3. 点击“执行优化”后，能得到：
   - 分日时间表
   - 分日顺序
4. 点击“生成导航”后，能得到分日导航链接
5. 若真实 `/api/trip/*` 可用，页面走真实接口
6. 若真实接口异常，页面自动回退到 mock，且显式提示
7. 项目采用多文件结构，页面文件保持薄壳

---

## 17. 主要风险与处理

### 风险 1：输入不够结构化
处理：优先接 Structured Outputs，不要继续堆正则。

### 风险 2：地点歧义导致路线错误
处理：加地点候选确认流程。

### 风险 3：多日约束混算
处理：严格坚持按 day 切分优化。

### 风险 4：继续单文件堆代码导致不可维护
处理：禁止继续把核心逻辑塞回页面。

### 风险 5：外部接口不稳定导致开发中断
处理：保留 API 优先 + mock fallback 机制，直到真实服务稳定。

---

## 18. 当前最值得继续做的工作

### P0
接入 OpenAI Structured Outputs 到 `POST /api/trip/parse`。

### P1
接真实高德地图能力：
- geocode
- POI search
- route matrix
- navigation url

### P2
把页面上的简化路线图区替换为真实地图组件。

### P3
实现地点歧义确认与冲突提示 UI。

### P4
接 Google Calendar / ICS。

---

## 19. 一句话总结

这个项目真正的核心竞争力不是“会画路线图”，而是：

**把模糊自然语言、多日约束、地图能力与可执行时间表压成一个稳定、可解释、可继续扩展的排程系统。**
