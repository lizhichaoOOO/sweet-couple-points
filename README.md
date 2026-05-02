# 甜蜜情侣积分 (Sweet Couple Points)

一个让情侣日常互动游戏化的微信小程序。基于原生小程序 + 微信云开发构建，开箱即用。

> 📖 **深入阅读**：[业务逻辑审查文档](docs/business-logic.md) — 50 条独立业务逻辑的具体实现细节

---

## ✨ 功能概览

### 🏠 核心闭环

| 页面 | 主要功能 |
|---|---|
| **首页** | 双头像爱心连接、双方大字积分、在一起 X 天、今日任务 3 条、底部加分/扣分快捷条（ActionSheet 预设原因） |
| **情侣绑定** | 自动生成 6 位邀请码；**复制分享 / 扫对方二维码 / 手动输码** 三种方式；绑定成功自动跳回首页 |
| **积分账本** | 全部 / 加分 / 扣分 三 tab；关键字搜索（防抖 400ms）；绿加红扣；时间倒序 |
| **积分时间线** | 纵向时间轴，中央虚线分隔；下拉刷新 + 上拉翻页；按 type 自动配图标（❤️/💔/🎁/🎯/🎲） |

### 🎯 日常积分机制

| 页面 | 主要功能 |
|---|---|
| **任务系统** | Daily / Periodic / Custom 三 tab<br>**预设 8 个**：早安、晚安、做饭、洗碗、倒垃圾、铺床、每周约会、每周大扫除<br>自定义任务可增删（长按删除），支持设置积分和周期<br>打卡立即加分，本周期内不能重复完成 |
| **奖励商店** | Hero 推荐 + 2 列网格<br>**预设 6 个**：陪看电影、做饭、按摩 30 分钟、说 10 句甜言蜜语、周末随叫随到、买奶茶<br>可自定义奖励<br>兑换走"扣分 + pending 记录"，对方标记履行后 fulfilled |

### 💕 情感记录

| 页面 | 主要功能 |
|---|---|
| **纪念日** | 爱心 Hero 显示总在一起天数<br>卡片网格，每张实时算倒计时<br>支持年度循环（生日）和一次性（毕业、搬家）<br>长按删除 |
| **心情打卡** | 每人每日一次，6 种情绪球（😊 开心 / ❤️ 恋爱 / 😌 平静 / 😢 难过 / 😐 平淡 / 😠 生气）<br>双方头像即时显示对方心情<br>可附一句话，失焦自动保存<br>"一周心情历"回顾近 7 天 |
| **留言板** | 牛皮纸信封风格，贴纸 + 图钉装饰<br>快速留言输入框或完整写情书弹窗<br>点 ♥ 点赞，长按删除自己发的 |

### 🎮 情侣玩法

| 页面 | 主要功能 |
|---|---|
| **共同目标** | "日本旅行 5000 分"、"新沙发 3000 分" 这种长期攒积分的目标<br>双方都可投入积分，各自贡献分别记账<br>进度条实时可视，达成后自动标"已达成" |
| **幸运盒** | 消耗 20 积分抽一次<br>三档稀有度（common 60% / rare 30% / legendary 10%）按权重随机<br>部分奖品自带积分红利（立即回血）<br>抽完弹 modal 展示奖品 |
| **双人游戏**（规划中） | 真心话大冒险 / 默契测试 / 石头剪刀布 / 翻牌记忆 / 谁更懂谁 / 你画我猜 / 1A2B / 骰子惩罚<br>当前仅入口，各游戏逐步实现 |
| **惩罚池** | 积分掉到阈值自动触发惩罚等级<br>轻度（≤-30，洗碗三天）/ 中度（≤-60，拖地一周）/ 重度（≤-100，买一周奶茶）<br>进度条显示距下一级还差多少分<br>24 小时内同等级不重复触发；对方确认完成 |
| **冷静模式** | 吵架时一键锁扣分<br>默认 30 分钟，冷静期内所有扣分（含兑换/抽奖/投资目标）都会被后端拦截<br>支持延长 10 分钟；提前结束需双方都投票同意<br>圆形计时器本地秒级 tick |

### 👤 账户

| 页面 | 主要功能 |
|---|---|
| **个人中心** | 合照区 + 双方昵称 + "在一起 X 天" 徽章<br>统计卡：当前积分 / 完成任务 / 兑换奖励 三栏<br>12 项菜单一键跳到各二级页<br>"解除绑定"按钮（双方关系解除，历史数据保留） |

---

## 🧱 技术栈

- **前端**: 原生微信小程序（WXML / WXSS / JS）
- **后端**: 微信云开发（云函数 + 云数据库 NoSQL）
- **设计**: 蜜桃粉主色 `#FF6B8A` + 柔和渐变 + 圆角卡片

---

## 📁 目录结构

```
sweet-couple-points/
├── miniprogram/              # 小程序前端
│   ├── app.js                # 入口：wx.cloud.init → login → getProfile
│   ├── app.json              # 页面注册 + tabBar
│   ├── app.wxss              # 全局样式
│   ├── pages/                # 14 个页面（每个 4 文件：js/json/wxml/wxss）
│   │   ├── index/            # 首页
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
│   ├── utils/
│   │   ├── cloud.js          # api(action) 封装 + 统一错误 toast
│   │   └── format.js         # 日期/时间工具
│   └── styles/
│       └── variables.wxss    # 设计变量（颜色/圆角/阴影）
└── cloudfunctions/           # 云函数（后端）
    ├── login/                # 获取 openid
    └── quickstartFunctions/  # 业务总入口
        ├── index.js          # 嵌套 action 分发器 + 结构化日志
        └── lib/              # 14 个领域模块
            ├── common.js     # db/集合名/BizError/requireCouple/logger
            ├── user.js       # 用户资料
            ├── couple.js     # 情侣绑定
            ├── home.js       # 首页聚合
            ├── points.js     # 加分/扣分（带冷静期检查）
            ├── records.js    # 积分记录查询
            ├── tasks.js      # 任务（预设+自定义）
            ├── rewards.js    # 奖励商店
            ├── anniversary.js
            ├── mood.js
            ├── letters.js
            ├── goals.js
            ├── cooldown.js
            ├── punishment.js
            └── luckyDraw.js
```

---

## 🚀 完整部署指南

### 第一步：安装微信开发者工具

1. 打开浏览器访问：<https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html>
2. 下载对应操作系统的"**稳定版 Stable Build**"（不要选 RC 或 Nightly）
3. 运行安装包，一路下一步
4. 第一次打开会提示扫码登录——用你**拥有小程序管理权限的微信号**扫码

### 第二步：导入本项目

1. 打开微信开发者工具
2. 左侧顶部选"**小程序**"（不是公众号网页或游戏）
3. 中间面板右上角点 **"+" → 导入项目**
4. 项目目录：选择本仓库根目录 `E:\code\WechatProject\sweet-couple-points`
5. AppID：会自动识别 `wxc97bc2fb32de97a4`（已写在 `project.config.json` 里）
6. 项目名称：随意，默认即可
7. 点 **"确定"**

编译启动后会看到小程序界面，但此时云函数还没部署，**任何操作都会报错**——这是正常的，继续下面的步骤。

### 第三步：开通云开发 + 获取环境 ID

> ⚠️ 这一步错了的话全部云函数调用都会 404，请严格按步骤操作。

**3.1 点击"云开发"按钮**

- 开发者工具顶部工具栏（和"编译""预览"在一排）找 **"云开发"** 按钮
- 图标是一朵**蓝色小云**
- 点击，如果是第一次会弹出"云开发服务开通协议"
- 勾选"**同意协议**"→ 点"**开通**"

**3.2 创建云开发环境**

首次开通会自动弹"**新建环境**"对话框：

| 字段 | 填什么 |
|---|---|
| 环境名称 | 随便起，建议 `sweet-couple-prod` |
| 计费方式 | 选 **"按量付费"** 下面的 **"免费配额"**（每月免费额度足够个人使用） |
| 所属地域 | 默认"上海"即可 |

- 点 **"确定"**
- 等待 30-60 秒创建完成

**3.3 复制环境 ID**

- 创建成功后进入云开发面板
- 顶部会直接显示 **环境名称** 和 **环境 ID**
- 环境 ID 格式：`cloud1-7g123xyzabcdef`（或 `xxx-9gxxx`，以你实际为准）
- 点环境 ID 右边的 **📋 复制** 图标

> 如果找不到：左侧菜单最下面点 **"设置"** → "**环境设置**" → "环境 ID"。

**3.4 填入 `app.js`**

- 在开发者工具左侧文件树展开：`miniprogram/` → 双击 **`app.js`**
- 定位到第 18-20 行附近，找到：

  ```js
  // TODO: 把云开发环境 ID 填到这里（在开发者工具 → 云开发 面板里创建）
  // 例：'cloud1-7g123xyzabcdef'
  this.globalData.env = ''
  ```

- 把空字符串替换成你的环境 ID：

  ```js
  this.globalData.env = 'cloud1-7g123xyzabcdef'  // ← 换成你自己的
  ```

- **Ctrl+S** 保存

---

### 第四步：创建 14 个数据库集合

> 微信云数据库是 NoSQL（类 MongoDB），集合类似"表"，但创建时不需要定义字段，写入时自动推断。

**4.1 进入数据库面板**

- 在云开发面板左侧菜单点 **"数据库"**
- 右侧主区域会是空白的（因为还没建任何集合）

**4.2 逐个创建集合**

对下面每一个集合名：

1. 点击**左侧集合列表上方的 "➕" 图标**（或 "新建集合"按钮）
2. 弹窗里填**集合名**（严格按下方的名称，**区分大小写**，不要加空格）
3. 点 "**确定**"

依次创建这 **14 个**：

```
1.  users
2.  couples
3.  records
4.  tasks
5.  taskCompletions
6.  rewards
7.  redemptions
8.  anniversaries
9.  moods
10. letters
11. goals
12. cooldowns
13. punishments
14. luckyDraws
```

完成后左侧集合列表应该列出全部 14 个。每个都是空的（0 条记录）——**这是正确的**，之后小程序运行时会自动写入。

**4.3 （可选）创建关键索引**

索引不是必须的，但数据量大时会让查询快很多。推荐先加这几个最关键的：

对每个要加索引的集合：

1. 在左侧**点击集合名**（如 `users`）
2. 右侧主区域顶部有 tab：**数据 / 索引管理 / 数据导出**，点 **"索引管理"**
3. 点 **"新建索引"**
4. 填表单（见下表）
5. 点 "**确定**"

**推荐必建的索引**：

| 集合 | 索引名 | 字段 | 排序 | 唯一 |
|---|---|---|---|---|
| `users` | `idx_inviteCode` | `inviteCode` | 升序 | ✅ 勾选 |
| `users` | `idx_openid` | `_openid` | 升序 | ✅ 勾选 |
| `couples` | `idx_members` | `members` | 升序 | ❌ |
| `records` | `idx_couple_time` | `coupleId` 升序 + `createdAt` 降序 | — | ❌ |
| `taskCompletions` | `idx_couple_openid_task` | `coupleId` + `_openid` + `taskId` | 升序 | ❌ |
| `cooldowns` | `idx_couple_status` | `coupleId` + `status` | 升序 | ❌ |
| `moods` | `idx_couple_openid_date` | `coupleId` + `_openid` + `date` | 升序 | ✅ 勾选 |

> 复合索引添加多个字段的方式：在"索引字段"那里点"**+ 添加字段**"，按顺序依次填入。

---

### 第五步：部署云函数

**5.1 部署 `login` 云函数**

- 开发者工具**左侧文件树**展开 `cloudfunctions` 文件夹
- **右键点击** `login` 文件夹
- 菜单里选 **"上传并部署：云端安装依赖"**（有好几个选项，**要选带"云端安装依赖"的那个**）
- 底部 Console 会输出进度，等 **30~60 秒**
- 看到 "**上传成功**" 即完成

**5.2 部署 `quickstartFunctions` 云函数**

- **右键** `quickstartFunctions` 文件夹
- 同样选 **"上传并部署：云端安装依赖"**
- 这个函数带 lib/ 下 15 个模块，**大约 1~2 分钟**
- 最终 Console 也会显示"上传成功"

**5.3 验证云函数部署成功**

- 回到云开发面板，点 **"云函数"** tab
- 左侧应该能看到两个函数：`login` 和 `quickstartFunctions`
- 点 `quickstartFunctions`
- 顶部 tab 切到 **"云函数测试"**
- 在"**请求参数**"文本框里填：

  ```json
  { "action": "ping" }
  ```

- 点 **"运行测试"**
- 右侧"响应结果"应该返回：

  ```json
  { "code": 0, "data": { "pong": true, "time": 1714...} }
  ```

  **看到 `"code": 0`** 就说明云函数完全就绪。如果报错看下一节排查。

---

### 第六步：首次启动小程序

**6.1 编译运行**

- 回到开发者工具主界面
- 点顶部 **"编译"**（或快捷键 Ctrl+B）
- 左侧模拟器会显示首页

**6.2 查看 Console 验证启动流程**

- 底部面板切到 **"Console"** tab
- 应该依次看到（按时间顺序）：

  ```
  [bootstrap:launch]
  [bootstrap:cloud-init-ok] {env: 'cloud1-xxx'}
  [api:ok] user.getProfile {ms: 234}
  [bootstrap:openid-ok] {oid: 'xxxx12'}
  [bootstrap:profile-ok] {bound: false, hasCode: true}
  ```

  ✅ 这表示登录成功、资料拉到了、用户记录已自动创建。

- 此时首页会显示"**还没绑定 TA 哦**"空状态——**正常**，因为你还没绑定情侣。

**6.3 验证数据库写入**

- 回到云开发面板 → 数据库 → `users` 集合
- 应该能看到 **1 条新记录**，含你的 `_openid`、`inviteCode`（6 位数字）、`coupleId: ""` 等字段

**6.4 测试绑定流程**

- 在小程序里点"**去绑定**"
- 绑定页会显示你的邀请码（复制下来）
- **用另一个微信号** 打开同一小程序（开发者工具右上角可切换账号测试）
- 另一个号在绑定页，**"或输入对方邀请码"** 输入框里粘贴
- 点 **"绑定"**
- 双方都会提示"绑定成功"并跳回首页
- 回数据库查 `couples` 集合应出现 1 条新记录，两个 `users` 文档的 `coupleId` 字段都被填上

---

### 常见错误排查

| 现象 | 原因 | 解决 |
|---|---|---|
| 启动弹"需要配置云开发环境" | `app.js` 里 env 没填 | 第 3.4 步 |
| `wx.cloud has not been init` | env 填了但没保存；或基础库 < 2.2.3 | Ctrl+S 保存；详情页把基础库改到 2.19+ |
| 调任何 action 报"cloud function not found" | 云函数没部署 | 第 5 步 |
| 报"集合不存在" | 14 个集合没建全 | 第 4 步回去对一遍名字 |
| 报"云开发权限不足" | 云开发没开通到位 | 云开发控制台 → 权限 → 开通 |
| 绑定提示"邀请码无效" | 对方号没登录过小程序，users 表没记录 | 让对方先打开一次小程序 |

---

## 🧪 调试日志说明

**前端**（微信开发者工具 Console）：
- `[bootstrap:*]` — app 启动分阶段：`launch` → `cloud-init-ok` → `openid-*` → `profile-ok`
- `[api:ok] <action> {ms}` — 每次云函数调用的耗时
- `[api:biz-err] <action>` — 业务错误（4xx，用户操作不合法）
- `[api:err] <action>` — 系统错误（5xx，代码 bug 或云端异常）
- `[bind:attempt/ok/fail]` — 绑定链路专用

**后端**（云开发控制台 → 云函数 → quickstartFunctions → 日志）：
- `[action:start] <action>` — 每次进入分发器（含参数）
- `[action:ok] <action> {ms}` — 成功返回
- `[action:biz-err] <action>` — 4xx 业务错误
- `[action:err] <action>` — 5xx 异常（含堆栈）
- 业务层关键点：`[points.adjust]` / `[couple.bindByCode]` / `[tasks.complete]` / `[rewards.redeem]` / `[goals.contribute]` / `[cooldown.start]` / `[luckyDraw.draw]` 等等

排查问题时按 prefix 搜索最快。

---

## 🗄️ 数据库字段详解

### 设计原则

- **用户与情侣分离**：`users` 存个人资料，`couples` 存关系和双方积分
- **积分集中存储**：`couples.points = { [openid]: number }`，一次读双方
- **所有写入走云函数**：前端不直接写库，云函数统一做权限和业务校验
- **时间戳统一用 `db.serverDate()`**：避免客户端时间作假
- **资源归属用 `coupleId` 标识**：所有情侣相关数据都带 coupleId，解绑后数据保留但不可访问
- **`_openid` 自动字段**：云函数写入时自动注入调用者 openid

### `users` — 用户
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | 文档 ID（自动） |
| `_openid` | string | 微信 openid（自动） |
| `nickname` | string | 昵称 |
| `avatar` | string | 头像 URL |
| `inviteCode` | string | 6 位邀请码，全局唯一 |
| `coupleId` | string | 绑定的情侣 ID；空字符串表示未绑定 |
| `createdAt`, `updatedAt` | date | |

### `couples` — 情侣关系
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | coupleId |
| `members` | string[] | 长度为 2，两位成员的 openid |
| `points` | object | `{ [openid]: number }` 双方积分 |
| `startDate` | date | 在一起纪念日 |
| `status` | string | `active` / `dissolved` |

### `records` — 积分变动
| 字段 | 类型 | 说明 |
|---|---|---|
| `coupleId` | string | |
| `actorOpenid` | string | 操作人 |
| `targetOpenid` | string | 积分变动的人 |
| `delta` | number | 正加负扣 |
| `reason` | string | 原因 |
| `type` | string | `add` / `deduct` / `task` / `redeem` / `goal` / `draw` / `draw-bonus` |
| `createdAt` | date | |

### `tasks` — 自定义任务
（预设任务写在代码里，不存 DB）

| 字段 | 类型 | 说明 |
|---|---|---|
| `coupleId` | string | |
| `type` | string | 固定 `custom` |
| `title`, `icon` | string | |
| `points` | number | 奖励积分 |
| `period` | string | `daily` / `weekly` / `once` |

### `taskCompletions` — 任务完成
| 字段 | 类型 | 说明 |
|---|---|---|
| `_openid` | string | 完成者 |
| `coupleId` | string | |
| `taskId` | string | `preset_xxx` 或自定义 doc id |
| `taskTitle` | string | 冗余 |
| `pointsEarned` | number | |
| `completedAt` | date | |

### `rewards` — 自定义奖励
| 字段 | 类型 | 说明 |
|---|---|---|
| `coupleId` | string | |
| `type` | string | 固定 `custom` |
| `title`, `icon` | string | |
| `price` | number | |

### `redemptions` — 兑换记录
| 字段 | 类型 | 说明 |
|---|---|---|
| `coupleId` | string | |
| `rewardId` | string | |
| `rewardTitle` | string | 冗余 |
| `redeemerOpenid` | string | 兑换人 |
| `price` | number | |
| `status` | string | `pending` / `fulfilled` |
| `fulfilledBy` | string | 履行人（对方） |

### `anniversaries` — 纪念日
| 字段 | 类型 | 说明 |
|---|---|---|
| `coupleId` | string | |
| `title` | string | |
| `date` | date | |
| `emoji` | string | |
| `nextLabel` | string | `纪念日` / `生日` 等 |
| `repeat` | string | `yearly` / `none` |

### `moods` — 心情打卡
| 字段 | 类型 | 说明 |
|---|---|---|
| `_openid` | string | |
| `coupleId` | string | |
| `mood` | string | emoji |
| `note` | string | |
| `date` | string | `YYYY-MM-DD`，唯一键 |

### `letters` — 留言/情书
| 字段 | 类型 | 说明 |
|---|---|---|
| `_openid`, `coupleId` | string | |
| `content` | string | 最长 500 字 |
| `likes` | number | |

### `goals` — 共同目标
| 字段 | 类型 | 说明 |
|---|---|---|
| `coupleId` | string | |
| `title`, `emoji` | string | |
| `total` | number | 目标积分 |
| `current` | number | 已积攒 |
| `contributions` | object | `{ [openid]: number }` 双方投入 |
| `status` | string | `active` / `achieved` |

### `cooldowns` — 冷静期
| 字段 | 类型 | 说明 |
|---|---|---|
| `coupleId` | string | |
| `startedBy` | string | 发起人 openid |
| `startAt`, `endAt` | date | |
| `status` | string | `active` / `ended` / `expired` |
| `endVoters` | string[] | 请求提前结束的 openid |

### `punishments` — 惩罚记录
| 字段 | 类型 | 说明 |
|---|---|---|
| `_openid`, `coupleId` | string | |
| `level` | string | `light` / `medium` / `severe` |
| `content` | string | 惩罚内容 |
| `status` | string | `pending` / `accepted` / `completed` |
| `completedBy` | string | 对方 openid |

### `luckyDraws` — 抽奖记录
| 字段 | 类型 | 说明 |
|---|---|---|
| `_openid`, `coupleId` | string | |
| `rarity` | string | `common` / `rare` / `legendary` |
| `prizeKey`, `prizeName`, `prizeIcon` | string | |
| `bonus` | number | 附带积分红利 |
| `cost` | number | 消耗积分（默认 20） |

### 数据库权限

**不依赖**数据库的读写权限（那是前端直连 DB 的模式），所有写入都走云函数、云函数以管理员身份操作 DB。在云开发控制台给每个集合设置"**仅创建者可读写**"即可，防止意外的前端直连。

---

## ⚡ 云函数 Action 列表

前端统一通过 `utils/cloud.js` 的 `api(action, data)` 调用：

```js
const { api } = require('../../utils/cloud.js')

const res = await api('points.adjust', { delta: 10, reason: '晚安打卡' })
// res = { success: true, delta: 10, recordId: '...' }
// 出错会 throw，错误 message 来自云端
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

## 🔒 安全须知

- **AppSecret 不要写入代码**：云开发模式下完全不需要。如果意外泄露在对话/issue/截图里，立即到微信公众平台 → 开发管理 → 开发设置 → **重置 AppSecret**
- `project.private.config.json` 已加入 `.gitignore`，本地私有配置不会提交
- 用户敏感信息（openid 等）只通过云函数获取，不要在前端硬编码
- **所有写入和业务校验都在云函数里做**，前端不直接访问数据库

---

## ✅ 完成清单

- [x] 微信登录 + 获取 openid（`login` 云函数）
- [x] 情侣绑定（邀请码机制，扫码+手动输入）
- [x] 积分账本（加分/扣分 + 原因 + 筛选搜索）
- [x] 积分时间线（分页加载）
- [x] 任务系统（日常/周期/自定义 + 预设任务）
- [x] 奖励商店（兑换 + 履行确认）
- [x] 纪念日提醒（年度循环 + 一次性）
- [x] 心情打卡（每日 upsert + 一周回顾）
- [x] 留言板（发送/点赞/删除）
- [x] 共同目标（投入积分凑额度）
- [x] 惩罚池（三级阈值 + 惩罚记录）
- [x] 幸运盒（加权随机抽奖 + 积分红利）
- [x] 冷静模式（扣分锁定 + 双方同意才结束）
- [x] 前端 14 个页面全部接入云函数
- [x] 全链路结构化日志
- [ ] 云数据库 14 个集合手动创建（见第四步）
- [ ] 两个云函数部署上云（见第五步）
- [ ] 填入云开发环境 ID（见第 3.4 步）
- [ ] 通知设置 / 数据备份（规划中）
