// cloudfunctions/quickstartFunctions/lib/anniversary.js
// 纪念日模块：增删查 + 倒计时
const { db, _, COL, BizError, requireCouple } = require('./common')

// anniversary.list → 返回纪念日，附加倒计时天数
exports.list = async (event, wx) => {
  const { coupleId } = await requireCouple(wx.OPENID)
  const res = await db.collection(COL.anniversaries)
    .where({ coupleId })
    .orderBy('date', 'asc')
    .get()

  return res.data.map(item => ({
    ...item,
    countdown: computeCountdown(item.date, item.repeat)
  }))
}

// anniversary.create({ title, date, emoji?, nextLabel?, repeat? })
// repeat: 'yearly' | 'none'
exports.create = async (event, wx) => {
  const { title, date, emoji = '🌸', nextLabel = '纪念日', repeat = 'yearly' } = event
  if (!title) throw new BizError('title 必填')
  if (!date) throw new BizError('date 必填')
  const d = new Date(date)
  if (isNaN(d.getTime())) throw new BizError('date 格式不正确')

  const { coupleId } = await requireCouple(wx.OPENID)
  const add = await db.collection(COL.anniversaries).add({
    data: {
      coupleId,
      title: title.trim(),
      emoji,
      nextLabel,
      repeat,
      date: d,
      createdBy: wx.OPENID,
      createdAt: db.serverDate()
    }
  })
  return { id: add._id }
}

// anniversary.delete({ id })
exports.delete = async (event, wx) => {
  const { id } = event
  if (!id) throw new BizError('id 必填')
  const { coupleId } = await requireCouple(wx.OPENID)

  const res = await db.collection(COL.anniversaries).doc(id).get().catch(() => null)
  if (!res || !res.data) throw new BizError('纪念日不存在', 404)
  if (res.data.coupleId !== coupleId) throw new BizError('无权操作', 403)

  await db.collection(COL.anniversaries).doc(id).remove()
  return { success: true }
}

// --- 内部辅助 ---
// 返回距离下一次该纪念日还剩多少天（yearly 则取下一年，none 则返回总经过天数负值）
function computeCountdown(dateStr, repeat) {
  const target = new Date(dateStr)
  if (isNaN(target.getTime())) return 0
  const now = new Date()
  if (repeat === 'yearly') {
    const next = new Date(target)
    next.setFullYear(now.getFullYear())
    if (next.getTime() < now.getTime()) {
      next.setFullYear(now.getFullYear() + 1)
    }
    return Math.max(0, Math.ceil((next.getTime() - now.getTime()) / 86400000))
  }
  // none：如果还未到 → 倒计时；已过 → 0
  const diff = Math.ceil((target.getTime() - now.getTime()) / 86400000)
  return Math.max(0, diff)
}
