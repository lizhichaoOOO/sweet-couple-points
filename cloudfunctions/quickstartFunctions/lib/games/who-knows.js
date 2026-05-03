// cloudfunctions/quickstartFunctions/lib/games/who-knows.js
// 谁更懂谁：6 道题，3 道关于 A、3 道关于 B
// subject 诚实作答，partner 猜 TA 会答什么
// 每猜中 1 道得 3 积分（积分分别发给各自的猜对方）
const { db, _, COL, BizError, requireCouple, log, shortId } = require('../common')
const pointsLib = require('../points')

const QUESTIONS_PER_SESSION = 6  // 3 关于 A + 3 关于 B
const POINTS_PER_CORRECT = 3

const QUESTION_BANK = [
  { id: 'w01', text: '最喜欢吃的是？',       options: ['米饭类', '面食类', '火锅烧烤', '西餐'] },
  { id: 'w02', text: '周末最想做？',         options: ['睡到自然醒', '出去玩', '宅家追剧', '和 TA 腻在一起'] },
  { id: 'w03', text: '最喜欢的颜色系？',     options: ['粉色系', '冷色系', '大地色', '黑白色'] },
  { id: 'w04', text: '学生时代最擅长？',     options: ['文科', '理科', '艺术', '体育'] },
  { id: 'w05', text: '最怕的是？',           options: ['黑', '高处', '虫子', '孤独'] },
  { id: 'w06', text: '吵架后会先？',         options: ['主动道歉', '冷处理', '装没事', '直接发火'] },
  { id: 'w07', text: '1 小时空闲时？',       options: ['刷手机', '补觉', '做爱好', '发呆'] },
  { id: 'w08', text: '最离不开的日用品？',   options: ['手机', '耳机', '护肤品', '游戏机'] },
  { id: 'w09', text: '最想去的旅行？',       options: ['海岛度假', '日本', '欧洲', '国内小众'] },
  { id: 'w10', text: '买东西的习惯？',       options: ['能省就省', '喜欢就买', '货比三家', '问对方再买'] },
  { id: 'w11', text: '理想的早餐？',         options: ['粥油条', '面包咖啡', '麦片酸奶', '不吃早餐'] },
  { id: 'w12', text: '心情不好时希望对方？', options: ['安慰说话', '陪着不说话', '抱抱', '让 TA 静静'] },
  { id: 'w13', text: '最讨厌的约会场景？',   options: ['逛街', '看电影', '吃饭', '景点人多'] },
  { id: 'w14', text: '最想收到的礼物？',     options: ['花', '手写卡片', '想要的东西', '一顿好的'] },
  { id: 'w15', text: '养宠物会选？',         options: ['猫', '狗', '不养', '看情况'] },
  { id: 'w16', text: '生气时的表现？',       options: ['闷不吭声', '直接怼', '摔东西发脾气', '自己哭'] },
  { id: 'w17', text: '最喜欢对方什么？',     options: ['颜值', '性格', '相处感觉', '靠谱体贴'] },
  { id: 'w18', text: '减压方式？',           options: ['吃东西', '运动', '刷剧', '睡觉'] },
  { id: 'w19', text: '最在意的节日？',       options: ['生日', '纪念日', '情人节', '春节'] },
  { id: 'w20', text: '一个月最开心是？',     options: ['发工资', '周末', '约会', '见朋友'] },
  { id: 'w21', text: '最常用的 App？',       options: ['微信', '抖音', '小红书', 'B 站'] },
  { id: 'w22', text: '喝水习惯？',           options: ['多喝温水', '爱冰的', '以咖啡代', '不主动喝'] },
  { id: 'w23', text: '睡前最后做什么？',     options: ['刷手机', '看书', '聊天', '倒头就睡'] },
  { id: 'w24', text: '遇到困难时？',         options: ['自己扛', '找对方倾诉', '找家人', '假装没事'] }
]

// 抽 6 题，3 关于 A 3 关于 B（subject 依 A/B 轮换）
function pickQuestions(aOpenid, bOpenid) {
  const pool = QUESTION_BANK.slice()
  const n = QUESTIONS_PER_SESSION
  const picked = []
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    const q = pool.splice(idx, 1)[0]
    picked.push({
      ...q,
      subject: i % 2 === 0 ? aOpenid : bOpenid  // 交错分配 subject
    })
  }
  // 打乱顺序，让 subject 随机出现
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[picked[i], picked[j]] = [picked[j], picked[i]]
  }
  return picked
}

async function findActiveSession(coupleId) {
  const res = await db.collection(COL.whoKnowsSessions)
    .where({ coupleId, status: 'waiting' })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
  return res.data[0] || null
}

// games.whoKnows.start
exports.start = async (event, wx) => {
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)
  const existing = await findActiveSession(coupleId)
  if (existing) {
    return { sessionId: existing._id, questions: existing.questions, already: true }
  }

  const questions = pickQuestions(wx.OPENID, partnerOpenid)
  const now = db.serverDate()
  const add = await db.collection(COL.whoKnowsSessions).add({
    data: {
      coupleId,
      startedBy: wx.OPENID,
      questions,
      answers: { [wx.OPENID]: null, [partnerOpenid]: null },
      status: 'waiting',
      createdAt: now,
      updatedAt: now
    }
  })
  log('games.whoKnows.start', {
    coupleId, sessionId: add._id, startedBy: shortId(wx.OPENID)
  })
  return { sessionId: add._id, questions }
}

// games.whoKnows.current
exports.current = async (event, wx) => {
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)
  const active = await findActiveSession(coupleId)

  if (active) {
    const myAns = active.answers[wx.OPENID]
    const partnerAns = active.answers[partnerOpenid]
    const state = !myAns ? 'mine-pending' : !partnerAns ? 'partner-pending' : 'closed'
    return {
      state,
      session: {
        _id: active._id,
        questions: active.questions,
        myAnswered: !!myAns,
        partnerAnswered: !!partnerAns
      }
    }
  }

  // 最近一次关闭的
  const latestClosed = await db.collection(COL.whoKnowsSessions)
    .where({ coupleId, status: 'closed' })
    .orderBy('closedAt', 'desc')
    .limit(1)
    .get()

  if (latestClosed.data.length) {
    return {
      state: 'none',
      lastResult: buildResult(latestClosed.data[0], wx.OPENID, partnerOpenid)
    }
  }
  return { state: 'none' }
}

// games.whoKnows.submit({ sessionId, answers })
// answers: [0, 2, 1, 3, 0, 2] 长度等于题数
exports.submit = async (event, wx) => {
  const { sessionId, answers } = event
  if (!sessionId) throw new BizError('sessionId 必填')
  if (!Array.isArray(answers)) throw new BizError('answers 必须是数组')

  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)
  const res = await db.collection(COL.whoKnowsSessions).doc(sessionId).get().catch(() => null)
  if (!res || !res.data) throw new BizError('会话不存在', 404)
  const s = res.data
  if (s.coupleId !== coupleId) throw new BizError('无权操作', 403)
  if (s.status !== 'waiting') throw new BizError('会话已结束', 409)
  if (s.answers[wx.OPENID]) throw new BizError('你已经提交过了', 409)
  if (answers.length !== s.questions.length) {
    throw new BizError(`答案数量应为 ${s.questions.length}`)
  }
  for (const a of answers) {
    if (!Number.isInteger(a) || a < 0 || a > 3) {
      throw new BizError('答案索引必须在 0-3 之间')
    }
  }

  const now = db.serverDate()
  const partnerAns = s.answers[partnerOpenid]

  if (!partnerAns) {
    await db.collection(COL.whoKnowsSessions).doc(sessionId).update({
      data: {
        [`answers.${wx.OPENID}`]: answers,
        updatedAt: now
      }
    })
    return { waitingForPartner: true }
  }

  // 双方都答完 → 结算
  // 每题 subject 是其中一方；另一方的答案若与 subject 相同，则"另一方"得分
  const meKnowsTa = { correct: 0, total: 0 }  // 我对 TA 的了解（TA 是 subject 的题）
  const taKnowsMe = { correct: 0, total: 0 }  // TA 对我的了解（我是 subject 的题）

  s.questions.forEach((q, i) => {
    if (q.subject === wx.OPENID) {
      // 这题关于我：我诚实作答（answers[i]），TA 的 partnerAns[i] 是猜我的
      taKnowsMe.total++
      if (partnerAns[i] === answers[i]) taKnowsMe.correct++
    } else {
      // 这题关于 TA：TA 的 partnerAns[i] 是诚实作答，我的 answers[i] 是猜 TA
      meKnowsTa.total++
      if (answers[i] === partnerAns[i]) meKnowsTa.correct++
    }
  })

  const myReward = meKnowsTa.correct * POINTS_PER_CORRECT
  const partnerReward = taKnowsMe.correct * POINTS_PER_CORRECT

  await db.collection(COL.whoKnowsSessions).doc(sessionId).update({
    data: {
      [`answers.${wx.OPENID}`]: answers,
      status: 'closed',
      meKnowsTa,      // 临时用 key，实际语义对 A 来说是 A 对 B 的了解
      taKnowsMe,
      scoresByOpenid: {
        [wx.OPENID]: meKnowsTa.correct,
        [partnerOpenid]: taKnowsMe.correct
      },
      closedAt: now,
      updatedAt: now
    }
  })

  // 发积分
  if (myReward > 0) {
    await pointsLib.adjust(
      { delta: myReward, reason: `谁更懂谁-${meKnowsTa.correct}/${meKnowsTa.total}`, type: 'game', targetOpenid: wx.OPENID },
      { OPENID: wx.OPENID }
    )
  }
  if (partnerReward > 0) {
    await pointsLib.adjust(
      { delta: partnerReward, reason: `谁更懂谁-${taKnowsMe.correct}/${taKnowsMe.total}`, type: 'game', targetOpenid: partnerOpenid },
      { OPENID: partnerOpenid }
    )
  }

  log('games.whoKnows.closed', {
    coupleId, sessionId,
    meKnowsTa: `${meKnowsTa.correct}/${meKnowsTa.total}`,
    taKnowsMe: `${taKnowsMe.correct}/${taKnowsMe.total}`
  })

  const refreshed = await db.collection(COL.whoKnowsSessions).doc(sessionId).get()
  return {
    closed: true,
    result: buildResult(refreshed.data, wx.OPENID, partnerOpenid)
  }
}

// games.whoKnows.cancel
exports.cancel = async (event, wx) => {
  const { sessionId } = event
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)

  const res = await db.collection(COL.whoKnowsSessions).doc(sessionId).get().catch(() => null)
  if (!res || !res.data) throw new BizError('会话不存在', 404)
  const s = res.data
  if (s.coupleId !== coupleId) throw new BizError('无权操作', 403)
  if (s.status !== 'waiting') throw new BizError('会话已结束', 409)
  if (s.answers[partnerOpenid]) throw new BizError('对方已答，不能取消', 409)

  await db.collection(COL.whoKnowsSessions).doc(sessionId).update({
    data: { status: 'cancelled', cancelledAt: db.serverDate() }
  })
  return { success: true }
}

exports.history = async (event, wx) => {
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)
  const res = await db.collection(COL.whoKnowsSessions)
    .where({ coupleId, status: 'closed' })
    .orderBy('closedAt', 'desc')
    .limit(20)
    .get()
  return {
    list: res.data.map(s => ({
      _id: s._id,
      myScore: (s.scoresByOpenid || {})[wx.OPENID] || 0,
      partnerScore: (s.scoresByOpenid || {})[partnerOpenid] || 0,
      closedAt: s.closedAt
    }))
  }
}

function buildResult(s, myOpenid, partnerOpenid) {
  const myAns = s.answers[myOpenid] || []
  const partnerAns = s.answers[partnerOpenid] || []

  const details = s.questions.map((q, i) => {
    const iAmSubject = q.subject === myOpenid
    const truthAns = iAmSubject ? myAns[i] : partnerAns[i]
    const guessAns = iAmSubject ? partnerAns[i] : myAns[i]
    return {
      id: q.id,
      text: q.text,
      options: q.options,
      subjectIsMe: iAmSubject,
      truthAns,
      guessAns,
      match: truthAns === guessAns
    }
  })

  const scores = s.scoresByOpenid || {}
  const myKnowsPartner = scores[myOpenid] || 0
  const partnerKnowsMe = scores[partnerOpenid] || 0
  const myTotal = details.filter(d => !d.subjectIsMe).length
  const partnerTotal = details.filter(d => d.subjectIsMe).length

  return {
    sessionId: s._id,
    details,
    myKnowsPartner,
    myKnowsTotal: myTotal,
    partnerKnowsMe,
    partnerKnowsMeTotal: partnerTotal,
    myReward: myKnowsPartner * POINTS_PER_CORRECT,
    partnerReward: partnerKnowsMe * POINTS_PER_CORRECT,
    closedAt: s.closedAt
  }
}
