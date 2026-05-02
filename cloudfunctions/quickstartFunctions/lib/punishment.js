// cloudfunctions/quickstartFunctions/lib/punishment.js
// 惩罚池：根据积分划等级，触发对应惩罚
const { db, _, COL, BizError, requireCouple } = require('./common')

const LEVELS = [
  { level: 'light',  name: '轻度', threshold: -30,  content: '洗碗三天',          icon: '🍜' },
  { level: 'medium', name: '中度', threshold: -60,  content: '拖地一周',          icon: '🧹' },
  { level: 'severe', name: '重度', threshold: -100, content: '为对方买一周奶茶', icon: '🧋' }
]

// punishment.getStatus({ targetOpenid? }) → 返回当前等级、距下一级差多少
exports.getStatus = async (event, wx) => {
  const { couple } = await requireCouple(wx.OPENID)
  const target = event.targetOpenid || wx.OPENID
  const points = (couple.points || {})[target] || 0

  let currentLevel = null
  let nextLevel = null
  for (const lv of LEVELS) {
    if (points <= lv.threshold) currentLevel = lv
    else { nextLevel = lv; break }
  }

  const gap = nextLevel ? Math.max(0, points - nextLevel.threshold) : 0

  return {
    targetOpenid: target,
    currentPoints: points,
    levels: LEVELS,
    currentLevel,
    nextLevel,
    nextLevelGap: gap,
    progressPercent: computeProgress(points)
  }
}

// punishment.accept({ level? }) → 接受当前等级的惩罚，写入记录
exports.accept = async (event, wx) => {
  const { couple, coupleId } = await requireCouple(wx.OPENID)
  const points = (couple.points || {})[wx.OPENID] || 0

  let chosen = null
  if (event.level) {
    chosen = LEVELS.find(l => l.level === event.level)
  } else {
    for (const lv of LEVELS) {
      if (points <= lv.threshold) chosen = lv
    }
  }
  if (!chosen) throw new BizError('当前积分未触发任何惩罚等级', 400)

  // 24 小时内不重复触发同一等级
  const since = new Date(Date.now() - 86400000)
  const existed = await db.collection(COL.punishments)
    .where({
      coupleId,
      _openid: wx.OPENID,
      level: chosen.level,
      status: _.in(['pending', 'accepted']),
      createdAt: _.gte(since)
    })
    .count()
  if (existed.total > 0) {
    throw new BizError('24 小时内已触发过该等级惩罚', 409)
  }

  const add = await db.collection(COL.punishments).add({
    data: {
      coupleId,
      level: chosen.level,
      content: chosen.content,
      status: 'accepted',
      acceptedAt: db.serverDate(),
      createdAt: db.serverDate()
    }
  })
  return { punishmentId: add._id, content: chosen.content }
}

// punishment.complete({ id }) → 标记完成（由对方确认）
exports.complete = async (event, wx) => {
  const { id } = event
  if (!id) throw new BizError('id 必填')
  const { coupleId } = await requireCouple(wx.OPENID)

  const res = await db.collection(COL.punishments).doc(id).get().catch(() => null)
  if (!res || !res.data) throw new BizError('惩罚不存在', 404)
  if (res.data.coupleId !== coupleId) throw new BizError('无权操作', 403)
  if (res.data._openid === wx.OPENID) {
    throw new BizError('被惩罚人不能自己标记完成', 400)
  }

  await db.collection(COL.punishments).doc(id).update({
    data: {
      status: 'completed',
      completedAt: db.serverDate(),
      completedBy: wx.OPENID
    }
  })
  return { success: true }
}

function computeProgress(points) {
  // 返回相对于三等级的进度百分比 0-100
  if (points >= 0) return 0
  if (points <= -100) return 100
  // -100 → 100%, 0 → 0%
  return Math.round((-points / 100) * 100)
}
