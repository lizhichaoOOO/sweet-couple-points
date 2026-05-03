# 业务逻辑审查文档

本文档基于源代码逐行审查整理而成，列出项目全部 **50 条独立业务逻辑**，按功能域划分。配合代码阅读、排查 bug、新人上手时使用。

---

## 📑 目录

- [基础设施（3 条）](#-基础设施3-条)
- [用户资料（2 条）](#-用户资料2-条)
- [情侣关系（5 条）](#-情侣关系5-条)
- [首页聚合（1 条）](#-首页1-条)
- [积分引擎（2 条）](#-积分引擎2-条)
- [任务系统（5 条）](#-任务系统5-条)
- [奖励商店（6 条）](#-奖励商店6-条)
- [纪念日（3 条）](#-纪念日3-条)
- [心情打卡（3 条）](#-心情打卡3-条)
- [留言板（4 条）](#-留言板4-条)
- [共同目标（4 条）](#-共同目标4-条)
- [冷静期（4 条）](#-冷静期4-条)
- [惩罚池（3 条）](#️-惩罚池3-条)
- [幸运盒（2 条）](#-幸运盒2-条)
- [前端启动链路（3 条）](#-前端启动链路3-条)
- [游戏模块（入口占位，待实现）](#-游戏模块入口占位待实现)
- [统计汇总](#-统计汇总)
- [隐藏的跨模块耦合](#-隐藏的跨模块耦合很重要)

---

## 🏗 基础设施（3 条）

### 1. 自动登录 + 首次建号
**代码路径**：`cloudfunctions/login/index.js` + `common.getOrCreateUser`
- `login` 云函数调 `cloud.getWXContext()` 拿 openid，不落库
- 第一次调 `user.getProfile` 时在 `users` 集合里插入记录，字段：`_openid / nickname='' / avatar='' / inviteCode / coupleId=''`
- **关键逻辑**：邀请码生成走 `generateUniqueInviteCode` — 随机 6 位 `100000-999999`，查库比对重复，最多重试 8 次；极端情况下用 `Date.now().slice(-6)` 兜底
- 前端 `app.bootstrap`：先看 `wx.getStorageSync('openid')`，命中就跳过 login 云函数（减少 RTT）

### 2. 统一鉴权 Middleware
**代码路径**：`common.requireCouple`
- 先 `getOrCreateUser` 拿 user 文档
- 没有 `coupleId` → 抛 `BizError('未绑定情侣', 403)`
- 按 `coupleId` 查 `couples` 集合，找不到 → 抛 404
- 返回 `{ user, couple, coupleId, partnerOpenid }` 给 handler 复用
- **几乎所有 handler 第一行就调它**，前端遇到 403 就引导去绑定页

### 3. 统一错误处理 + 日志
**代码路径**：`quickstartFunctions/index.js`
- `BizError` 类带 `code` 字段（400/401/403/404/409 是业务错误、500 是系统错误）
- Dispatcher 用 `[action:start]` / `[action:ok ms]` / `[action:biz-err]` / `[action:err]` 四级日志
- openid 统一用后 6 位显示，保护隐私又可关联

---

## 👤 用户资料（2 条）

### 4. `user.getProfile`
- 返回 `{ openid, nickname, avatar, inviteCode, coupleId, bound }`
- **特殊点**：`bound = !!coupleId`，前端用来判断是否要显示"去绑定"

### 5. `user.updateProfile`
- 只允许改 `nickname`（1-30 字符）和 `avatar`（URL 字符串）
- 其他字段（如 `inviteCode`、`coupleId`）不允许从这里改，保证数据完整性

---

## 💑 情侣关系（5 条）

### 6. `couple.getInviteCode`
- 返回当前用户的 6 位邀请码；若未绑定就是这个码，已绑定也保留原码

### 7. `couple.bindByCode` — 核心绑定逻辑
**4 层校验**：
1. 自己的 `coupleId` 必须为空（409：已绑定过）
2. 邀请码能在 `users` 集合里查到（404：码无效）
3. 对方不是自己（400：不能绑自己）
4. 对方 `coupleId` 必须为空（409：对方已绑）

**原子操作**（用 `Promise.all` 并行但不是真 transaction）：
- 在 `couples` 集合建新文档，`members = [我, 对方]`，`points = {我: 0, 对方: 0}`，`startDate = 今天`
- 同时更新两个 `users` 的 `coupleId` 字段

### 8. `couple.getInfo`
- 并行拉双方 user 文档（取 nickname / avatar）
- 在一起天数 = `Math.floor((Date.now() - startDate) / 86400000)`
- 返回结构：`{ me: {openid, nickname, avatar, points}, partner: {...}, daysTogether, startDate }`

### 9. `couple.unbind`
- 把 `couples` 的 `status` 标为 `dissolved`，写入 `dissolvedAt`
- `db.collection(users).where({coupleId}).update` 一次清掉双方的 `coupleId`
- **数据保留不删**：历史记录、任务、奖励等按 coupleId 关联，但查询都会走 `requireCouple`，解绑后自然访问不到

### 10. `couple.setStartDate`
- 修改在一起的纪念日日期，用 `new Date(startDate)` 解析，验 `isNaN(d.getTime())`

---

## 🏠 首页（1 条）

### 11. `home.get` — 一次拿全首页数据
- 未绑定：直接返回 `{bound: false}`，不走后面的数据库
- 已绑定：并行三个查询：
  - `coupleLib.getInfo` — 情侣资料+积分
  - `tasksLib.listToday` — 今日任务前 3
  - 最近 3 条 `records` — 动态流
- **性能优化**：首页从 4 次 RTT 压缩到 1 次

---

## ⚡ 积分引擎（2 条）

### 12. `points.adjust` — 所有积分变动的唯一入口
**输入校验**：
- delta 必须是非零有限数，|delta| ≤ 1000
- reason 必填且非空
- targetOpenid 必须是本情侣成员

**核心业务逻辑**（按顺序）：
1. 获取情侣信息
2. **如果 delta < 0**：查 `cooldowns` 集合里 `{coupleId, status: 'active'}` 最新一条；若 `endAt > 当前时间` → 抛 409（冷静期禁扣）
3. 原子自增：`couples.update({data: {[`points.${targetOpenid}`]: _.inc(delta)}})`
4. 写 records：`{actorOpenid, targetOpenid, delta, reason, type, createdAt}`
5. 返回 `{recordId, delta}`

**被复用于 4 个上游场景**：任务完成加分 / 奖励兑换扣分 / 目标投入扣分 / 抽奖扣费+红利加分。每次都带 `type` 字段，便于账本区分。

### 13. `records.list` — 记录查询（时间线+账本共用）
- filter 可选 `all` / `add` / `deduct`，映射到 `where.type`
- keyword 支持正则搜索 `reason` 字段（用 `db.RegExp` + `escapeRegex` 防注入）
- 分页：`skip` + `limit`，limit 最大 50
- 并行返回 `{list, total, hasMore}`

---

## ✅ 任务系统（5 条）

### 14. 预设任务（写在代码里）
```
早安 5 / 晚安 5 / 做饭 10 / 洗碗 5 / 倒垃圾 3 / 铺床 3   (daily)
每周约会 20 / 每周大扫除 15                               (weekly)
```
- `_id` 前缀 `preset_` 区分，不存数据库

### 15. `tasks.list({type})`
- 根据 type 返回 daily / periodic / custom 对应列表
- **关键逻辑 — 完成状态检测**：
  - daily 周期起点 = 今天 00:00
  - weekly 周期起点 = 本周一 00:00（算法：`(day + 6) % 7` 算出到周一的差）
  - 查 `taskCompletions` 里 `coupleId + _openid + completedAt >= since` 的集合
  - 返回的任务附加 `done: true/false`

### 16. `tasks.listToday` — 首页专用
- 并行拉 daily + periodic 两个列表
- 排序：`done === false` 在前（未完成优先），各自内部按原顺序
- `slice(0, 3)` 取前 3 条

### 17. `tasks.complete({taskId})` — 完成 + 加分联动
- 用 `resolveTask(taskId, coupleId)` 解析预设 or 自定义
- 防重复：查 `taskCompletions` 本周期是否已有记录（409：本周期已完成）
- 写 `taskCompletions`：`{coupleId, taskId, taskTitle, pointsEarned, completedAt}`
- 调 `pointsLib.adjust({delta: points, reason: '任务：xxx', type: 'task'})` 加分
- **冷静期影响**：加分不受阻（delta > 0）

### 18. 自定义任务 CRUD
- `createCustom`：title 必填，points 1-200，period 必须是 daily/weekly/once
- `deleteCustom`：权限三校验 — 文档存在 / 是本情侣 / 是 custom 类型

---

## 🎁 奖励商店（6 条）

### 19. 预设奖励（写在代码里）
```
电影 50 / 做饭 80 / 按摩 100 / 甜言蜜语 30 / 周末随叫 150 / 奶茶 20
```

### 20. `rewards.list`
- 预设（固定）+ 自定义（`where coupleId type='custom'`）合并返回

### 21. `rewards.redeem({rewardId})` — 核心兑换流
**4 步**：
1. `resolveReward` 解析奖励（含 preset 分支）
2. 余额校验：`myPoints >= price`
3. 调 `pointsLib.adjust({delta: -price, type: 'redeem'})` 扣分（此处会走冷静期检查 → **冷静期内连兑换都被拦**）
4. 写 `redemptions` 记录，`status: 'pending'`
- 返回 `{redemptionId, pricePaid}`

### 22. `rewards.fulfill({redemptionId})` — 对方履行
- **防自嗨校验**：`redeemerOpenid === wx.OPENID` → 400（兑换人不能自己标完成）
- 幂等：已经 `fulfilled` 的直接返回 `{already: true}`
- 更新 status + `fulfilledAt` + `fulfilledBy`

### 23-24. 自定义奖励 CRUD + 兑换记录列表
- `createCustom`：title 必填，price 1-100000
- `deleteCustom`：权限三校验（同任务）
- `listRedemptions`：按时间倒序拉最近 50 条

---

## 🌸 纪念日（3 条）

### 25. `anniversary.list` + 倒计时计算
- `repeat: 'yearly'` → 把 target date 的年份改成今年，如果已过就加 1 年，算天数差
- `repeat: 'none'` → 未到就算差，已过 = 0
- 公式用 `Math.ceil`，避免"差 0.4 天"显示为 0

### 26-27. create / delete
- 创建：title + date 必填，`new Date(date)` 校验；默认 emoji='🌸'、nextLabel='纪念日'、repeat='yearly'
- 删除：权限两校验（存在 + 本情侣）

---

## 😊 心情打卡（3 条）

### 28. `mood.set` — upsert 模式
- 唯一键：`(coupleId, _openid, date)`，date 是 `YYYY-MM-DD` 字符串（不是 timestamp）
- 已有记录 → update 覆盖；无记录 → add 新文档
- 返回 `{updated: true}` 或 `{created: true}`

### 29. `mood.getToday`
- 一次查 `where: {coupleId, date: 今日}`，过滤出双方的记录
- 返回 `{mine: {mood, note} | null, partner: {...} | null}`

### 30. `mood.getWeek`
- 起点：`今天-6天 00:00`
- 只返回本人的记录（不是双方），按 date 升序

---

## 💌 留言板（4 条）

### 31. `letters.send`
- content 长度 1-500 字，trim 后校验
- 写入 `{coupleId, content, likes: 0, createdAt}`，`_openid` 自动注入

### 32. `letters.list`
- 按 `createdAt` 倒序分页，limit 上限 50

### 33. `letters.like`
- `_.inc(1)` 原子自增；任一方都能点（包括自己）

### 34. `letters.delete`
- **只能删自己的**：`res.data._openid !== wx.OPENID` → 403

---

## 🎯 共同目标（4 条）

### 35. `goals.list`
- 按创建时间倒序返回，包含 `{title, emoji, total, current, contributions, status}`

### 36. `goals.create`
- title 必填，total 1-1000000
- 初始值：`current: 0`, `contributions: {}`, `status: 'active'`

### 37. `goals.contribute` — 最复杂的一个 action
**5 步校验 + 3 步写入**：
1. amount > 0 且 ≤ 10000
2. 余额够
3. goal 存在且归属本情侣
4. goal status 必须 `active`
5. 调 `pointsLib.adjust({delta: -amount, type: 'goal'})` 扣分（同样走冷静期检查）
6. 达成判定：`newCurrent = min(total, current + amount)`，`>= total` 则标 `achieved`
7. 更新 goal：`current` 用 `_.inc(amount)`，`contributions.${openid}` 用 `_.inc(amount)`
8. 返回 `{achieved, current, total}`

### 38. `goals.delete`
- 权限两校验。**注意**：删除不退积分（设计上投入即决）

---

## 🧘 冷静期（4 条）

### 39. `cooldown.start`
- durationMin 默认 30，上限 720（12 小时）
- **幂等**：若已有 active 冷静期 → 直接返回 `{already: true}`
- 新建文档：`{startedBy, startAt: now, endAt: now + durationMin, endVoters: [], status: 'active'}`

### 40. `cooldown.getActive` — 含自动过期
- 查最新 active 冷静期
- 算 `remainSec = max(0, (endAt - now) / 1000)`
- **自动收尾**：若 `remainSec === 0 && status === 'active'` → 立即 update 为 `expired`，返回 `{active: false, expired: true}`
- 否则返回 `{active, remainSec, endVoters}`

### 41. `cooldown.extend`
- additionalMin 1-120
- `endAt = endAt + additionalMin`
- **副作用**：清空 `endVoters`（延长了就当大家都不想结束了）

### 42. `cooldown.requestEnd` — 双方投票制
- 把自己加入 `endVoters`（Set 去重）
- 从 `couples.members` 拿双方 openid
- 若双方都在 voters 里 → 更新 status 为 `ended`，返回 `{ended: true}`
- 否则只更新 voters，返回 `{ended: false, waitingForPartner: true}`

**全局副作用**：冷静期 active 时，所有 `delta < 0` 的 points 变动都会被 `points.adjust` 拦截 → 兑换、投目标、抽奖、扣分按钮全部报 409

---

## ⚠️ 惩罚池（3 条）

### 43. `punishment.getStatus`
- 遍历 `LEVELS` 数组（轻度 ≤-30 / 中度 ≤-60 / 重度 ≤-100）
- 正向遍历：积分小于等于阈值的最后一个 = `currentLevel`；大于某阈值的第一个 = `nextLevel`
- `nextLevelGap = max(0, points - nextLevel.threshold)`（距下一级差多少负分）
- `progressPercent`：`-points / 100 * 100`，截断 0-100

### 44. `punishment.accept`
- 可传 level 指定等级，不传自动根据当前积分选
- **24h 防重复**：查 `punishments.where({coupleId, _openid, level, status: [pending|accepted], createdAt >= 24h前})`.count()，大于 0 就 409
- 写记录：`status: 'accepted'`

### 45. `punishment.complete`
- **防自嗨**：`res.data._openid === wx.OPENID` → 400（被惩罚人不能自己标完成）
- 更新 status=completed + completedBy

---

## 🎲 幸运盒（2 条）

### 46. `luckyDraw.draw` — 加权随机算法
**核心**：
1. 余额 >= 20 校验
2. `pickByWeight`：计算总权重（60+30+10=100），`Math.random() * total`，遍历累减
3. 从选中稀有度的 items 里随机一个
4. 扣 20 积分（走 cooldown 检查）
5. 写 `luckyDraws` 记录
6. **若奖品有 bonus**：再调一次 `pointsLib.adjust` 加 bonus，type=`draw-bonus`（两条 records 分开写）
7. 返回 `{rarity, prize}`

### 47. `luckyDraw.history`
- 按时间倒序返回最近 30 条

---

## 🧭 前端启动链路（3 条）

### 48. `app.onLaunch`
- 检查 `wx.cloud` 是否可用（基础库 >= 2.2.3）
- `wx.cloud.init({env})`，`env` 为空抛出警告 modal
- 把 `ready` 赋值为 bootstrap Promise

### 49. `app.bootstrap`
- 先看 storage 里的 openid 缓存，命中就跳过 login 云函数
- 无缓存 → 调 `login` 云函数拿 openid 存 storage
- 调 `user.getProfile`，写入 globalData 的 `user / bound / coupleId`
- **全流程打点**：`[bootstrap:launch]` → `[cloud-init-ok]` → `[openid-cached|ok]` → `[profile-ok]`

### 50. `app.refreshProfile`
- 绑定/解绑成功后调用，重新拉 profile 同步 globalData

---

## 🎮 游戏模块

**代码路径**：`miniprogram/pages/games/` + `cloudfunctions/quickstartFunctions/lib/games/`

游戏 hub 页面 `pages/games/games` 列出 8 款游戏，点击已实现的跳转，未实现的弹"敬请期待" toast。

### 已实现：真心话大冒险（3 个 action）

**代码路径**：`lib/games/truth-dare.js` + `pages/games/truth-dare/`

**题库**（写在云函数代码里，80 条）：
- 真心话 40 条：温和 20 / 进阶 20
- 大冒险 40 条：温和 20 / 进阶 20
- 内容融合朋友圈、微信、短视频、表情包、外卖、求婚等 2025 情侣日常场景

**Action**：
| Action | 说明 | 输入 | 输出 |
|---|---|---|---|
| `games.truthDare.draw` | 抽题 | `{ type: 'truth' \| 'dare', level: 'mild' \| 'spicy' \| 'random' }` | `{ id, type, level, text, poolSize }` |
| `games.truthDare.submit` | 提交结果 | `{ id, type, text, result: 'done' \| 'rejected' }` | `{ ok, delta }` |
| `games.truthDare.stats` | 题库容量 | — | `{ truths, dares, doneReward, rejectPenalty }` |

**积分联动**：
- `result='done'`（完成）：调 `pointsLib.adjust({delta: +2, type: 'game'})` 加 2 分
- `result='rejected'`（拒绝）：调 `pointsLib.adjust({delta: -10, type: 'game'})` 扣 10 分
- 拒绝走完整 `points.adjust` 流程 → **冷静期内拒绝也会被拦截**（不能通过游戏来回避惩罚）
- records 的 reason 形如 `游戏-真心话-完成：第一次看到我你想的第一件事是什么...`，便于账本追溯

**前端交互**：
- 难度 toggle（温和/进阶）+ 大卡片 + 抽题动画（CSS rotateY 翻转）
- idle 状态：两个按钮"真心话 / 大冒险"
- showing 状态：完成 / 拒绝 / 换一题 / 取消
- 本次完成数和拒绝数实时统计

### 待实现的 6 款游戏
- rps / memory / who_knows / drawing / number_1a2b / dice_truth
- 每款游戏对应一个 `lib/games/xxx.js`，遵循 `draw + submit` 或 `session` 模式
- hub 卡片的 `ready: true` 标记控制是否可以跳转

---

### 已实现：情侣默契测试（5 个 action，需新集合 `quizSessions`）

**代码路径**：`lib/games/quiz.js` + `pages/games/quiz/`

**题库**（30 道四选一，写在云函数里）：
涵盖周末安排、冲突处理、旅行方式、金钱观、表达方式、理想生活、家人相处等 2025 情侣共同决策场景。每次抽 10 道随机不重复出题。

**玩法流程**（异步会话）：
1. 一方点"开始新测试" → 建 session，snapshot 10 题
2. 自己答完 10 题 → `status: waiting` + `answers[me] = [...]`
3. 对方进入页面会自动看到待答 session，答完后 → 触发结算
4. 双方答案逐题比对，一致数 = 默契分

**积分奖励**（双方等量）：
- `>= 8/10` 默契 → 各 **+15 分**
- `5-7/10` → 各 **+5 分**
- `< 5/10` → **0 分**

**Action**：
| Action | 说明 |
|---|---|
| `games.quiz.start` | 开启新会话（已有活跃 session 时幂等返回） |
| `games.quiz.current` | 返回 `{state: 'none' \| 'mine-pending' \| 'partner-pending', session?, lastResult?}` |
| `games.quiz.submit` | 提交本人答案。若对方已提交则触发结算 |
| `games.quiz.cancel` | 发起人可在对方未答前取消（cancelled 状态） |
| `games.quiz.history` | 最近 20 次已关闭的测试 |

**关键校验**：
- `submit`：answers 数量必须等于题数，每个元素是 0-3 的整数
- `submit`：本人不能重复提交
- 同一情侣同时只能有一个 waiting session（`start` 会幂等返回已存在的）
- `cancel`：对方已答后不可取消

**前端交互**：
- 4 种状态：`idle / answering / waiting / result`
- 单题推进 + 进度条 + 题号圆点导航
- 答题自动跳下一题；所有题答完才能点提交
- 结果页：分数圆环 + 感性文案 + 奖励横幅 + 逐题对比（绿/红边）

### 已实现：石头剪刀布 - 5 变体（6 个 action，需新集合 `rpsSessions`）

**代码路径**：`lib/games/rps.js` + `pages/games/rps/`

**5 种变体**：
| 变体 key | 名称 | 玩法 | 轮数 |
|---|---|---|---|
| `classic` | 石头剪刀布 | 经典循环 rock>scissors>paper>rock | 1 |
| `xlq` | 小人老虎枪 | 老虎吃小人, 小人拿枪, 枪打老虎（同构） | 1 |
| `num` | 十五二十 | 各猜总数(0/5/10/15/20) + 各出数(0/5/10)，猜中者胜（另一方没猜中） | 1 |
| `twohand` | 双手石头剪刀布 | 先各出 2 只手 → 看到对方两手后各选保留 1 只 → 比 | **2** |
| `dice` | 筛子大小 | 服务端各摇 3 颗，和大者胜 | 1 |

**积分规则**：
- 胜方 `+5` 分（`type: 'game'`）
- 负方 `-5` 分（冷静期内被拦则静默跳过，胜方仍加分）
- 平局 `+0`

**Action**：
| Action | 说明 |
|---|---|
| `games.rps.start` | 开启新会话（传 `variant`），已有活跃局时幂等返回 |
| `games.rps.current` | 返回 `{state, session, variantInfo, lastResult?}`，state 有 5 种：`none / await-my-move / await-partner-move / await-my-keep / await-partner-keep` |
| `games.rps.submitMove` | 提交第一轮出手；dice 变体 move 可传空对象（服务端摇） |
| `games.rps.submitKeep` | twohand 专用：提交第二轮保留的手 |
| `games.rps.cancel` | 发起人可在对方未参与前取消 |
| `games.rps.history` | 最近 20 局结果 |
| `games.rps.listVariants` | 列出所有变体及奖励分 |

**后端判胜 (`resolveWinner`)**：
- `classic/xlq`：共用 `RPS_BEATS` 字典（rock/scissors/paper 和 gun/tiger/person 同构）
- `num`：`total = a.value + b.value`；仅一方猜中 → 胜，都中/都没中 → 平
- `twohand`：比 kept 手，standard RPS 规则；校验 kept 必须是已出的 2 只手之一
- `dice`：比 3 颗骰子和

**前端状态机**：
`loading → idle(选变体) → choose-move(变体特化 UI) → wait-partner → [twohand: choose-keep → wait-partner] → result`

每个变体有独立的出手 UI：
- classic/xlq：3 个 emoji 大卡片，点击高亮，提交
- num：两排胶囊（猜总数 × 出几），均需选
- twohand：点击出手时轮流填 2 个 slot，"清除"按钮重置
- dice：动画摇 1.5 秒 → 后端返回真实结果

**冷静期兼容**：
胜方加分走 `pointsLib.adjust` 不会被拦，负方扣分用 try/catch 包住——冷静期内扣分抛 409 时吞掉错误但仍 log 出来，session 正常 closed。

### 已实现：女巫的毒药（6 个 action，需新集合 `witchSessions`）

**代码路径**：`lib/games/witch.js` + `pages/games/witch/`

**玩法**：源自 2025 年爆火的同名 App，5×5 草莓格子（25 格）：
1. `picking-poison` 阶段：双方各秘密选 1 颗草莓下毒（对方看不到）
2. `playing` 阶段：轮流吃草莓，发起人先吃
3. 吃到**对方**的毒 → 立即输；吃到自己的毒 → 安全
4. 胜方 +5 分、败方 -5 分、附赠一条随机惩罚

**Action**：
| Action | 说明 |
|---|---|
| `games.witch.start` | 开局，状态设为 picking-poison |
| `games.witch.current` | 返回当前状态（对方的毒未结算前不返回） |
| `games.witch.setPoison` | 设置自己的毒（cell 0-24） |
| `games.witch.pickCell` | 吃草莓。若命中对方毒 → 游戏结束 |
| `games.witch.cancel` | 对方未下毒前可取消 |
| `games.witch.history` | 最近 20 局 |

**状态机**（5 种前端 state）：
`none → idle → pick-my-poison → wait-partner-poison → my-turn ⇌ partner-turn → result`

**视角安全**：`projectSessionForMe` 在结算前过滤掉 `partnerPoison` 字段，前端永远拿不到对方下毒的位置。

**惩罚池**：代码里写了 15 条惩罚文案，从"清唱情歌"到"做 20 个俯卧撑"到"朋友圈公开表白"等，随机抽一条写入 session.penalty 字段，在 result 展示。

**前端 UI**：
- idle：hero + 上局回顾 + 规则速查 + 开局按钮
- pick-my-poison：5×5 grid，点草莓切换选中 → 确认下毒
- playing：grid 上我的毒有 ☠️ 标记（仅自己可见），轮次指示器
- result：胜负 banner + 惩罚卡片 + 揭晓双方毒的位置（☠️ 我的毒 / 💀 TA 的毒）

**冷静期兼容**：和 rps 一致，胜方 +5 不受阻，败方 -5 失败时吞错继续。

### 已实现：谁更懂谁（5 个 action，需新集合 `whoKnowsSessions`）

**代码路径**：`lib/games/who-knows.js` + `pages/games/who-knows/`

**玩法**：从 24 道题库抽 6 道，3 道关于 A 3 道关于 B（subject 交错分配后打乱）。被问的人诚实作答，另一个人猜 TA 会答啥。

**积分规则（非对称）**：
- A 猜中关于 B 的题数 × 3 = A 获得的分
- B 猜中关于 A 的题数 × 3 = B 获得的分
- 最大每人 +9（3 题全中）

**Action**：`start / current / submit / cancel / history`

**评分逻辑**：
```js
questions.forEach((q, i) => {
  if (q.subject === myOpenid) taKnowsMe += (partnerAns[i] === myAns[i] ? 1 : 0)
  else meKnowsTa += (myAns[i] === partnerAns[i] ? 1 : 0)
})
```

**前端 UI**：类似情侣默契测试，但每题上方会显示"这题问你自己（如实回答）"或"这题问 TA（猜 TA 会选什么）"，提示当前角色。

### 已实现：你画我猜（7 个 action，需新集合 `drawingSessions` + 云存储）

**代码路径**：`lib/games/drawing.js` + `pages/games/drawing/`

**玩法**：发起人是画家，从 45 个词的词库随机抽一个 → 在 canvas 画板上画 → 上传云存储 → 对方看到图后输入文字猜测 → 画家判对错。

**阶段流转**（对应 status）：
```
drawing → guessing → judging → closed
  (画)       (猜)      (判)     (结算)
```

**快速路径**：如果猜测精确匹配 word 字符串，跳过 judging 直接 closed。

**Action**：
| Action | 说明 |
|---|---|
| `games.drawing.start` | 建局，抽词，startedBy 是画家 |
| `games.drawing.current` | 基于身份返回不同视角（词只给画家）|
| `games.drawing.submitDrawing` | 画家上传 fileID（canvas → 临时文件 → `wx.cloud.uploadFile`）|
| `games.drawing.submitGuess` | 猜方提交文字；精确匹配时直接 closed |
| `games.drawing.judge` | 画家判定 |
| `games.drawing.cancel` | 画家可在 guessing 阶段前取消 |
| `games.drawing.history` | 最近 20 局 |

**积分**：猜对时画家和猜者**双方各 +5**（鼓励合作）。猜错 0 分。

**前端 Canvas 要点**：
- 用 `<canvas type="2d">`（新版 canvas API，性能比老 canvas 好）
- `wx.createSelectorQuery().select('#id').fields({node:true,size:true})` 取到 node
- 手写 `touchStart/Move/End` 事件组合画线
- 提交时 `wx.canvasToTempFilePath` 导出 PNG → `wx.cloud.uploadFile` 上传 → 返回 `fileID`
- 展示时 `<image src="{{fileID}}">` 直接渲染云存储图片

### 已删除的 3 个占位
- ~~memory 翻牌记忆~~（移除）
- ~~number_1a2b 1A2B~~（移除）
- ~~dice_truth 骰子惩罚~~（移除）

目前 6 款游戏全部可玩，hub 不再有"敬请期待"项。

---
- 检查 `wx.cloud` 是否可用（基础库 >= 2.2.3）
- `wx.cloud.init({env})`，`env` 为空抛出警告 modal
- 把 `ready` 赋值为 bootstrap Promise

### 49. `app.bootstrap`
- 先看 storage 里的 openid 缓存，命中就跳过 login 云函数
- 无缓存 → 调 `login` 云函数拿 openid 存 storage
- 调 `user.getProfile`，写入 globalData 的 `user / bound / coupleId`
- **全流程打点**：`[bootstrap:launch]` → `[cloud-init-ok]` → `[openid-cached|ok]` → `[profile-ok]`

### 50. `app.refreshProfile`
- 绑定/解绑成功后调用，重新拉 profile 同步 globalData

---

## 📊 统计汇总

| 功能域 | 独立逻辑条数 |
|---|---|
| 基础设施 | 3 |
| 用户资料 | 2 |
| 情侣关系 | 5 |
| 首页聚合 | 1 |
| 积分引擎 | 2 |
| 任务系统 | 5 |
| 奖励商店 | 6 |
| 纪念日 | 3 |
| 心情打卡 | 3 |
| 留言板 | 4 |
| 共同目标 | 4 |
| 冷静期 | 4 |
| 惩罚池 | 3 |
| 幸运盒 | 2 |
| 前端启动链路 | 3 |
| **合计** | **50** |

---

## 🔗 隐藏的跨模块耦合（很重要）

这 5 处耦合不是独立 action，但贯穿多个功能：

1. **冷静期 → 所有扣分路径**：`points.adjust(delta<0)` 在 4 个场景下都会被拦截（手动扣分 / 兑换 / 目标投入 / 抽奖扣费），通过 `couple.points` 共享积分池实现
2. **任务完成 → 积分加成**：`tasks.complete` 调用 `pointsLib.adjust`，走完整校验
3. **积分变动 → records 自动留痕**：任何 `points.adjust` 都会在 `records` 集合留一条记录，账本和时间线都是从这里读
4. **绑定/解绑 → 双端数据同步**：`couples.status` + 两个 `users.coupleId` 必须一致，通过 `Promise.all` 并行写但不是事务
5. **抽奖红利 → 两条 records**：如果抽到 +5 积分券，会产生两条 records：`type='draw'` 扣 20 + `type='draw-bonus'` 加 5

这些耦合让"给对方加分"能自动触发"任务打卡进度+惩罚池等级变化+共同目标进度"的连锁效应。

---

## 🔎 如何排查问题

**前端某操作失败时**：
1. 看微信开发者工具 Console，找 `[api:biz-err]` 或 `[api:err]`，拿到 action 名和 code
2. 根据 code 判断：400 参数错 / 403 权限/绑定问题 / 404 资源不存在 / 409 业务冲突（重复操作、冷静期）
3. 按 action 名在本文档里定位具体逻辑

**后端业务错时**：
1. 云开发控制台 → 云函数 → `quickstartFunctions` → 日志
2. 按前缀搜索：`[action:err]` 看完整堆栈
3. 关键业务操作有额外 info 日志（如 `[points.adjust]`、`[couple.bindByCode]`）可以追踪

**积分对不上账时**：
1. 去 `records` 集合按 coupleId 过滤，按 createdAt 排序
2. 每笔变动都有 `type` 字段（add/deduct/task/redeem/goal/draw/draw-bonus）
3. 对比 `couples.points` 的当前值 vs records 累加和是否一致
