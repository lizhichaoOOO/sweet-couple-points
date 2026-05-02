// cloudfunctions/quickstartFunctions/lib/points.js
// 积分变动模块：加分、扣分、任务奖励（内部用）
const { db, _, COL, BizError, requireCouple, isMember } = require('./common')

// points.adjust({ delta, reason, targetOpenid?, type? })
// - delta 正数加分 / 负数扣分
// - targetOpenid 省略则变更自己的积分
// - 扣分时若情侣处于冷静期则拒绝
exports.adjust = async (event, wx) => {
  const { delta, reason, type } = event
  const targetOpenid = event.targetOpenid || wx.OPENID

  if (typeof delta !== 'number' || !Number.isFinite(delta) || delta === 0) {
    throw new BizError('delta 必须是非零数字')
  }
  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    throw new BizError('原因必填')
  }
  if (Math.abs(delta) > 1000) {
    throw new BizError('单次变动不能超过 1000 分')
  }

  const { couple, coupleId } = await requireCouple(wx.OPENID)
  if (!isMember(couple, targetOpenid)) {
    throw new BizError('目标用户不在此情侣中', 403)
  }

  // 扣分检查冷静期
  if (delta < 0) {
    const cdRes = await db.collection(COL.cooldowns)
      .where({ coupleId, status: 'active' })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()
    if (cdRes.data.length) {
      const active = cdRes.data[0]
      const endTime = new Date(active.endAt).getTime()
      if (endTime > Date.now()) {
        throw new BizError('冷静期内禁止扣分', 409)
      }
    }
  }

  const now = db.serverDate()
  // 原子自增
  await db.collection(COL.couples).doc(coupleId).update({
    data: { [`points.${targetOpenid}`]: _.inc(delta), updatedAt: now }
  })

  // 插入变动记录
  const recAdd = await db.collection(COL.records).add({
    data: {
      coupleId,
      actorOpenid: wx.OPENID,
      targetOpenid,
      delta,
      reason: reason.trim(),
      type: type || (delta > 0 ? 'add' : 'deduct'),
      createdAt: now
    }
  })

  return { success: true, recordId: recAdd._id, delta }
}
