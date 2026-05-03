// cloudfunctions/quickstartFunctions/lib/games/drawing.js
// 你画我猜：画家抽词绘画，对方看画输入猜测，画家判断对错
const { db, _, COL, BizError, requireCouple, log, shortId } = require('../common')
const pointsLib = require('../points')

const REWARD_CORRECT = 5

// 词库：简单可画的物品 / 场景
const WORDS = [
  '太阳', '月亮', '星星', '爱心', '玫瑰花',
  '戒指', '蛋糕', '奶茶', '咖啡', '热气球',
  '彩虹', '烟花', '樱花', '棒棒糖', '甜甜圈',
  '火锅', '巧克力', '钻石', '蝴蝶', '小船',
  '云朵', '雨伞', '帽子', '眼镜', '袜子',
  '围巾', '笔记本', '笔', '气球', '礼物盒',
  '风车', '小鸭子', '小猫', '小狗', '苹果',
  '香蕉', '冰激凌', '蜡烛', '闹钟', '钥匙',
  '信封', '锁', '自行车', '吉他', '草莓'
]

function randomWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)]
}

async function findActiveSession(coupleId) {
  const res = await db.collection(COL.drawingSessions)
    .where({ coupleId, status: _.in(['drawing', 'guessing', 'judging']) })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
  return res.data[0] || null
}

// games.drawing.start — 创建对局，startedBy 是画家
exports.start = async (event, wx) => {
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)
  const existing = await findActiveSession(coupleId)
  if (existing) {
    // 幂等：返回已有会话
    return { sessionId: existing._id, already: true }
  }
  const word = randomWord()
  const now = db.serverDate()
  const add = await db.collection(COL.drawingSessions).add({
    data: {
      coupleId,
      drawer: wx.OPENID,        // 画家 = 发起人
      guesser: partnerOpenid,   // 猜的人 = 对方
      word,                     // 秘密，只返回给画家
      fileID: null,             // 画作的云存储 ID
      guess: '',
      correct: null,
      status: 'drawing',
      createdAt: now,
      updatedAt: now
    }
  })
  log('games.drawing.start', {
    coupleId, sessionId: add._id,
    drawer: shortId(wx.OPENID), word
  })
  return { sessionId: add._id, word }
}

// games.drawing.current — 根据身份和阶段返回不同视角
exports.current = async (event, wx) => {
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)
  const active = await findActiveSession(coupleId)
  if (active) {
    return projectForMe(active, wx.OPENID)
  }

  const latestClosed = await db.collection(COL.drawingSessions)
    .where({ coupleId, status: 'closed' })
    .orderBy('closedAt', 'desc')
    .limit(1)
    .get()
  if (latestClosed.data.length) {
    return {
      state: 'none',
      lastResult: buildResult(latestClosed.data[0], wx.OPENID)
    }
  }
  return { state: 'none' }
}

// games.drawing.submitDrawing({ sessionId, fileID })
exports.submitDrawing = async (event, wx) => {
  const { sessionId, fileID } = event
  if (!sessionId || !fileID) throw new BizError('sessionId / fileID 必填')
  const { coupleId } = await requireCouple(wx.OPENID)

  const res = await db.collection(COL.drawingSessions).doc(sessionId).get().catch(() => null)
  if (!res || !res.data) throw new BizError('会话不存在', 404)
  const s = res.data
  if (s.coupleId !== coupleId) throw new BizError('无权操作', 403)
  if (s.drawer !== wx.OPENID) throw new BizError('你不是画家', 403)
  if (s.status !== 'drawing') throw new BizError('当前不是画画阶段', 409)

  await db.collection(COL.drawingSessions).doc(sessionId).update({
    data: {
      fileID,
      status: 'guessing',
      updatedAt: db.serverDate()
    }
  })
  log('games.drawing.submitDrawing', {
    sessionId, drawer: shortId(wx.OPENID), fileID
  })
  return { success: true }
}

// games.drawing.submitGuess({ sessionId, guess })
exports.submitGuess = async (event, wx) => {
  const { sessionId, guess } = event
  if (!sessionId) throw new BizError('sessionId 必填')
  if (!guess || typeof guess !== 'string') throw new BizError('请输入猜测')
  const trimmed = guess.trim()
  if (!trimmed) throw new BizError('猜测不能为空')
  if (trimmed.length > 20) throw new BizError('猜测过长')

  const { coupleId } = await requireCouple(wx.OPENID)
  const res = await db.collection(COL.drawingSessions).doc(sessionId).get().catch(() => null)
  if (!res || !res.data) throw new BizError('会话不存在', 404)
  const s = res.data
  if (s.coupleId !== coupleId) throw new BizError('无权操作', 403)
  if (s.guesser !== wx.OPENID) throw new BizError('你不是猜的人', 403)
  if (s.status !== 'guessing') throw new BizError('当前不是猜词阶段', 409)

  // 精确匹配 → 直接判对；否则进 judging 让画家判
  const exactMatch = trimmed === s.word
  const updateData = {
    guess: trimmed,
    updatedAt: db.serverDate()
  }

  if (exactMatch) {
    updateData.correct = true
    updateData.status = 'closed'
    updateData.closedAt = db.serverDate()
  } else {
    updateData.status = 'judging'
  }

  await db.collection(COL.drawingSessions).doc(sessionId).update({ data: updateData })

  if (exactMatch) {
    await grantPointsForCorrect(s, s.drawer, s.guesser)
    log('games.drawing.exactMatch', { sessionId, guess: trimmed, word: s.word })
    const refreshed = await db.collection(COL.drawingSessions).doc(sessionId).get()
    return { exactMatch: true, closed: true, result: buildResult(refreshed.data, wx.OPENID) }
  }

  log('games.drawing.submitGuess', { sessionId, guess: trimmed })
  return { exactMatch: false, waitingForJudge: true }
}

// games.drawing.judge({ sessionId, correct })  — 画家判定
exports.judge = async (event, wx) => {
  const { sessionId, correct } = event
  if (!sessionId) throw new BizError('sessionId 必填')
  if (typeof correct !== 'boolean') throw new BizError('correct 必须是 boolean')
  const { coupleId } = await requireCouple(wx.OPENID)

  const res = await db.collection(COL.drawingSessions).doc(sessionId).get().catch(() => null)
  if (!res || !res.data) throw new BizError('会话不存在', 404)
  const s = res.data
  if (s.coupleId !== coupleId) throw new BizError('无权操作', 403)
  if (s.drawer !== wx.OPENID) throw new BizError('只有画家能判定', 403)
  if (s.status !== 'judging') throw new BizError('当前不是判定阶段', 409)

  const now = db.serverDate()
  await db.collection(COL.drawingSessions).doc(sessionId).update({
    data: {
      correct,
      status: 'closed',
      closedAt: now,
      updatedAt: now
    }
  })

  if (correct) {
    await grantPointsForCorrect(s, s.drawer, s.guesser)
  }

  log('games.drawing.judged', {
    sessionId, correct, guess: s.guess, word: s.word
  })

  const refreshed = await db.collection(COL.drawingSessions).doc(sessionId).get()
  return { success: true, result: buildResult(refreshed.data, wx.OPENID) }
}

// games.drawing.cancel
exports.cancel = async (event, wx) => {
  const { sessionId } = event
  const { coupleId } = await requireCouple(wx.OPENID)
  const res = await db.collection(COL.drawingSessions).doc(sessionId).get().catch(() => null)
  if (!res || !res.data) throw new BizError('会话不存在', 404)
  const s = res.data
  if (s.coupleId !== coupleId) throw new BizError('无权操作', 403)
  if (!['drawing', 'guessing'].includes(s.status)) {
    throw new BizError('当前阶段不能取消', 409)
  }
  // 只有发起人可以取消
  if (s.drawer !== wx.OPENID) throw new BizError('只有画家能取消', 403)

  await db.collection(COL.drawingSessions).doc(sessionId).update({
    data: { status: 'cancelled', cancelledAt: db.serverDate() }
  })
  return { success: true }
}

exports.history = async (event, wx) => {
  const { coupleId } = await requireCouple(wx.OPENID)
  const res = await db.collection(COL.drawingSessions)
    .where({ coupleId, status: 'closed' })
    .orderBy('closedAt', 'desc')
    .limit(20)
    .get()
  return {
    list: res.data.map(s => ({
      _id: s._id,
      word: s.word,
      guess: s.guess,
      correct: s.correct,
      closedAt: s.closedAt
    }))
  }
}

// --- 内部 ---

async function grantPointsForCorrect(s, drawerOpenid, guesserOpenid) {
  // 双方各 +5
  await pointsLib.adjust(
    { delta: REWARD_CORRECT, reason: '你画我猜-猜对', type: 'game', targetOpenid: drawerOpenid },
    { OPENID: drawerOpenid }
  )
  await pointsLib.adjust(
    { delta: REWARD_CORRECT, reason: '你画我猜-猜对', type: 'game', targetOpenid: guesserOpenid },
    { OPENID: guesserOpenid }
  )
}

function projectForMe(s, myOpenid) {
  const isDrawer = s.drawer === myOpenid
  const isGuesser = s.guesser === myOpenid

  let state
  if (s.status === 'drawing') {
    state = isDrawer ? 'draw-turn' : 'waiting-draw'
  } else if (s.status === 'guessing') {
    state = isGuesser ? 'guess-turn' : 'waiting-guess'
  } else if (s.status === 'judging') {
    state = isDrawer ? 'judge-turn' : 'waiting-judge'
  }

  return {
    state,
    session: {
      _id: s._id,
      isDrawer,
      isGuesser,
      word: isDrawer ? s.word : null,    // 词只返回给画家
      fileID: s.fileID,
      guess: s.guess,
      status: s.status
    }
  }
}

function buildResult(s, myOpenid) {
  const isDrawer = s.drawer === myOpenid
  return {
    sessionId: s._id,
    word: s.word,
    guess: s.guess,
    correct: s.correct,
    fileID: s.fileID,
    iWasDrawer: isDrawer,
    reward: s.correct ? REWARD_CORRECT : 0,
    closedAt: s.closedAt
  }
}
