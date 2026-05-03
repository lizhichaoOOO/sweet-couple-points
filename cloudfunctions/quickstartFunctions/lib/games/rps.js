// cloudfunctions/quickstartFunctions/lib/games/rps.js
// 石头剪刀布（5 个变体）：classic / xlq / num / twohand / dice
// 异步会话：两人独立出手 → 后端结算 → 胜负 ±5 积分
const { db, _, COL, BizError, requireCouple, log, shortId } = require('../common')
const pointsLib = require('../points')

const REWARD = 5

// ============ 变体定义 ============

const VARIANTS = {
  classic: {
    name: '石头剪刀布',
    desc: '经典三选一',
    emoji: '✊✌️✋',
    choices: ['rock', 'paper', 'scissors']
  },
  xlq: {
    name: '小人老虎枪',
    desc: '老虎吃小人，小人拿枪，枪打老虎',
    emoji: '🧍🐯🔫',
    choices: ['person', 'tiger', 'gun']
  },
  num: {
    name: '十五二十',
    desc: '猜总数，出手数，猜中者胜',
    emoji: '🔢',
    guesses: [0, 5, 10, 15, 20],
    values: [0, 5, 10]
  },
  twohand: {
    name: '双手石头剪刀布',
    desc: '先出两只手，再选保留哪只',
    emoji: '🤜🤛',
    choices: ['rock', 'paper', 'scissors'],
    rounds: 2
  },
  dice: {
    name: '筛子大小',
    desc: '各摇 3 颗，和大者胜',
    emoji: '🎲',
    diceCount: 3
  }
}

exports.listVariants = async () => {
  return Object.keys(VARIANTS).map(key => ({
    key,
    ...VARIANTS[key],
    reward: REWARD
  }))
}

// ============ 验证器（把前端传来的 move 做校验） ============

function validateMove(variant, move) {
  if (!move || typeof move !== 'object') throw new BizError('move 必填')
  switch (variant) {
    case 'classic':
    case 'xlq': {
      const choices = VARIANTS[variant].choices
      if (!choices.includes(move.choice)) {
        throw new BizError(`choice 必须是 ${choices.join('/')}`)
      }
      return { choice: move.choice }
    }
    case 'num': {
      const g = Number(move.guess), v = Number(move.value)
      if (!VARIANTS.num.guesses.includes(g)) {
        throw new BizError('guess 必须是 0/5/10/15/20')
      }
      if (!VARIANTS.num.values.includes(v)) {
        throw new BizError('value 必须是 0/5/10')
      }
      return { guess: g, value: v }
    }
    case 'twohand': {
      if (!Array.isArray(move.hands) || move.hands.length !== 2) {
        throw new BizError('必须选择 2 只手')
      }
      const choices = VARIANTS.twohand.choices
      for (const h of move.hands) {
        if (!choices.includes(h)) throw new BizError('hand 值非法')
      }
      return { hands: move.hands }
    }
    case 'dice': {
      // dice 不接受前端数据，服务端摇
      const diceCount = VARIANTS.dice.diceCount
      const dice = []
      for (let i = 0; i < diceCount; i++) {
        dice.push(1 + Math.floor(Math.random() * 6))
      }
      return { dice }
    }
    default:
      throw new BizError('未知变体: ' + variant)
  }
}

// ============ 判胜（classic/xlq/twohand 共用 RPS 规则） ============

// 标准 RPS 循环规则：A 是否打败 B
// rock > scissors > paper > rock
// 小人老虎枪同构：gun > tiger > person > gun
const RPS_BEATS = {
  rock: 'scissors', scissors: 'paper', paper: 'rock',
  gun: 'tiger', tiger: 'person', person: 'gun'
}

function compareRPS(a, b) {
  if (a === b) return 0
  if (RPS_BEATS[a] === b) return 1
  return -1
}

// ============ 结算（返回 {winner, details}） ============
// winner: 'A' | 'B' | 'draw'，A 代表 aOpenid，B 代表 bOpenid

function resolveWinner(variant, aMove, bMove, keepA, keepB) {
  switch (variant) {
    case 'classic':
    case 'xlq': {
      const r = compareRPS(aMove.choice, bMove.choice)
      return {
        winner: r === 0 ? 'draw' : r > 0 ? 'A' : 'B',
        details: { aChoice: aMove.choice, bChoice: bMove.choice }
      }
    }
    case 'num': {
      const total = aMove.value + bMove.value
      const aHit = aMove.guess === total
      const bHit = bMove.guess === total
      let winner = 'draw'
      if (aHit && !bHit) winner = 'A'
      else if (bHit && !aHit) winner = 'B'
      return {
        winner,
        details: {
          aGuess: aMove.guess, aValue: aMove.value,
          bGuess: bMove.guess, bValue: bMove.value,
          total, aHit, bHit
        }
      }
    }
    case 'twohand': {
      if (!keepA || !aMove.hands.includes(keepA)) {
        throw new BizError('A 保留的手不在已出的两只手中')
      }
      if (!keepB || !bMove.hands.includes(keepB)) {
        throw new BizError('B 保留的手不在已出的两只手中')
      }
      const r = compareRPS(keepA, keepB)
      return {
        winner: r === 0 ? 'draw' : r > 0 ? 'A' : 'B',
        details: {
          aHands: aMove.hands, bHands: bMove.hands,
          aKept: keepA, bKept: keepB
        }
      }
    }
    case 'dice': {
      const aSum = aMove.dice.reduce((s, n) => s + n, 0)
      const bSum = bMove.dice.reduce((s, n) => s + n, 0)
      let winner = 'draw'
      if (aSum > bSum) winner = 'A'
      else if (bSum > aSum) winner = 'B'
      return {
        winner,
        details: {
          aDice: aMove.dice, bDice: bMove.dice,
          aSum, bSum
        }
      }
    }
    default:
      throw new BizError('未知变体')
  }
}

// ============ 辅助：找活跃 session ============

async function findActiveSession(coupleId) {
  const res = await db.collection(COL.rpsSessions)
    .where({ coupleId, status: _.in(['await-move', 'await-keep']) })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
  return res.data[0] || null
}

// ============ actions ============

// games.rps.start({ variant })
exports.start = async (event, wx) => {
  const variant = event.variant
  if (!VARIANTS[variant]) throw new BizError('variant 非法')

  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)

  // 幂等：已存在活跃会话就返回
  const existing = await findActiveSession(coupleId)
  if (existing) {
    return { sessionId: existing._id, variant: existing.variant, already: true }
  }

  const now = db.serverDate()
  const add = await db.collection(COL.rpsSessions).add({
    data: {
      coupleId,
      variant,
      startedBy: wx.OPENID,
      moves: { [wx.OPENID]: null, [partnerOpenid]: null },
      keeps: variant === 'twohand'
        ? { [wx.OPENID]: null, [partnerOpenid]: null }
        : null,
      status: 'await-move',
      createdAt: now,
      updatedAt: now
    }
  })
  log('games.rps.start', {
    coupleId, sessionId: add._id, variant,
    startedBy: shortId(wx.OPENID)
  })
  return { sessionId: add._id, variant }
}

// games.rps.current → 当前会话状态
exports.current = async (event, wx) => {
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)
  const active = await findActiveSession(coupleId)

  if (active) {
    const myMove = active.moves[wx.OPENID]
    const partnerMove = active.moves[partnerOpenid]
    const myKeep = active.keeps ? active.keeps[wx.OPENID] : null
    const partnerKeep = active.keeps ? active.keeps[partnerOpenid] : null

    let state
    if (active.status === 'await-move') {
      if (!myMove) state = 'await-my-move'
      else state = 'await-partner-move'
    } else if (active.status === 'await-keep') {
      if (!myKeep) state = 'await-my-keep'
      else state = 'await-partner-keep'
    }

    // 双方 move 都有了 → 前端可以看到对方的 hands（只给 twohand 场景）
    const shouldShowPartnerHands = active.status === 'await-keep'

    return {
      state,
      session: {
        _id: active._id,
        variant: active.variant,
        status: active.status,
        startedBy: active.startedBy,
        myMove,
        partnerMove: shouldShowPartnerHands ? partnerMove : null,
        myKeep,
        partnerAnswered: !!partnerMove,
        partnerKept: !!partnerKeep
      },
      variantInfo: VARIANTS[active.variant]
    }
  }

  // 取最近一次关闭的作为历史展示
  const latestClosed = await db.collection(COL.rpsSessions)
    .where({ coupleId, status: 'closed' })
    .orderBy('closedAt', 'desc')
    .limit(1)
    .get()

  if (latestClosed.data.length) {
    const s = latestClosed.data[0]
    return {
      state: 'none',
      lastResult: buildResultView(s, wx.OPENID, partnerOpenid)
    }
  }
  return { state: 'none' }
}

// games.rps.submitMove({ sessionId, move })
exports.submitMove = async (event, wx) => {
  const { sessionId, move } = event
  if (!sessionId) throw new BizError('sessionId 必填')
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)

  const res = await db.collection(COL.rpsSessions).doc(sessionId).get().catch(() => null)
  if (!res || !res.data) throw new BizError('会话不存在', 404)
  const s = res.data
  if (s.coupleId !== coupleId) throw new BizError('无权操作', 403)
  if (s.status !== 'await-move') throw new BizError('当前阶段不接受出手', 409)
  if (s.moves[wx.OPENID]) throw new BizError('你已经出过手了', 409)

  const normalized = validateMove(s.variant, move)

  const partnerMove = s.moves[partnerOpenid]
  const bothDone = !!partnerMove

  if (!bothDone) {
    // 只保存我的 move
    await db.collection(COL.rpsSessions).doc(sessionId).update({
      data: {
        [`moves.${wx.OPENID}`]: normalized,
        updatedAt: db.serverDate()
      }
    })
    log('games.rps.submitMove:solo', {
      coupleId, sessionId, variant: s.variant,
      oid: shortId(wx.OPENID)
    })
    return { waitingForPartner: true, myMove: normalized }
  }

  // 对方已出 → 推进阶段
  if (s.variant === 'twohand') {
    // 进入保留手阶段
    await db.collection(COL.rpsSessions).doc(sessionId).update({
      data: {
        [`moves.${wx.OPENID}`]: normalized,
        status: 'await-keep',
        updatedAt: db.serverDate()
      }
    })
    log('games.rps.enterKeepStage', { coupleId, sessionId })
    return {
      nextStage: 'await-keep',
      myMove: normalized,
      partnerMove
    }
  }

  // 其他变体：双方都出了 → 立即结算
  await db.collection(COL.rpsSessions).doc(sessionId).update({
    data: {
      [`moves.${wx.OPENID}`]: normalized,
      updatedAt: db.serverDate()
    }
  })
  const result = await closeSession(sessionId, s.startedBy, partnerFor(s, s.startedBy), wx.OPENID)
  return { closed: true, result }
}

// games.rps.submitKeep({ sessionId, keep })  — 仅 twohand
exports.submitKeep = async (event, wx) => {
  const { sessionId, keep } = event
  if (!sessionId) throw new BizError('sessionId 必填')
  if (!keep) throw new BizError('keep 必填')
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)

  const res = await db.collection(COL.rpsSessions).doc(sessionId).get().catch(() => null)
  if (!res || !res.data) throw new BizError('会话不存在', 404)
  const s = res.data
  if (s.coupleId !== coupleId) throw new BizError('无权操作', 403)
  if (s.variant !== 'twohand') throw new BizError('该变体不需要保留手', 400)
  if (s.status !== 'await-keep') throw new BizError('当前阶段不接受保留操作', 409)
  if (s.keeps && s.keeps[wx.OPENID]) throw new BizError('你已经选择过了', 409)

  const myHands = s.moves[wx.OPENID].hands
  if (!myHands.includes(keep)) {
    throw new BizError('保留的手必须是你刚刚出的两只手之一')
  }

  const partnerKept = s.keeps && s.keeps[partnerOpenid]
  if (!partnerKept) {
    // 等对方
    await db.collection(COL.rpsSessions).doc(sessionId).update({
      data: {
        [`keeps.${wx.OPENID}`]: keep,
        updatedAt: db.serverDate()
      }
    })
    return { waitingForPartner: true }
  }

  // 双方都选完了 → 结算
  await db.collection(COL.rpsSessions).doc(sessionId).update({
    data: {
      [`keeps.${wx.OPENID}`]: keep,
      updatedAt: db.serverDate()
    }
  })
  const result = await closeSession(sessionId, s.startedBy, partnerFor(s, s.startedBy), wx.OPENID)
  return { closed: true, result }
}

// games.rps.cancel
exports.cancel = async (event, wx) => {
  const { sessionId } = event
  if (!sessionId) throw new BizError('sessionId 必填')
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)

  const res = await db.collection(COL.rpsSessions).doc(sessionId).get().catch(() => null)
  if (!res || !res.data) throw new BizError('会话不存在', 404)
  const s = res.data
  if (s.coupleId !== coupleId) throw new BizError('无权操作', 403)
  if (!['await-move', 'await-keep'].includes(s.status)) {
    throw new BizError('会话已结束', 409)
  }
  if (s.moves[partnerOpenid] || (s.keeps && s.keeps[partnerOpenid])) {
    throw new BizError('对方已参与，不能取消', 409)
  }

  await db.collection(COL.rpsSessions).doc(sessionId).update({
    data: {
      status: 'cancelled',
      cancelledAt: db.serverDate()
    }
  })
  return { success: true }
}

// games.rps.history
exports.history = async (event, wx) => {
  const { coupleId } = await requireCouple(wx.OPENID)
  const res = await db.collection(COL.rpsSessions)
    .where({ coupleId, status: 'closed' })
    .orderBy('closedAt', 'desc')
    .limit(20)
    .get()
  return {
    list: res.data.map(s => ({
      _id: s._id,
      variant: s.variant,
      winnerOpenid: s.winnerOpenid,
      closedAt: s.closedAt
    }))
  }
}

// ============ 内部：结算 ============

async function closeSession(sessionId, aOpenid, bOpenid, callerOpenid) {
  // 重新拉取最新 session（move/keep 都刚更新）
  const res = await db.collection(COL.rpsSessions).doc(sessionId).get()
  const s = res.data
  const aMove = s.moves[aOpenid]
  const bMove = s.moves[bOpenid]
  const aKeep = s.keeps ? s.keeps[aOpenid] : null
  const bKeep = s.keeps ? s.keeps[bOpenid] : null

  const { winner, details } = resolveWinner(s.variant, aMove, bMove, aKeep, bKeep)

  const winnerOpenid = winner === 'A' ? aOpenid : winner === 'B' ? bOpenid : ''
  const loserOpenid = winner === 'A' ? bOpenid : winner === 'B' ? aOpenid : ''

  const now = db.serverDate()
  await db.collection(COL.rpsSessions).doc(sessionId).update({
    data: {
      status: 'closed',
      winner, // 'A' / 'B' / 'draw'
      winnerOpenid,
      details,
      reward: winner === 'draw' ? 0 : REWARD,
      closedAt: now,
      updatedAt: now
    }
  })

  // 加分 / 扣分
  if (winner !== 'draw') {
    const variantName = VARIANTS[s.variant].name
    await pointsLib.adjust(
      {
        delta: REWARD,
        reason: `${variantName}-胜利`,
        type: 'game',
        targetOpenid: winnerOpenid
      },
      { OPENID: winnerOpenid }
    )
    try {
      await pointsLib.adjust(
        {
          delta: -REWARD,
          reason: `${variantName}-失败`,
          type: 'game',
          targetOpenid: loserOpenid
        },
        { OPENID: loserOpenid }
      )
    } catch (e) {
      log('rps.loserDeductSkipped', {
        sessionId, loserOpenid: shortId(loserOpenid), reason: e.message
      })
    }
  }

  log('games.rps.closed', {
    sessionId, variant: s.variant, winner,
    winnerOpenid: shortId(winnerOpenid)
  })

  // 从 callerOpenid 的视角返回结果
  const myOpenid = callerOpenid || aOpenid
  const partnerOpenid = myOpenid === aOpenid ? bOpenid : aOpenid
  return buildResultView(
    { ...s, winner, winnerOpenid, details, reward: winner === 'draw' ? 0 : REWARD, closedAt: now },
    myOpenid,
    partnerOpenid
  )
}

function partnerFor(session, openid) {
  return Object.keys(session.moves).find(o => o !== openid) || ''
}

function buildResultView(session, myOpenid, partnerOpenid) {
  const myMove = session.moves ? session.moves[myOpenid] : null
  const partnerMove = session.moves ? session.moves[partnerOpenid] : null
  const myKeep = session.keeps ? session.keeps[myOpenid] : null
  const partnerKeep = session.keeps ? session.keeps[partnerOpenid] : null

  let outcome = 'draw'
  if (session.winnerOpenid === myOpenid) outcome = 'win'
  else if (session.winnerOpenid === partnerOpenid) outcome = 'lose'

  return {
    sessionId: session._id,
    variant: session.variant,
    outcome,
    reward: session.reward || 0,
    details: session.details || {},
    myMove, partnerMove, myKeep, partnerKeep,
    closedAt: session.closedAt
  }
}
