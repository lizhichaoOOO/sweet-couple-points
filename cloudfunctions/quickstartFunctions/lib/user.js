// cloudfunctions/quickstartFunctions/lib/user.js
// 用户模块：自动登录即创建 + 基本资料维护
const { db, COL, BizError, getOrCreateUser, log, shortId } = require('./common')

// user.getProfile → 返回当前用户资料（不存在则创建）
exports.getProfile = async (event, wx) => {
  const user = await getOrCreateUser(wx.OPENID)
  return {
    openid: wx.OPENID,
    nickname: user.nickname,
    avatar: user.avatar,
    inviteCode: user.inviteCode,
    coupleId: user.coupleId || '',
    bound: !!user.coupleId
  }
}

// user.updateProfile(nickname?, avatar?)
exports.updateProfile = async (event, wx) => {
  const { nickname, avatar } = event
  const user = await getOrCreateUser(wx.OPENID)

  const data = { updatedAt: db.serverDate() }
  if (typeof nickname === 'string') {
    const t = nickname.trim()
    if (t.length === 0 || t.length > 30) throw new BizError('昵称长度 1-30 字符')
    data.nickname = t
  }
  if (typeof avatar === 'string') data.avatar = avatar

  await db.collection(COL.users).doc(user._id).update({ data })
  log('user.updateProfile', { oid: shortId(wx.OPENID), fields: Object.keys(data) })
  return { success: true }
}
