// cloudfunctions/quickstartFunctions/lib/records.js
// 积分变动记录查询：时间线和账本共用
const { db, _, COL, requireCouple } = require('./common')

const MAX_LIMIT = 50

// records.list({ filter?: 'all' | 'add' | 'deduct', keyword?, limit?, skip? })
exports.list = async (event, wx) => {
  const { filter = 'all', keyword = '', limit = 20, skip = 0 } = event
  const { coupleId } = await requireCouple(wx.OPENID)

  const where = { coupleId }
  if (filter === 'add') where.type = 'add'
  else if (filter === 'deduct') where.type = 'deduct'

  const kw = (keyword || '').trim()
  const q = db.collection(COL.records).where(
    kw
      ? { ...where, reason: db.RegExp({ regexp: escapeRegex(kw), options: 'i' }) }
      : where
  )

  const lim = Math.min(Math.max(1, Number(limit) || 20), MAX_LIMIT)
  const skp = Math.max(0, Number(skip) || 0)

  const [listRes, countRes] = await Promise.all([
    q.orderBy('createdAt', 'desc').skip(skp).limit(lim).get(),
    q.count()
  ])

  return {
    list: listRes.data,
    total: countRes.total,
    hasMore: skp + listRes.data.length < countRes.total
  }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
