// cloudfunctions/quickstartFunctions/lib/rewards.js
// 奖励商店：预设 + 自定义、兑换、履行
const { db, _, COL, BizError, requireCouple, log, shortId } = require('./common')
const pointsLib = require('./points')

const PRESET_REWARDS = [
  { key: 'movie',    title: '陪看一部电影',     price: 50,  icon: '🎬' },
  { key: 'cook',     title: '做一顿饭',         price: 80,  icon: '🍳' },
  { key: 'massage',  title: '按摩 30 分钟',     price: 100, icon: '💆' },
  { key: 'sweet',    title: '说 10 句甜言蜜语', price: 30,  icon: '💕' },
  { key: 'weekend',  title: '周末随叫随到',     price: 150, icon: '🙇' },
  { key: 'tea',      title: '买一杯奶茶',       price: 20,  icon: '🧋' }
]

// rewards.list
exports.list = async (event, wx) => {
  const { coupleId } = await requireCouple(wx.OPENID)
  const customRes = await db.collection(COL.rewards)
    .where({ coupleId, type: 'custom' })
    .orderBy('createdAt', 'desc')
    .get()

  const preset = PRESET_REWARDS.map(r => ({
    _id: `preset_${r.key}`,
    preset: true,
    ...r,
    type: 'preset'
  }))
  return [...preset, ...customRes.data]
}

// rewards.redeem({ rewardId })
// 兑换 = 扣分 + 创建兑换记录（pending）
exports.redeem = async (event, wx) => {
  const { rewardId } = event
  if (!rewardId) throw new BizError('rewardId 必填')

  const { couple, coupleId } = await requireCouple(wx.OPENID)
  const reward = await resolveReward(rewardId, coupleId)
  if (!reward) throw new BizError('奖励不存在', 404)

  const price = Number(reward.price) || 0
  const myPoints = (couple.points || {})[wx.OPENID] || 0
  if (myPoints < price) throw new BizError('积分不足', 400)

  const now = db.serverDate()
  // 扣分（带 type=redeem）
  await pointsLib.adjust(
    { delta: -price, reason: `兑换：${reward.title}`, type: 'redeem' },
    wx
  )
  // 写兑换记录
  const add = await db.collection(COL.redemptions).add({
    data: {
      coupleId,
      rewardId,
      rewardTitle: reward.title,
      redeemerOpenid: wx.OPENID,
      price,
      status: 'pending',
      createdAt: now
    }
  })
  log('rewards.redeem', {
    coupleId,
    oid: shortId(wx.OPENID),
    rewardTitle: reward.title,
    price,
    redemptionId: add._id
  })
  return { redemptionId: add._id, pricePaid: price }
}

// rewards.fulfill({ redemptionId }) → 对方（执行者）标记已履行
exports.fulfill = async (event, wx) => {
  const { redemptionId } = event
  if (!redemptionId) throw new BizError('redemptionId 必填')
  const { coupleId } = await requireCouple(wx.OPENID)

  const res = await db.collection(COL.redemptions).doc(redemptionId).get().catch(() => null)
  if (!res || !res.data) throw new BizError('兑换记录不存在', 404)
  if (res.data.coupleId !== coupleId) throw new BizError('无权操作', 403)
  if (res.data.redeemerOpenid === wx.OPENID) {
    throw new BizError('兑换人不能自己标记完成', 400)
  }
  if (res.data.status === 'fulfilled') {
    return { success: true, already: true }
  }

  await db.collection(COL.redemptions).doc(redemptionId).update({
    data: {
      status: 'fulfilled',
      fulfilledAt: db.serverDate(),
      fulfilledBy: wx.OPENID
    }
  })
  log('rewards.fulfill', {
    coupleId,
    redemptionId,
    rewardTitle: res.data.rewardTitle,
    fulfilledBy: shortId(wx.OPENID)
  })
  return { success: true }
}

// rewards.createCustom({ title, icon, price })
exports.createCustom = async (event, wx) => {
  const { title, icon = '🎁', price } = event
  if (!title) throw new BizError('奖励名必填')
  if (typeof price !== 'number' || price <= 0 || price > 100000) {
    throw new BizError('积分需在 1-100000 之间')
  }
  const { coupleId } = await requireCouple(wx.OPENID)
  const add = await db.collection(COL.rewards).add({
    data: {
      coupleId,
      type: 'custom',
      title: title.trim(),
      icon,
      price,
      createdBy: wx.OPENID,
      createdAt: db.serverDate()
    }
  })
  return { rewardId: add._id }
}

// rewards.deleteCustom({ rewardId })
exports.deleteCustom = async (event, wx) => {
  const { rewardId } = event
  if (!rewardId) throw new BizError('rewardId 必填')
  const { coupleId } = await requireCouple(wx.OPENID)

  const res = await db.collection(COL.rewards).doc(rewardId).get().catch(() => null)
  if (!res || !res.data) throw new BizError('奖励不存在', 404)
  if (res.data.coupleId !== coupleId) throw new BizError('无权操作', 403)
  if (res.data.type !== 'custom') throw new BizError('只能删除自定义奖励', 400)

  await db.collection(COL.rewards).doc(rewardId).remove()
  return { success: true }
}

// rewards.listRedemptions → 兑换记录列表
exports.listRedemptions = async (event, wx) => {
  const { coupleId } = await requireCouple(wx.OPENID)
  const res = await db.collection(COL.redemptions)
    .where({ coupleId })
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get()
  return { list: res.data }
}

// --- 内部辅助 ---
async function resolveReward(rewardId, coupleId) {
  if (typeof rewardId === 'string' && rewardId.startsWith('preset_')) {
    const key = rewardId.slice('preset_'.length)
    const preset = PRESET_REWARDS.find(r => r.key === key)
    return preset ? { _id: rewardId, preset: true, ...preset, type: 'preset' } : null
  }
  const res = await db.collection(COL.rewards).doc(rewardId).get().catch(() => null)
  if (!res || !res.data || res.data.coupleId !== coupleId) return null
  return res.data
}
