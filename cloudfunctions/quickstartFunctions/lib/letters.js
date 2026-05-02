// cloudfunctions/quickstartFunctions/lib/letters.js
// 留言板/情书：发送、列表、点赞
const { db, _, COL, BizError, requireCouple, log, shortId } = require('./common')

// letters.send({ content })
exports.send = async (event, wx) => {
  const { content } = event
  if (!content || typeof content !== 'string') throw new BizError('content 必填')
  const trimmed = content.trim()
  if (trimmed.length === 0) throw new BizError('内容不能为空')
  if (trimmed.length > 500) throw new BizError('内容不能超过 500 字')

  const { coupleId } = await requireCouple(wx.OPENID)
  const add = await db.collection(COL.letters).add({
    data: {
      coupleId,
      content: trimmed,
      likes: 0,
      createdAt: db.serverDate()
    }
  })
  log('letters.send', { coupleId, oid: shortId(wx.OPENID), id: add._id, length: trimmed.length })
  return { letterId: add._id }
}

// letters.list({ limit?, skip? })
exports.list = async (event, wx) => {
  const { limit = 20, skip = 0 } = event
  const { coupleId } = await requireCouple(wx.OPENID)
  const lim = Math.min(Math.max(1, Number(limit) || 20), 50)
  const skp = Math.max(0, Number(skip) || 0)

  const res = await db.collection(COL.letters)
    .where({ coupleId })
    .orderBy('createdAt', 'desc')
    .skip(skp)
    .limit(lim)
    .get()
  return { list: res.data }
}

// letters.like({ id })
exports.like = async (event, wx) => {
  const { id } = event
  if (!id) throw new BizError('id 必填')
  const { coupleId } = await requireCouple(wx.OPENID)

  const res = await db.collection(COL.letters).doc(id).get().catch(() => null)
  if (!res || !res.data) throw new BizError('留言不存在', 404)
  if (res.data.coupleId !== coupleId) throw new BizError('无权操作', 403)

  await db.collection(COL.letters).doc(id).update({
    data: { likes: _.inc(1) }
  })
  return { success: true }
}

// letters.delete({ id })
exports.delete = async (event, wx) => {
  const { id } = event
  if (!id) throw new BizError('id 必填')
  const { coupleId } = await requireCouple(wx.OPENID)

  const res = await db.collection(COL.letters).doc(id).get().catch(() => null)
  if (!res || !res.data) throw new BizError('留言不存在', 404)
  if (res.data.coupleId !== coupleId) throw new BizError('无权操作', 403)
  if (res.data._openid !== wx.OPENID) throw new BizError('只能删除自己发的留言', 403)

  await db.collection(COL.letters).doc(id).remove()
  return { success: true }
}
