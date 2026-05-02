# 甜蜜情侣积分 (Sweet Couple Points)

一个让情侣日常互动游戏化的微信小程序。

## 技术栈

- **前端**: 原生微信小程序（WXML/WXSS/JS）
- **后端**: 微信云开发（云函数 + 云数据库 + 云存储）

## 目录结构

```
sweet-couple-points/
├── miniprogram/              # 小程序前端
│   ├── app.js                # 应用入口（wx.cloud.init）
│   ├── app.json              # 全局配置（页面注册、tabBar）
│   ├── app.wxss              # 全局样式
│   ├── pages/                # 14 个页面
│   │   ├── index/            # 首页（情侣信息+积分总览）
│   │   ├── tasks/            # 任务列表
│   │   ├── shop/             # 奖励商店
│   │   ├── timeline/         # 积分时间线
│   │   ├── profile/          # 个人中心
│   │   ├── bind/             # 情侣绑定
│   │   ├── anniversary/      # 纪念日
│   │   ├── mood/             # 心情打卡
│   │   ├── messages/         # 留言板
│   │   ├── ledger/           # 账本（筛选/搜索）
│   │   ├── punishment/       # 惩罚池
│   │   ├── shared-goal/      # 共同目标
│   │   ├── lucky-draw/       # 幸运盒
│   │   └── cooldown/         # 冷静模式
│   ├── components/           # 公共组件
│   ├── utils/
│   │   ├── cloud.js          # callFunction 封装
│   │   └── format.js         # 日期/时间工具
│   └── styles/
│       └── variables.wxss    # 设计变量（颜色/圆角/阴影）
└── cloudfunctions/           # 云函数（后端）
    ├── login/                # 登录获取 openid
    └── quickstartFunctions/  # 业务函数总入口
        ├── index.js          # 嵌套 action 分发（如 user.getProfile）
        └── lib/              # 按领域划分的 14 个模块
            ├── common.js     # db/集合名/BizError/requireCouple
            ├── user.js       # 用户资料
            ├── couple.js     # 情侣绑定
            ├── home.js       # 首页聚合
            ├── points.js     # 加分/扣分（防冷静期）
            ├── records.js    # 积分记录查询
            ├── tasks.js      # 任务系统（预设+自定义）
            ├── rewards.js    # 奖励商店
            ├── anniversary.js
            ├── mood.js       # 心情打卡
            ├── letters.js    # 留言板
            ├── goals.js      # 共同目标
            ├── cooldown.js   # 冷静期
            ├── punishment.js # 惩罚池
            └── luckyDraw.js  # 幸运盒
```

---

## 本地开发

### 1. 安装微信开发者工具

下载地址：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

### 2. 导入项目

打开微信开发者工具 → 导入项目 → 选择本仓库根目录 → AppID 已写入 `project.config.json`

### 3. 开通云开发

- 在开发者工具左上角点击 "云开发" 按钮
- 创建环境（首次免费）
- 记下环境 ID，填入 `miniprogram/app.js` 的 `env` 字段

### 4. 建立云数据库集合

按照下面的「数据库设计」章节，在云开发控制台手动创建 14 个集合和对应索引。

### 5. 部署云函数

- 右键 `cloudfunctions/login` → 上传并部署：云端安装依赖
- 右键 `cloudfunctions/quickstartFunctions` → 上传并部署：云端安装依赖

---

## 数据库设计

### 设计原则

- **用户与情侣分离**：`users` 存个人资料，`couples` 存关系和双方积分
- **积分集中存储**：`couples.points` 是 `{ [openid]: number }` 对象，保证一次读取拿到双方积分
- **所有写入走云函数**：前端不直接写数据库，云函数在 `points.js` 等模块里统一做权限和业务校验
- **时间戳统一用 `db.serverDate()`**：避免客户端时间作假
- **资源归属用 `coupleId` 标识**：纪念日、目标、留言等都绑定到某一对情侣，解绑后数据仍保留但不可访问
- **\_openid 是自动字段**：通过云函数写入的文档会自动带上调用者的 openid，用于追踪"谁操作的"

---

### 集合清单

| 集合 | 说明 | 主要字段 |
|------|------|---------|
| users | 用户资料 | openid, nickname, avatar, inviteCode, coupleId |
| couples | 情侣关系 | members[], points{}, startDate, status |
| records | 积分变动记录 | coupleId, actorOpenid, targetOpenid, delta, reason, type |
| tasks | 自定义任务 | coupleId, title, points, period |
| taskCompletions | 任务完成记录 | coupleId, taskId, completedAt, pointsEarned |
| rewards | 自定义奖励 | coupleId, title, price |
| redemptions | 兑换记录 | coupleId, rewardId, redeemerOpenid, status |
| anniversaries | 纪念日 | coupleId, title, date, emoji, repeat |
| moods | 心情打卡 | coupleId, mood, date, note |
| letters | 留言/情书 | coupleId, content, likes |
| goals | 共同目标 | coupleId, title, total, current, contributions{} |
| cooldowns | 冷静期 | coupleId, startedBy, startAt, endAt, status |
| punishments | 惩罚记录 | coupleId, level, content, status |
| luckyDraws | 抽奖记录 | coupleId, rarity, prizeKey, cost |

---

### 详细字段定义

#### `users` — 用户
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | 文档 ID（自动） |
| `_openid` | string | 微信 openid（自动写入） |
| `nickname` | string | 昵称 |
| `avatar` | string | 头像 URL（云存储或外链） |
| `inviteCode` | string | 6 位邀请码，全局唯一 |
| `coupleId` | string | 绑定的情侣 ID；空字符串表示未绑定 |
| `createdAt` | date | 创建时间 |
| `updatedAt` | date | 更新时间 |

**索引**：`inviteCode` 唯一，`_openid` 唯一。

#### `couples` — 情侣关系
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | coupleId |
| `members` | string[] | 长度为 2，两位成员的 openid |
| `points` | object | `{ [openid]: number }` 双方当前积分 |
| `startDate` | date | 在一起纪念日 |
| `status` | string | `active` / `dissolved` |
| `createdAt`, `updatedAt`, `dissolvedAt` | date | |

**索引**：`members` 建议建多键索引。

#### `records` — 积分变动记录
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | |
| `coupleId` | string | |
| `actorOpenid` | string | 操作人 |
| `targetOpenid` | string | 积分变动的人 |
| `delta` | number | 正加负扣 |
| `reason` | string | 原因（任务/兑换/手动） |
| `type` | string | `add` / `deduct` / `task` / `redeem` / `goal` / `draw` / `draw-bonus` |
| `createdAt` | date | |

**索引**：`coupleId + createdAt`（复合，用于时间线分页）、`coupleId + type` （账本筛选）。

#### `tasks` — 自定义任务
（预设任务写在云函数代码里，不存数据库）

| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | |
| `coupleId` | string | |
| `type` | string | 固定 `custom` |
| `title` | string | |
| `icon` | string | emoji |
| `points` | number | 奖励积分 |
| `period` | string | `daily` / `weekly` / `once` |
| `createdBy` | string | openid |
| `createdAt` | date | |

#### `taskCompletions` — 任务完成
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | |
| `_openid` | string | 完成者 openid（自动） |
| `coupleId` | string | |
| `taskId` | string | 预设任务为 `preset_xxx`，自定义为 doc id |
| `taskTitle` | string | 冗余存储，便于列表展示 |
| `pointsEarned` | number | |
| `completedAt` | date | |

**索引**：`coupleId + _openid + taskId + completedAt` 用于"本周期是否已完成"查询。

#### `rewards` — 自定义奖励
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | |
| `coupleId` | string | |
| `type` | string | 固定 `custom` |
| `title`, `icon` | string | |
| `price` | number | |
| `createdBy` | string | |
| `createdAt` | date | |

#### `redemptions` — 兑换记录
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | |
| `coupleId` | string | |
| `rewardId` | string | 预设为 `preset_xxx` |
| `rewardTitle` | string | 冗余 |
| `redeemerOpenid` | string | 兑换人 |
| `price` | number | |
| `status` | string | `pending` / `fulfilled` |
| `createdAt`, `fulfilledAt` | date | |
| `fulfilledBy` | string | 履行人（对方 openid） |

#### `anniversaries` — 纪念日
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | |
| `coupleId` | string | |
| `title` | string | |
| `date` | date | 原始日期 |
| `emoji` | string | |
| `nextLabel` | string | 显示文案，如 `纪念日` / `生日` |
| `repeat` | string | `yearly` / `none` |
| `createdBy`, `createdAt` | | |

#### `moods` — 心情打卡
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | |
| `_openid` | string | |
| `coupleId` | string | |
| `mood` | string | emoji |
| `note` | string | 附言 |
| `date` | string | `YYYY-MM-DD`，作为唯一键 |
| `createdAt`, `updatedAt` | date | |

**索引**：`coupleId + _openid + date` 唯一。

#### `letters` — 留言/情书
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id`, `_openid` | string | |
| `coupleId` | string | |
| `content` | string | 最长 500 字 |
| `likes` | number | 点赞数 |
| `createdAt` | date | |

#### `goals` — 共同目标
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | |
| `coupleId` | string | |
| `title`, `emoji` | string | |
| `total` | number | 目标积分 |
| `current` | number | 已积攒 |
| `contributions` | object | `{ [openid]: number }` 双方投入 |
| `status` | string | `active` / `achieved` / `archived` |
| `createdBy`, `createdAt`, `achievedAt` | | |

#### `cooldowns` — 冷静期
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | |
| `coupleId` | string | |
| `startedBy` | string | 发起人 openid |
| `startAt` | date | |
| `endAt` | date | 到期时间 |
| `status` | string | `active` / `ended` / `expired` |
| `endVoters` | string[] | 请求提前结束的 openid 列表 |
| `createdAt`, `updatedAt`, `endedAt` | date | |

**索引**：`coupleId + status`（查找当前活跃冷静期）。

#### `punishments` — 惩罚记录
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id`, `_openid` | string | |
| `coupleId` | string | |
| `level` | string | `light` / `medium` / `severe` |
| `content` | string | 惩罚内容 |
| `status` | string | `pending` / `accepted` / `completed` |
| `acceptedAt`, `completedAt`, `createdAt` | date | |
| `completedBy` | string | 对方 openid |

#### `luckyDraws` — 抽奖记录
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id`, `_openid` | string | |
| `coupleId` | string | |
| `rarity` | string | `common` / `rare` / `legendary` |
| `prizeKey`, `prizeName`, `prizeIcon` | string | |
| `bonus` | number | 附带积分奖励（可选） |
| `cost` | number | 消耗积分（默认 20） |
| `createdAt` | date | |

---

### 建议的数据库权限

在云开发控制台，为每个集合设置权限为"仅创建者可读写"或"所有用户可读，仅创建者可写" ——**实际上，我们不依赖数据库权限**，而是通过云函数统一鉴权（云函数以管理员身份操作数据库）。前端不能直接访问数据库即可。

---

## 云函数 Action 列表

云函数 `quickstartFunctions` 通过 `event.action` 分发。前端调用示例：

```js
const { callFunction } = require('../../utils/cloud.js')
const res = await callFunction('quickstartFunctions', {
  action: 'points.adjust',
  delta: 10,
  reason: '晚安打卡'
})
// res 结构：{ code: 0, data: { success: true, delta: 10, recordId: '...' } }
// 错误：{ code: 4xx/5xx, message: '...' }
```

| 模块 | Action | 说明 |
|---|---|---|
| user | `user.getProfile` | 取自己资料（首次自动创建） |
| user | `user.updateProfile` | 改昵称/头像 |
| couple | `couple.getInviteCode` | 取我的邀请码 |
| couple | `couple.bindByCode` | 用对方邀请码绑定 |
| couple | `couple.getInfo` | 情侣详情+双方积分 |
| couple | `couple.unbind` | 解绑 |
| couple | `couple.setStartDate` | 修改在一起的日期 |
| home | `home.get` | 首页一次性聚合数据 |
| points | `points.adjust` | 加分/扣分（含冷静期检查） |
| records | `records.list` | 积分记录（分页+筛选+搜索） |
| tasks | `tasks.list` | 列出某类任务（附完成状态） |
| tasks | `tasks.complete` | 完成任务，自动加分 |
| tasks | `tasks.createCustom` | 新建自定义任务 |
| tasks | `tasks.deleteCustom` | 删除自定义任务 |
| rewards | `rewards.list` | 预设+自定义 |
| rewards | `rewards.redeem` | 兑换（扣分+创建记录） |
| rewards | `rewards.fulfill` | 对方标记履行完成 |
| rewards | `rewards.createCustom` | 新建自定义奖励 |
| rewards | `rewards.listRedemptions` | 兑换记录列表 |
| anniversary | `anniversary.list` | 带倒计时的纪念日列表 |
| anniversary | `anniversary.create` | 新建 |
| anniversary | `anniversary.delete` | 删除 |
| mood | `mood.set` | 今日心情（upsert） |
| mood | `mood.getToday` | 双方今日心情 |
| mood | `mood.getWeek` | 最近 7 天本人心情 |
| letters | `letters.send` | 发送 |
| letters | `letters.list` | 列表 |
| letters | `letters.like` | 点赞 |
| letters | `letters.delete` | 删除（仅本人） |
| goals | `goals.list` | 列表 |
| goals | `goals.create` | 新建 |
| goals | `goals.contribute` | 投入积分 |
| goals | `goals.delete` | 删除 |
| cooldown | `cooldown.start` | 开启冷静期 |
| cooldown | `cooldown.getActive` | 查当前活跃冷静期+剩余秒数 |
| cooldown | `cooldown.extend` | 延长 |
| cooldown | `cooldown.requestEnd` | 请求提前结束（需双方都投票） |
| punishment | `punishment.getStatus` | 当前等级+进度 |
| punishment | `punishment.accept` | 接受惩罚 |
| punishment | `punishment.complete` | 对方标记完成 |
| luckyDraw | `luckyDraw.draw` | 抽奖（消耗 20 积分） |
| luckyDraw | `luckyDraw.history` | 抽奖历史 |

---

## 安全须知

- **AppSecret 不要写入代码**。云开发模式下完全不需要它。
- `project.private.config.json` 已加入 `.gitignore`，本地个性化配置不会提交。
- 用户敏感信息（openid 等）只通过云函数获取，不要在前端硬编码。
- **所有写入和业务校验都在云函数里做**，前端不直接访问数据库。

---

## MVP 功能清单

- [x] 微信登录 + 获取 openid（`login` 云函数）
- [x] 情侣绑定（邀请码机制，`couple.bindByCode`）
- [x] 积分账本（加分/扣分 + 原因 + 时间线 + 筛选）
- [x] 任务系统（日常/周期/自定义 + 预设任务）
- [x] 奖励商店（兑换 + 履行确认）
- [x] 纪念日提醒（含年度循环倒计时）
- [x] 心情打卡（每日 upsert + 一周回顾）
- [x] 留言板（发送/点赞/删除）
- [x] 共同目标（投入积分凑额度）
- [x] 惩罚池（三级阈值 + 惩罚记录）
- [x] 幸运盒（加权随机抽奖 + 积分红利）
- [x] 冷静模式（扣分锁定 + 双方同意才结束）
- [ ] 前端页面接入云函数（当前页面仍是静态 mock，需改造）
- [ ] 云数据库集合手动建立（按本 README 的表设计）
- [ ] 通知设置 / 数据备份（规划中）
