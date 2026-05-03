// cloudfunctions/quickstartFunctions/lib/games/witch.js
// 女巫的毒药：5x5 草莓格子，双方秘密下毒，轮流吃，吃到对方的毒就输
const { db, _, COL, BizError, requireCouple, log, shortId } = require('../common')
const pointsLib = require('../points')

const GRID_SIZE = 25  // 5x5
const REWARD = 5

// 败方收到的随机惩罚（仅做展示，不自动执行）
const PENALTIES = [
  '给对方清唱一段情歌（走调也要唱）',
  '连续学 3 种动物叫声',
  '当面说 3 句土味情话',
  '给对方做一次肩颈按摩 5 分钟',
  '发朋友圈公开表白对方，至少保留 1 小时',
  '做 20 个俯卧撑',
  '请对方一顿饭或一杯奶茶',
  '给对方念一段你手机里保存的关于 TA 的内容',
  '陪对方看一部 TA 选的电影',
  '抱住对方 1 分钟不准说话不准笑',
  '当着对方面跳 30 秒舞（任何舞）',
  '用对方自拍当锁屏 24 小时并截图为证',
  '立刻手写一张"我爱 TA"的小纸条拍照发给对方',
  '把聊天记录里最肉麻的一句转发给对方，不许撤回',
  '对方指定一件家务，今天立刻做掉'
]

function randomPenalty() {
  return PENALTIES[Math.floor(Math.random() * PENALTIES.length)]
}

async function findActiveSession(coupleId) {
  const res = await db.collection(COL.witchSessions)
    .where({ coupleId, status: _.in(['picking-poison', 'playing']) })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
  return res.data[0] || null
}

// games.witch.start — 开局
exports.start = async (event, wx) => {
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)

  // 幂等：已有活跃局返回
  const existing = await findActiveSession(coupleId)
  if (existing) {
    return { sessionId: existing._id, already: true }
  }

  const now = db.serverDate()
  const add = await db.collection(COL.witchSessions).add({
    data: {
      coupleId,
      startedBy: wx.OPENID,
      poisons: { [wx.OPENID]: null, [partnerOpenid]: null },
      picked: [],                 // [{openid, cell}]
      turnOpenid: wx.OPENID,      // 进入 playing 后由 startedBy 先吃
      status: 'picking-poison',
      createdAt: now,
      updatedAt: now
    }
  })
  log('games.witch.start', {
    coupleId, sessionId: add._id, startedBy: shortId(wx.OPENID)
  })
  return { sessionId: add._id }
}

// games.witch.current — 当前状态（给前端渲染用）
// 视角安全：对方的毒不返回给你，只有游戏结束才 reveal
exports.current = async (event, wx) => {
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)
  const active = await findActiveSession(coupleId)

  if (active) {
    return {
      state: mapState(active, wx.OPENID, partnerOpenid),
      session: projectSessionForMe(active, wx.OPENID, partnerOpenid)
    }
  }

  const latestClosed = await db.collection(COL.witchSessions)
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

// games.witch.setPoison({ cell }) — 设置自己的毒
exports.setPoison = async (event, wx) => {
  const cell = Number(event.cell)
  if (!Number.isInteger(cell) || cell < 0 || cell >= GRID_SIZE) {
    throw new BizError('cell 必须是 0-24')
  }
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)
  const s = await findActiveSession(coupleId)
  if (!s) throw new BizError('没有进行中的对局', 404)
  if (s.status !== 'picking-poison') throw new BizError('当前不是下毒阶段', 409)
  if (s.poisons[wx.OPENID] !== null) throw new BizError('你已经下过毒了', 409)

  const now = db.serverDate()
  const partnerPoison = s.poisons[partnerOpenid]
  const bothDone = partnerPoison !== null

  const update = {
    [`poisons.${wx.OPENID}`]: cell,
    updatedAt: now
  }
  if (bothDone) {
    // 双方都下毒了 → 进入 playing 阶段，startedBy 先吃
    update.status = 'playing'
    update.turnOpenid = s.startedBy
  }
  await db.collection(COL.witchSessions).doc(s._id).update({ data: update })

  log('games.witch.setPoison', {
    sessionId: s._id, oid: shortId(wx.OPENID), cell, bothDone
  })
  return { success: true, bothDone }
}

// games.witch.pickCell({ cell }) — 吃草莓
exports.pickCell = async (event, wx) => {
  const cell = Number(event.cell)
  if (!Number.isInteger(cell) || cell < 0 || cell >= GRID_SIZE) {
    throw new BizError('cell 必须是 0-24')
  }
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)
  const s = await findActiveSession(coupleId)
  if (!s) throw new BizError('没有进行中的对局', 404)
  if (s.status !== 'playing') throw new BizError('当前不是吃草莓阶段', 409)
  if (s.turnOpenid !== wx.OPENID) throw new BizError('还没到你的回合', 409)
  if (s.picked.some(p => p.cell === cell)) {
    throw new BizError('这颗草莓已经被吃过了', 409)
  }

  const partnerPoison = s.poisons[partnerOpenid]
  const newPicked = [...s.picked, { openid: wx.OPENID, cell }]
  const now = db.serverDate()

  // 吃到对方的毒 → 我输
  if (cell === partnerPoison) {
    const penalty = randomPenalty()
    await db.collection(COL.witchSessions).doc(s._id).update({
      data: {
        picked: newPicked,
        status: 'closed',
        loser: wx.OPENID,
        winner: partnerOpenid,
        penalty,
        closedAt: now,
        updatedAt: now
      }
    })
    // 胜方 +5
    await pointsLib.adjust(
      {
        delta: REWARD,
        reason: '女巫的毒药-胜利',
        type: 'game',
        targetOpenid: partnerOpenid
      },
      { OPENID: partnerOpenid }
    )
    // 败方 -5（冷静期容错）
    try {
      await pointsLib.adjust(
        {
          delta: -REWARD,
          reason: '女巫的毒药-中毒',
          type: 'game',
          targetOpenid: wx.OPENID
        },
        { OPENID: wx.OPENID }
      )
    } catch (e) {
      log('witch.loserDeductSkipped', { sessionId: s._id, reason: e.message })
    }
    log('games.witch.closed', {
      sessionId: s._id, loser: shortId(wx.OPENID), penalty
    })
    return {
      gameOver: true,
      lost: true,
      cell,
      penalty,
      result: buildResult({
        ...s, picked: newPicked,
        loser: wx.OPENID, winner: partnerOpenid, penalty
      }, wx.OPENID, partnerOpenid)
    }
  }

  // 吃满 25 格还没分出胜负 → 平局
  if (newPicked.length >= GRID_SIZE) {
    await db.collection(COL.witchSessions).doc(s._id).update({
      data: {
        picked: newPicked,
        status: 'closed',
        loser: null,
        winner: null,
        closedAt: now,
        updatedAt: now
      }
    })
    log('games.witch.draw', { sessionId: s._id })
    return {
      gameOver: true,
      draw: true,
      cell,
      result: buildResult({
        ...s, picked: newPicked, loser: null, winner: null
      }, wx.OPENID, partnerOpenid)
    }
  }

  // 安全，继续，换对方
  await db.collection(COL.witchSessions).doc(s._id).update({
    data: {
      picked: newPicked,
      turnOpenid: partnerOpenid,
      updatedAt: now
    }
  })
  return {
    gameOver: false,
    cell,
    safe: true,
    nextTurn: partnerOpenid,
    isOwnPoison: cell === s.poisons[wx.OPENID]
  }
}

// games.witch.cancel
exports.cancel = async (event, wx) => {
  const { coupleId, partnerOpenid } = await requireCouple(wx.OPENID)
  const s = await findActiveSession(coupleId)
  if (!s) throw new BizError('没有进行中的对局', 404)

  // 双方都已下毒并进入 playing 阶段 → 不允许取消（游戏已开始博弈）
  if (s.status === 'playing') {
    throw new BizError('对局已开始，不能取消', 409)
  }
  // picking-poison 阶段，若对方也已下毒则不能取消
  if (s.poisons[partnerOpenid] !== null) {
    throw new BizError('对方已下毒，不能取消', 409)
  }

  await db.collection(COL.witchSessions).doc(s._id).update({
    data: {
      status: 'cancelled',
      cancelledAt: db.serverDate()
    }
  })
  return { success: true }
}

// games.witch.history
exports.history = async (event, wx) => {
  const { coupleId } = await requireCouple(wx.OPENID)
  const res = await db.collection(COL.witchSessions)
    .where({ coupleId, status: 'closed' })
    .orderBy('closedAt', 'desc')
    .limit(20)
    .get()
  return {
    list: res.data.map(s => ({
      _id: s._id,
      winner: s.winner,
      loser: s.loser,
      penalty: s.penalty,
      closedAt: s.closedAt
    }))
  }
}

// --- 视角裁剪 / 状态映射 / 结果组装 ---

function mapState(s, myOpenid, partnerOpenid) {
  if (s.status === 'picking-poison') {
    if (s.poisons[myOpenid] === null) return 'pick-my-poison'
    return 'wait-partner-poison'
  }
  if (s.status === 'playing') {
    return s.turnOpenid === myOpenid ? 'my-turn' : 'partner-turn'
  }
  return s.status
}

function projectSessionForMe(s, myOpenid, partnerOpenid) {
  // 对方的毒在游戏未结束前不返回
  const closed = s.status === 'closed'
  return {
    _id: s._id,
    status: s.status,
    startedBy: s.startedBy,
    myPoison: s.poisons[myOpenid],
    partnerPoison: closed ? s.poisons[partnerOpenid] : null,
    partnerHasSetPoison: s.poisons[partnerOpenid] !== null,
    picked: s.picked,   // [{openid, cell}] 双方都可以看
    turnOpenid: s.turnOpenid,
    isMyTurn: s.turnOpenid === myOpenid,
    gridSize: GRID_SIZE
  }
}

function buildResult(s, myOpenid, partnerOpenid) {
  let outcome = 'draw'
  if (s.winner === myOpenid) outcome = 'win'
  else if (s.loser === myOpenid) outcome = 'lose'

  return {
    sessionId: s._id,
    outcome,
    reward: outcome === 'draw' ? 0 : REWARD,
    penalty: outcome === 'lose' ? s.penalty : null,
    myPoison: s.poisons[myOpenid],
    partnerPoison: s.poisons[partnerOpenid],
    picked: s.picked,
    closedAt: s.closedAt,
    gridSize: GRID_SIZE
  }
}
