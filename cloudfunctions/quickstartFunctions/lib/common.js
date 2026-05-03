// cloudfunctions/quickstartFunctions/lib/common.js
// 共享工具：db 实例、集合名常量、业务错误、权限校验
const cloud = require('wx-server-sdk')

const db = cloud.database()
const _ = db.command

// 集合名统一常量，改名时只改这里
const COL = {
  users: 'users',
  couples: 'couples',
  records: 'records',
  tasks: 'tasks',
  taskCompletions: 'taskCompletions',
  rewards: 'rewards',
  redemptions: 'redemptions',
  anniversaries: 'anniversaries',
  moods: 'moods',
  letters: 'letters',
  goals: 'goals',
  cooldowns: 'cooldowns',
  punishments: 'punishments',
  luckyDraws: 'luckyDraws',
  quizSessions: 'quizSessions',
  rpsSessions: 'rpsSessions'
}

// 带 code 的业务错误
class BizError extends Error {
  constructor(message, code = 400) {
    super(message)
    this.code = code
  }
}

// 取当前用户；不存在则自动创建最小记录
async function getOrCreateUser(openid) {
  if (!openid) throw new BizError('未登录', 401)
  const res = await db.collection(COL.users).where({ _openid: openid }).get()
  if (res.data.length) return res.data[0]

  const code = await generateUniqueInviteCode()
  const now = db.serverDate()
  const add = await db.collection(COL.users).add({
    data: {
      _openid: openid,
      nickname: '',
      avatar: '',
      inviteCode: code,
      coupleId: '',
      createdAt: now,
      updatedAt: now
    }
  })
  console.log('[user:auto-created]', { oid: openid.slice(-6), userId: add._id, inviteCode: code })
  const created = await db.collection(COL.users).doc(add._id).get()
  return created.data
}

// 校验登录；返回 user 文档
async function requireUser(openid) {
  return await getOrCreateUser(openid)
}

// 校验已绑定情侣；返回 { user, couple, coupleId, partnerOpenid }
async function requireCouple(openid) {
  const user = await getOrCreateUser(openid)
  if (!user.coupleId) throw new BizError('未绑定情侣', 403)
  const coupleRes = await db.collection(COL.couples).doc(user.coupleId).get().catch(() => null)
  if (!coupleRes || !coupleRes.data) {
    throw new BizError('情侣信息不存在', 404)
  }
  const couple = coupleRes.data
  const partnerOpenid = (couple.members || []).find(m => m !== openid) || ''
  return { user, couple, coupleId: user.coupleId, partnerOpenid }
}

// 生成 6 位邀请码（不与已有重复）
async function generateUniqueInviteCode() {
  for (let i = 0; i < 8; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const exists = await db.collection(COL.users).where({ inviteCode: code }).count()
    if (exists.total === 0) return code
  }
  // 极端情况下加时间戳兜底
  return String(Date.now()).slice(-6)
}

// 判断目标 openid 是否在某情侣中
function isMember(couple, openid) {
  return (couple.members || []).includes(openid)
}

// 当日 00:00（用于"今日任务完成状态"等判断）
function startOfTodayISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// 日期字符串 YYYY-MM-DD（用于心情打卡唯一键）
function todayDateStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 日志工具：[module.fn] {...}
function log(tag, data) {
  console.log(`[${tag}]`, data || '')
}
function logWarn(tag, data) {
  console.warn(`[${tag}]`, data || '')
}
function logError(tag, err, data) {
  console.error(`[${tag}]`, err && err.message, err && err.stack, data || '')
}
function shortId(openid) {
  return openid ? openid.slice(-6) : ''
}

module.exports = {
  cloud,
  db,
  _,
  COL,
  BizError,
  getOrCreateUser,
  requireUser,
  requireCouple,
  generateUniqueInviteCode,
  isMember,
  startOfTodayISO,
  todayDateStr,
  log,
  logWarn,
  logError,
  shortId
}
