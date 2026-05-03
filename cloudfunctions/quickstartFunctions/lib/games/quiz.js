// cloudfunctions/quickstartFunctions/lib/games/quiz.js
// 情侣默契测试：双方独立答同一套题，答案一致即默契
const { db, _, COL, BizError, requireCouple, log, shortId } = require('../common')
const pointsLib = require('../points')

const QUESTIONS_PER_SESSION = 10

// 默契评分 → 双方积分奖励
const REWARD_HIGH = 15     // >= 8/10
const REWARD_MID = 5       // 5~7/10
const REWARD_LOW = 0       // < 5/10
const HIGH_THRESHOLD = 8
const MID_THRESHOLD = 5

// 题库：30 道价值观 / 偏好 / 相处方式的四选一题
// 两人独立作答同一题，选项一致即"默契"
const QUESTION_BANK = [
  { id: 'q01', text: '你更喜欢哪种周末？', options: ['睡到自然醒', '早起出门运动', '宅家打游戏追剧', '约 TA 出去玩'] },
  { id: 'q02', text: '面对冲突你通常会？', options: ['冷静讲道理', '先冷处理两天', '直接说清楚', '选择回避'] },
  { id: 'q03', text: '理想的旅行方式？', options: ['海边度假放松', '城市逛吃打卡', '小众古镇漫游', '说走就走的自驾'] },
  { id: 'q04', text: '吵架后你最希望对方？', options: ['先主动道歉', '冷静一会再聊', '送个小礼物', '装作没事继续'] },
  { id: 'q05', text: '爱情里你最看重？', options: ['相互理解', '激情和浪漫', '稳定和陪伴', '共同成长'] },
  { id: 'q06', text: '我心情不好时，我希望你？', options: ['主动分享让 TA 帮忙', '自己消化不打扰 TA', '来身边抱抱', '约我出去散心'] },
  { id: 'q07', text: '你最放松的时刻？', options: ['泡个热水澡', '刷会儿短视频', '听音乐发呆', '躺平啥也不干'] },
  { id: 'q08', text: '周年纪念日你最想？', options: ['收到惊喜礼物', '一起吃顿好的', '两人短途旅行', '写一封长信'] },
  { id: 'q09', text: '面对大消费你的态度？', options: ['精打细算对比再买', '想要就买不纠结', '攒满优惠再下单', '问 TA 一起决定'] },
  { id: 'q10', text: '爱需要怎么表达？', options: ['每天都说出来', '用行动默默表达', '有仪式感的节点', '藏在日常细节里'] },
  { id: 'q11', text: '看到喜欢的东西，你？', options: ['立刻下单', '加购物车观望', '看攻略再决定', '找 TA 商量一下'] },
  { id: 'q12', text: '对方做什么最容易让你心动？', options: ['说动人的情话', '送贴心的小礼物', '主动做家务', '陪我熬夜聊天'] },
  { id: 'q13', text: '你理想中的家是？', options: ['温馨小窝', '极简风', '充满书和植物', 'TA 在就行'] },
  { id: 'q14', text: '你最受不了对方？', options: ['一直看手机', '冷战不说话', '说话刻薄', '忘了重要日子'] },
  { id: 'q15', text: '未来你更看重？', options: ['经济自由', '情感稳定', '各自成长', '一起体验世界'] },
  { id: 'q16', text: '心情低落时你会？', options: ['找人倾诉', '一个人待着', '吃顿好的', '睡一觉就好'] },
  { id: 'q17', text: '我们最大的共同点是？', options: ['都爱吃同一类美食', '作息生活习惯一样', '三观相近', '互相依赖离不开'] },
  { id: 'q18', text: '如果中了 100 万你会先？', options: ['存起来以防万一', '去一次远途旅行', '付个房子首付', '买一直想要的东西'] },
  { id: 'q19', text: '你理想的早晨是？', options: ['早餐已经准备好', '一起慢悠悠起床', '各自忙不打扰', '被 TA 的吻叫醒'] },
  { id: 'q20', text: '见我父母/朋友时你会？', options: ['提前准备略紧张', '很自然地相处', '让我主导', '准备个小礼物'] },
  { id: 'q21', text: '养宠物你倾向？', options: ['养狗狗活泼型', '养猫慵懒型', '不养怕麻烦', 'TA 想养就养'] },
  { id: 'q22', text: '两个人晚餐通常？', options: ['家里做饭', '下馆子吃', '点外卖', 'TA 决定就好'] },
  { id: 'q23', text: '我最打动你的时刻？', options: ['第一次见面那天', '我为你做了件小事', '一起经历困难', '平淡日常某个瞬间'] },
  { id: 'q24', text: '夜晚睡觉你喜欢？', options: ['紧紧抱着睡', '各自睡有空间', '牵着手就够', '背对背贴着'] },
  { id: 'q25', text: '看到我和异性聊天你？', options: ['完全信任不在意', '偶尔酸但不说', '会直接问是谁', '心里不舒服憋着'] },
  { id: 'q26', text: '关于收入，你倾向？', options: ['各自管各自', '我的就是你的', '组共同账户', '收入高的多出一点'] },
  { id: 'q27', text: '你觉得幸福是？', options: ['身边有 TA', '自由选择生活', '家人朋友都好', '自我实现'] },
  { id: 'q28', text: '周末在家你的状态？', options: ['一整天不出门', '做家务整理房间', '和 TA 腻在一起', '自己各有安排'] },
  { id: 'q29', text: '给朋友介绍对方时你会说？', options: ['是我最重要的人', '是一个很特别的人', '你见了就知道', '就是普通 CP'] },
  { id: 'q30', text: '你觉得我们现在的感情？', options: ['越来越好', '需要更多努力', '很稳定刚刚好', '偶尔会担心'] }
]

// 抽 N 道不重复题
function pickQuestions(n = QUESTIONS_PER_SESSION) {
  const pool = QUESTION_BANK.slice()
  const picked = []
  const count = Math.min(n, pool.length)
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(idx, 1)[0])
  }
  return picked
}

// 找当前情侣的活跃会话（status=waiting）
async function findActiveSession(coupleId) {
  const res = await db.collection(COL.quizSessions)
    .where({ coupleId, status: 'waiting' })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
  return res.data[0] || null
}

// games.quiz.start → 开启新会话
// 如果已有活跃会话，返回该会话而非报错（幂等）
exports.start = async (event, wx) => {
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)

  const existing = await findActiveSession(coupleId)
  if (existing) {
    log('games.quiz.start:existing', { coupleId, sessionId: existing._id })
    return {
      sessionId: existing._id,
      questions: existing.questions,
      already: true
    }
  }

  const questions = pickQuestions()
  const now = db.serverDate()
  const add = await db.collection(COL.quizSessions).add({
    data: {
      coupleId,
      startedBy: wx.OPENID,
      questions,
      answers: {
        [wx.OPENID]: null,
        [partnerOpenid]: null
      },
      status: 'waiting',
      createdAt: now,
      updatedAt: now
    }
  })
  log('games.quiz.start', {
    coupleId,
    sessionId: add._id,
    startedBy: shortId(wx.OPENID),
    n: questions.length
  })
  return { sessionId: add._id, questions }
}

// games.quiz.current → 当前状态 { state, session?, result? }
// state: 'none' | 'mine-pending' | 'partner-pending' | 'closed'
exports.current = async (event, wx) => {
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)

  // 先找活跃会话
  const active = await findActiveSession(coupleId)
  if (active) {
    const myAnswers = active.answers[wx.OPENID]
    const partnerAnswers = active.answers[partnerOpenid]
    let state
    if (!myAnswers) state = 'mine-pending'
    else if (!partnerAnswers) state = 'partner-pending'
    else state = 'closed' // 理论上不会到这里，因为都答完会变 closed

    return {
      state,
      session: {
        _id: active._id,
        questions: active.questions,
        startedBy: active.startedBy,
        myAnswered: !!myAnswers,
        partnerAnswered: !!partnerAnswers
      }
    }
  }

  // 没有活跃会话，返回最近一次关闭的（用户可看历史结果）
  const latestClosed = await db.collection(COL.quizSessions)
    .where({ coupleId, status: 'closed' })
    .orderBy('closedAt', 'desc')
    .limit(1)
    .get()

  if (latestClosed.data.length) {
    const s = latestClosed.data[0]
    return {
      state: 'none',
      lastResult: buildResult(s, wx.OPENID, partnerOpenid)
    }
  }
  return { state: 'none' }
}

// games.quiz.submit({ sessionId, answers })
// answers: [0, 2, 1, 3, ...] 长度必须等于题数，元素 0-3
exports.submit = async (event, wx) => {
  const { sessionId, answers } = event
  if (!sessionId) throw new BizError('sessionId 必填')
  if (!Array.isArray(answers)) throw new BizError('answers 必须是数组')

  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)

  const res = await db.collection(COL.quizSessions).doc(sessionId).get().catch(() => null)
  if (!res || !res.data) throw new BizError('会话不存在', 404)
  const session = res.data
  if (session.coupleId !== coupleId) throw new BizError('无权操作', 403)
  if (session.status !== 'waiting') throw new BizError('会话已结束', 409)
  if (session.answers[wx.OPENID]) throw new BizError('你已经提交过了', 409)

  if (answers.length !== session.questions.length) {
    throw new BizError(`答案数量应为 ${session.questions.length}`)
  }
  for (const a of answers) {
    if (!Number.isInteger(a) || a < 0 || a > 3) {
      throw new BizError('答案索引必须在 0-3 之间')
    }
  }

  const now = db.serverDate()
  const partnerAnswers = session.answers[partnerOpenid]
  const bothDone = !!partnerAnswers

  if (!bothDone) {
    // 只更新我的答案，状态保持 waiting
    await db.collection(COL.quizSessions).doc(sessionId).update({
      data: {
        [`answers.${wx.OPENID}`]: answers,
        updatedAt: now
      }
    })
    log('games.quiz.submit:solo', {
      coupleId, sessionId,
      oid: shortId(wx.OPENID)
    })
    return { waitingForPartner: true }
  }

  // 双方都答完 → 结算
  const matchCount = computeMatches(answers, partnerAnswers)
  const total = session.questions.length
  const reward = matchCount >= HIGH_THRESHOLD ? REWARD_HIGH
    : matchCount >= MID_THRESHOLD ? REWARD_MID
    : REWARD_LOW

  await db.collection(COL.quizSessions).doc(sessionId).update({
    data: {
      [`answers.${wx.OPENID}`]: answers,
      status: 'closed',
      matchCount,
      total,
      reward,
      closedAt: now,
      updatedAt: now
    }
  })

  // 双方各加奖励积分（若有）
  if (reward > 0) {
    const reason = `情侣默契测试 ${matchCount}/${total}`
    await pointsLib.adjust(
      { delta: reward, reason, type: 'game', targetOpenid: wx.OPENID },
      wx
    )
    await pointsLib.adjust(
      { delta: reward, reason, type: 'game', targetOpenid: partnerOpenid },
      wx
    )
  }

  log('games.quiz.closed', {
    coupleId, sessionId, matchCount, total, reward
  })

  // 立即返回完整结果
  const updated = await db.collection(COL.quizSessions).doc(sessionId).get()
  return {
    closed: true,
    result: buildResult(updated.data, wx.OPENID, partnerOpenid)
  }
}

// games.quiz.cancel → 发起人在对方没答前可取消
exports.cancel = async (event, wx) => {
  const { sessionId } = event
  if (!sessionId) throw new BizError('sessionId 必填')
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)

  const res = await db.collection(COL.quizSessions).doc(sessionId).get().catch(() => null)
  if (!res || !res.data) throw new BizError('会话不存在', 404)
  const session = res.data
  if (session.coupleId !== coupleId) throw new BizError('无权操作', 403)
  if (session.status !== 'waiting') throw new BizError('会话已结束', 409)
  if (session.answers[partnerOpenid]) {
    throw new BizError('对方已经作答，不能取消', 409)
  }

  await db.collection(COL.quizSessions).doc(sessionId).update({
    data: {
      status: 'cancelled',
      cancelledBy: wx.OPENID,
      cancelledAt: db.serverDate()
    }
  })
  log('games.quiz.cancel', { coupleId, sessionId, by: shortId(wx.OPENID) })
  return { success: true }
}

// games.quiz.history → 历史测试结果（已关闭会话，最近 20 条）
exports.history = async (event, wx) => {
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)
  const res = await db.collection(COL.quizSessions)
    .where({ coupleId, status: 'closed' })
    .orderBy('closedAt', 'desc')
    .limit(20)
    .get()
  return {
    list: res.data.map(s => ({
      _id: s._id,
      matchCount: s.matchCount,
      total: s.total,
      reward: s.reward,
      closedAt: s.closedAt
    }))
  }
}

// --- 内部工具 ---

function computeMatches(a, b) {
  let count = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) count++
  }
  return count
}

// 组装结果对象：带双方答案 + 每题是否匹配
function buildResult(session, myOpenid, partnerOpenid) {
  const mine = session.answers[myOpenid] || []
  const partner = session.answers[partnerOpenid] || []
  const details = session.questions.map((q, i) => ({
    id: q.id,
    text: q.text,
    options: q.options,
    mine: mine[i],
    partner: partner[i],
    match: mine[i] === partner[i]
  }))
  return {
    sessionId: session._id,
    matchCount: session.matchCount || 0,
    total: session.total || session.questions.length,
    reward: session.reward || 0,
    closedAt: session.closedAt,
    details
  }
}
