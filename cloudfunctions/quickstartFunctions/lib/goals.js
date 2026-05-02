// cloudfunctions/quickstartFunctions/lib/goals.js
// 共同目标：创建、查询、投入积分
const { db, _, COL, BizError, requireCouple } = require('./common')
const pointsLib = require('./points')

// goals.list
exports.list = async (event, wx) => {
  const { coupleId } = await requireCouple(wx.OPENID)
  const res = await db.collection(COL.goals)
    .where({ coupleId })
    .orderBy('createdAt', 'desc')
    .get()
  return { list: res.data }
}

// goals.create({ title, total, emoji? })
exports.create = async (event, wx) => {
  const { title, total, emoji = '🎯' } = event
  if (!title) throw new BizError('title 必填')
  if (typeof total !== 'number' || total <= 0 || total > 1000000) {
    throw new BizError('total 需在 1-1000000 之间')
  }
  const { coupleId } = await requireCouple(wx.OPENID)
  const add = await db.collection(COL.goals).add({
    data: {
      coupleId,
      title: title.trim(),
      emoji,
      total,
      current: 0,
      contributions: {},
      status: 'active',
      createdBy: wx.OPENID,
      createdAt: db.serverDate()
    }
  })
  return { goalId: add._id }
}

// goals.contribute({ goalId, amount })
// 投入 = 从自己积分扣除 + 累加到目标 current + contributions[openid]
exports.contribute = async (event, wx) => {
  const { goalId, amount } = event
  if (!goalId) throw new BizError('goalId 必填')
  if (typeof amount !== 'number' || amount <= 0) throw new BizError('amount 必须为正数')
  if (amount > 10000) throw new BizError('单次不能超过 10000')

  const { couple, coupleId } = await requireCouple(wx.OPENID)
  const myPoints = (couple.points || {})[wx.OPENID] || 0
  if (myPoints < amount) throw new BizError('积分不足', 400)

  const goalRes = await db.collection(COL.goals).doc(goalId).get().catch(() => null)
  if (!goalRes || !goalRes.data) throw new BizError('目标不存在', 404)
  const goal = goalRes.data
  if (goal.coupleId !== coupleId) throw new BizError('无权操作', 403)
  if (goal.status !== 'active') throw new BizError('该目标已完成或暂停', 409)

  // 先扣用户积分（会进入 records）
  await pointsLib.adjust(
    { delta: -amount, reason: `投入目标：${goal.title}`, type: 'goal' },
    wx
  )
  // 累加目标
  const newCurrent = Math.min(goal.total, (goal.current || 0) + amount)
  const achieved = newCurrent >= goal.total
  await db.collection(COL.goals).doc(goalId).update({
    data: {
      current: _.inc(amount),
      [`contributions.${wx.OPENID}`]: _.inc(amount),
      status: achieved ? 'achieved' : 'active',
      achievedAt: achieved ? db.serverDate() : undefined,
      updatedAt: db.serverDate()
    }
  })
  return { success: true, achieved, current: newCurrent, total: goal.total }
}

// goals.delete({ goalId }) — 未达成可删除
exports.delete = async (event, wx) => {
  const { goalId } = event
  if (!goalId) throw new BizError('goalId 必填')
  const { coupleId } = await requireCouple(wx.OPENID)

  const res = await db.collection(COL.goals).doc(goalId).get().catch(() => null)
  if (!res || !res.data) throw new BizError('目标不存在', 404)
  if (res.data.coupleId !== coupleId) throw new BizError('无权操作', 403)

  await db.collection(COL.goals).doc(goalId).remove()
  return { success: true }
}
