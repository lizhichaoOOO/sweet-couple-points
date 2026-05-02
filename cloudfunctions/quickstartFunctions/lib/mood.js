// cloudfunctions/quickstartFunctions/lib/mood.js
// 心情打卡：每人每日一条，唯一键 (couple, openid, date)
const { db, _, COL, BizError, requireCouple, todayDateStr, log, shortId } = require('./common')

// mood.set({ mood, note? }) → upsert 当日心情
exports.set = async (event, wx) => {
  const { mood, note = '' } = event
  if (!mood) throw new BizError('mood 必填')

  const { coupleId } = await requireCouple(wx.OPENID)
  const date = todayDateStr()
  const now = db.serverDate()

  const exist = await db.collection(COL.moods)
    .where({ coupleId, _openid: wx.OPENID, date })
    .get()

  if (exist.data.length) {
    await db.collection(COL.moods).doc(exist.data[0]._id).update({
      data: { mood, note, updatedAt: now }
    })
    log('mood.set:update', { coupleId, oid: shortId(wx.OPENID), mood, date })
    return { success: true, updated: true }
  }

  await db.collection(COL.moods).add({
    data: {
      coupleId,
      mood,
      note,
      date,
      createdAt: now,
      updatedAt: now
    }
  })
  log('mood.set:create', { coupleId, oid: shortId(wx.OPENID), mood, date })
  return { success: true, created: true }
}

// mood.getToday → 双方今日心情
exports.getToday = async (event, wx) => {
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)
  const date = todayDateStr()

  const res = await db.collection(COL.moods)
    .where({ coupleId, date })
    .get()

  const mine = res.data.find(m => m._openid === wx.OPENID)
  const partner = res.data.find(m => m._openid === partnerOpenid)
  return {
    mine: mine ? { mood: mine.mood, note: mine.note } : null,
    partner: partner ? { mood: partner.mood, note: partner.note } : null
  }
}

// mood.getWeek → 最近 7 天的本人心情
exports.getWeek = async (event, wx) => {
  const { coupleId } = await requireCouple(wx.OPENID)
  const start = new Date()
  start.setDate(start.getDate() - 6)
  start.setHours(0, 0, 0, 0)

  const res = await db.collection(COL.moods)
    .where({
      coupleId,
      _openid: wx.OPENID,
      createdAt: _.gte(start)
    })
    .orderBy('date', 'asc')
    .get()

  return { list: res.data }
}
