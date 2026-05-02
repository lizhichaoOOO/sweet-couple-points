// cloudfunctions/quickstartFunctions/lib/tasks.js
// 任务模块：列表、完成、自定义 CRUD
const { db, _, COL, BizError, requireCouple, startOfTodayISO, log, shortId } = require('./common')
const pointsLib = require('./points')

// 系统预设任务（coupleId 为空的任务对所有情侣可见）
const PRESET_TASKS = [
  { key: 'morning',  title: '早安打卡',  icon: '☀️',  points: 5,  period: 'daily' },
  { key: 'night',    title: '晚安打卡',  icon: '🌙',  points: 5,  period: 'daily' },
  { key: 'cook',     title: '做饭',      icon: '🍲',  points: 10, period: 'daily' },
  { key: 'wash',     title: '洗碗',      icon: '🍽️', points: 5,  period: 'daily' },
  { key: 'trash',    title: '倒垃圾',    icon: '🗑️', points: 3,  period: 'daily' },
  { key: 'bed',      title: '铺床',      icon: '🛏️', points: 3,  period: 'daily' },
  { key: 'date',     title: '每周约会',  icon: '💕',  points: 20, period: 'weekly' },
  { key: 'clean',    title: '每周大扫除', icon: '🧹',  points: 15, period: 'weekly' }
]

// tasks.list({ type: 'daily' | 'periodic' | 'custom' })
exports.list = async (event, wx) => {
  const { type = 'daily' } = event
  const { coupleId } = await requireCouple(wx.OPENID)

  let tasks = []
  if (type === 'daily') {
    tasks = PRESET_TASKS.filter(t => t.period === 'daily')
      .map((t, i) => ({ _id: `preset_${t.key}`, preset: true, ...t, type: 'daily' }))
  } else if (type === 'periodic') {
    tasks = PRESET_TASKS.filter(t => t.period === 'weekly')
      .map(t => ({ _id: `preset_${t.key}`, preset: true, ...t, type: 'periodic' }))
  } else if (type === 'custom') {
    const res = await db.collection(COL.tasks)
      .where({ coupleId, type: 'custom' })
      .orderBy('createdAt', 'desc')
      .get()
    tasks = res.data
  } else {
    throw new BizError('type 非法')
  }

  // 附加当日完成状态
  const since = periodStart(type)
  const completed = await db.collection(COL.taskCompletions)
    .where({
      coupleId,
      _openid: wx.OPENID,
      completedAt: _.gte(since)
    })
    .get()
  const doneIds = new Set(completed.data.map(c => c.taskId))

  return tasks.map(t => ({ ...t, done: doneIds.has(t._id) }))
}

// 首页用：今日全部任务（daily + periodic）带完成状态，返回前 3 条
exports.listToday = async (event, wx) => {
  const daily = await exports.list({ type: 'daily' }, wx)
  const periodic = await exports.list({ type: 'periodic' }, wx)
  // daily 优先、未完成优先
  const all = [...daily, ...periodic]
  return all.sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1)).slice(0, 3)
}

// tasks.complete({ taskId })
exports.complete = async (event, wx) => {
  const { taskId } = event
  if (!taskId) throw new BizError('taskId 必填')
  const { coupleId } = await requireCouple(wx.OPENID)

  // 解析任务
  const task = await resolveTask(taskId, coupleId)
  if (!task) throw new BizError('任务不存在', 404)

  // 当前周期是否已完成
  const since = periodStart(task.type || task.period || 'daily')
  const existed = await db.collection(COL.taskCompletions)
    .where({
      coupleId,
      _openid: wx.OPENID,
      taskId,
      completedAt: _.gte(since)
    })
    .count()
  if (existed.total > 0) {
    throw new BizError('本周期已完成过该任务', 409)
  }

  const points = Number(task.points) || 0
  const now = db.serverDate()
  // 先记录完成
  await db.collection(COL.taskCompletions).add({
    data: {
      coupleId,
      taskId,
      taskTitle: task.title,
      pointsEarned: points,
      completedAt: now
    }
  })
  // 再加分（带理由）
  if (points > 0) {
    await pointsLib.adjust(
      { delta: points, reason: `任务：${task.title}`, type: 'task' },
      wx
    )
  }
  log('tasks.complete', {
    coupleId,
    oid: shortId(wx.OPENID),
    taskId,
    title: task.title,
    points
  })
  return { success: true, pointsEarned: points }
}

// tasks.createCustom({ title, icon, points, period })
exports.createCustom = async (event, wx) => {
  const { title, icon = '📝', points, period = 'daily' } = event
  if (!title || typeof title !== 'string') throw new BizError('任务名必填')
  if (typeof points !== 'number' || points <= 0 || points > 200) {
    throw new BizError('积分需在 1-200 之间')
  }
  if (!['daily', 'weekly', 'once'].includes(period)) {
    throw new BizError('period 非法')
  }
  const { coupleId } = await requireCouple(wx.OPENID)

  const now = db.serverDate()
  const add = await db.collection(COL.tasks).add({
    data: {
      coupleId,
      type: 'custom',
      title: title.trim(),
      icon,
      points,
      period,
      createdBy: wx.OPENID,
      createdAt: now
    }
  })
  return { taskId: add._id }
}

// tasks.deleteCustom({ taskId })
exports.deleteCustom = async (event, wx) => {
  const { taskId } = event
  if (!taskId) throw new BizError('taskId 必填')
  const { coupleId } = await requireCouple(wx.OPENID)

  const res = await db.collection(COL.tasks).doc(taskId).get().catch(() => null)
  if (!res || !res.data) throw new BizError('任务不存在', 404)
  if (res.data.coupleId !== coupleId) throw new BizError('无权删除他人情侣的任务', 403)
  if (res.data.type !== 'custom') throw new BizError('只能删除自定义任务', 400)

  await db.collection(COL.tasks).doc(taskId).remove()
  return { success: true }
}

// --- 内部辅助 ---

// 根据 taskId 查出任务（预设或自定义）
async function resolveTask(taskId, coupleId) {
  if (typeof taskId === 'string' && taskId.startsWith('preset_')) {
    const key = taskId.slice('preset_'.length)
    const preset = PRESET_TASKS.find(t => t.key === key)
    if (!preset) return null
    return {
      _id: taskId,
      preset: true,
      ...preset,
      type: preset.period === 'daily' ? 'daily' : 'periodic'
    }
  }
  const res = await db.collection(COL.tasks).doc(taskId).get().catch(() => null)
  if (!res || !res.data || res.data.coupleId !== coupleId) return null
  return res.data
}

// 返回某任务周期的起始时间（用于判断是否本周期已完成）
function periodStart(type) {
  if (type === 'weekly' || type === 'periodic') {
    const d = new Date()
    const day = d.getDay() // 0=Sunday
    const diff = (day + 6) % 7 // 到本周一的差值
    d.setDate(d.getDate() - diff)
    d.setHours(0, 0, 0, 0)
    return d
  }
  // daily 或其他默认：今天 00:00
  return startOfTodayISO()
}
