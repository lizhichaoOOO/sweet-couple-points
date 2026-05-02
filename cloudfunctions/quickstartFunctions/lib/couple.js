// cloudfunctions/quickstartFunctions/lib/couple.js
// 情侣模块：邀请码生成、绑定、查询、解绑
const { db, _, COL, BizError, getOrCreateUser, requireCouple } = require('./common')

// couple.getInviteCode → 返回自己的邀请码
exports.getInviteCode = async (event, wx) => {
  const user = await getOrCreateUser(wx.OPENID)
  return { code: user.inviteCode }
}

// couple.bindByCode({ code, startDate? })
// 两种语义：
//  - 被邀请方扫码：code 是邀请方的邀请码
//  - 双方独立用邀请码绑定，第一个输入的人创建 couple
exports.bindByCode = async (event, wx) => {
  const { code, startDate } = event
  if (!code || typeof code !== 'string') throw new BizError('邀请码必填')
  if (code.length < 4) throw new BizError('邀请码格式不正确')

  const me = await getOrCreateUser(wx.OPENID)
  if (me.coupleId) throw new BizError('你已经绑定过情侣，先解绑', 409)

  const partnerRes = await db.collection(COL.users).where({ inviteCode: code.trim() }).get()
  if (!partnerRes.data.length) throw new BizError('邀请码无效', 404)

  const partner = partnerRes.data[0]
  if (partner._openid === wx.OPENID) throw new BizError('不能绑定自己', 400)
  if (partner.coupleId) throw new BizError('对方已绑定其他情侣', 409)

  const now = db.serverDate()
  const members = [wx.OPENID, partner._openid]
  const coupleAdd = await db.collection(COL.couples).add({
    data: {
      members,
      startDate: startDate ? new Date(startDate) : now,
      points: { [wx.OPENID]: 0, [partner._openid]: 0 },
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
  })

  // 同时更新两个用户的 coupleId
  await Promise.all([
    db.collection(COL.users).doc(me._id).update({ data: { coupleId: coupleAdd._id, updatedAt: now } }),
    db.collection(COL.users).doc(partner._id).update({ data: { coupleId: coupleAdd._id, updatedAt: now } })
  ])

  return { coupleId: coupleAdd._id, members }
}

// couple.getInfo → 返回当前情侣信息（双方资料、积分、在一起天数）
exports.getInfo = async (event, wx) => {
  const { couple, partnerOpenid, coupleId } = await requireCouple(wx.OPENID)

  // 取双方用户资料
  const [meRes, partnerRes] = await Promise.all([
    db.collection(COL.users).where({ _openid: wx.OPENID }).get(),
    db.collection(COL.users).where({ _openid: partnerOpenid }).get()
  ])
  const me = meRes.data[0] || {}
  const partner = partnerRes.data[0] || {}

  const points = couple.points || {}
  const startDate = couple.startDate ? new Date(couple.startDate) : new Date()
  const days = Math.max(0, Math.floor((Date.now() - startDate.getTime()) / 86400000))

  return {
    coupleId,
    daysTogether: days,
    startDate: startDate.toISOString().slice(0, 10),
    me: {
      openid: wx.OPENID,
      nickname: me.nickname,
      avatar: me.avatar,
      points: points[wx.OPENID] || 0
    },
    partner: {
      openid: partnerOpenid,
      nickname: partner.nickname,
      avatar: partner.avatar,
      points: points[partnerOpenid] || 0
    }
  }
}

// couple.unbind → 解绑（双方同意模式：这里简化为任一方可发起，直接解除）
exports.unbind = async (event, wx) => {
  const { couple, coupleId } = await requireCouple(wx.OPENID)
  const now = db.serverDate()

  await db.collection(COL.couples).doc(coupleId).update({
    data: { status: 'dissolved', dissolvedAt: now, updatedAt: now }
  })
  await db.collection(COL.users).where({ coupleId }).update({
    data: { coupleId: '', updatedAt: now }
  })
  return { success: true }
}

// couple.setStartDate({ startDate: 'YYYY-MM-DD' }) → 修改在一起的纪念日
exports.setStartDate = async (event, wx) => {
  const { startDate } = event
  if (!startDate) throw new BizError('startDate 必填')
  const { coupleId } = await requireCouple(wx.OPENID)
  const d = new Date(startDate)
  if (isNaN(d.getTime())) throw new BizError('日期格式不正确')

  await db.collection(COL.couples).doc(coupleId).update({
    data: { startDate: d, updatedAt: db.serverDate() }
  })
  return { success: true }
}
