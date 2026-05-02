// cloudfunctions/quickstartFunctions/lib/cooldown.js
// 吵架冷静期：任一方发起 → 锁扣分；双方同意才能提前结束
const { db, _, COL, BizError, requireCouple } = require('./common')

const DEFAULT_DURATION_MIN = 30
const MAX_EXTEND_MIN = 120

// cooldown.start({ durationMin? }) → 开启冷静期
exports.start = async (event, wx) => {
  const durationMin = Number(event.durationMin) || DEFAULT_DURATION_MIN
  if (durationMin <= 0 || durationMin > 720) throw new BizError('durationMin 超范围')

  const { coupleId } = await requireCouple(wx.OPENID)
  // 已有活跃冷静期，直接返回
  const existing = await db.collection(COL.cooldowns)
    .where({ coupleId, status: 'active' })
    .limit(1)
    .get()
  if (existing.data.length) {
    return { id: existing.data[0]._id, already: true }
  }

  const now = new Date()
  const endAt = new Date(now.getTime() + durationMin * 60 * 1000)
  const add = await db.collection(COL.cooldowns).add({
    data: {
      coupleId,
      startedBy: wx.OPENID,
      startAt: now,
      endAt,
      status: 'active',
      endVoters: [],
      createdAt: db.serverDate()
    }
  })
  return { id: add._id, endAt: endAt.toISOString() }
}

// cooldown.getActive → 返回当前活跃冷静期（附剩余秒数）
exports.getActive = async (event, wx) => {
  const { coupleId } = await requireCouple(wx.OPENID)
  const res = await db.collection(COL.cooldowns)
    .where({ coupleId, status: 'active' })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()

  if (!res.data.length) return { active: false }
  const cd = res.data[0]
  const endTime = new Date(cd.endAt).getTime()
  const remainSec = Math.max(0, Math.floor((endTime - Date.now()) / 1000))

  // 已到期自动收尾
  if (remainSec === 0 && cd.status === 'active') {
    await db.collection(COL.cooldowns).doc(cd._id).update({
      data: { status: 'expired', endedAt: db.serverDate() }
    })
    return { active: false, expired: true }
  }

  return {
    active: true,
    id: cd._id,
    startedBy: cd.startedBy,
    endAt: new Date(cd.endAt).toISOString(),
    remainSec,
    endVoters: cd.endVoters || []
  }
}

// cooldown.extend({ additionalMin }) → 延长
exports.extend = async (event, wx) => {
  const additionalMin = Number(event.additionalMin) || 10
  if (additionalMin <= 0 || additionalMin > MAX_EXTEND_MIN) {
    throw new BizError(`单次延长 1-${MAX_EXTEND_MIN} 分钟`)
  }
  const { coupleId } = await requireCouple(wx.OPENID)

  const res = await db.collection(COL.cooldowns)
    .where({ coupleId, status: 'active' })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
  if (!res.data.length) throw new BizError('当前无冷静期', 404)

  const cd = res.data[0]
  const newEnd = new Date(new Date(cd.endAt).getTime() + additionalMin * 60 * 1000)
  await db.collection(COL.cooldowns).doc(cd._id).update({
    data: {
      endAt: newEnd,
      endVoters: [], // 延长会清空投票
      updatedAt: db.serverDate()
    }
  })
  return { endAt: newEnd.toISOString() }
}

// cooldown.requestEnd → 请求提前结束（双方都投票才结束）
exports.requestEnd = async (event, wx) => {
  const { coupleId } = await requireCouple(wx.OPENID)
  const res = await db.collection(COL.cooldowns)
    .where({ coupleId, status: 'active' })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
  if (!res.data.length) throw new BizError('当前无冷静期', 404)
  const cd = res.data[0]

  const voters = Array.from(new Set([...(cd.endVoters || []), wx.OPENID]))
  // 情侣双方都投票则结束
  const membersRes = await db.collection(COL.couples).doc(coupleId).get()
  const members = membersRes.data.members || []
  const bothAgreed = members.every(m => voters.includes(m))

  if (bothAgreed) {
    await db.collection(COL.cooldowns).doc(cd._id).update({
      data: {
        status: 'ended',
        endedAt: db.serverDate(),
        endVoters: voters
      }
    })
    return { ended: true }
  }

  await db.collection(COL.cooldowns).doc(cd._id).update({
    data: { endVoters: voters, updatedAt: db.serverDate() }
  })
  return { ended: false, waitingForPartner: true }
}
