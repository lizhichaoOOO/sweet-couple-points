// cloudfunctions/quickstartFunctions/lib/luckyDraw.js
// 幸运盒抽奖：消耗积分 → 按概率返奖品
const { db, _, COL, BizError, requireCouple } = require('./common')
const pointsLib = require('./points')

const COST = 20

// 奖品池：rarity + weight（权重越大越常见）
const POOL = [
  { rarity: 'common', weight: 60, items: [
    { key: 'sweet_msg', name: '甜蜜留言', icon: '💌' },
    { key: 'plus_5',    name: '+5 积分券', icon: '➕', bonus: 5 }
  ]},
  { rarity: 'rare', weight: 30, items: [
    { key: 'skip_chore', name: '免做家务券', icon: '🧽' },
    { key: 'pick_first', name: '优先选择权', icon: '⭐' }
  ]},
  { rarity: 'legendary', weight: 10, items: [
    { key: 'wish',       name: '对方无条件答应一件事', icon: '🌟' }
  ]}
]

// luckyDraw.draw → 扣费 → 随机奖品 → 记录
exports.draw = async (event, wx) => {
  const { couple, coupleId } = await requireCouple(wx.OPENID)
  const myPoints = (couple.points || {})[wx.OPENID] || 0
  if (myPoints < COST) throw new BizError('积分不足', 400)

  // 抽取稀有度再随机一个奖品
  const rarity = pickByWeight(POOL)
  const item = rarity.items[Math.floor(Math.random() * rarity.items.length)]

  // 扣费
  await pointsLib.adjust(
    { delta: -COST, reason: '抽取幸运盒', type: 'draw' },
    wx
  )

  const prizeDoc = await db.collection(COL.luckyDraws).add({
    data: {
      coupleId,
      rarity: rarity.rarity,
      prizeKey: item.key,
      prizeName: item.name,
      prizeIcon: item.icon,
      bonus: item.bonus || 0,
      cost: COST,
      createdAt: db.serverDate()
    }
  })

  // 如果奖品带积分红利，立即再加给自己
  if (item.bonus) {
    await pointsLib.adjust(
      { delta: item.bonus, reason: `幸运盒奖励：${item.name}`, type: 'draw-bonus' },
      wx
    )
  }

  return {
    id: prizeDoc._id,
    rarity: rarity.rarity,
    prize: { key: item.key, name: item.name, icon: item.icon, bonus: item.bonus || 0 }
  }
}

// luckyDraw.history
exports.history = async (event, wx) => {
  const { coupleId } = await requireCouple(wx.OPENID)
  const res = await db.collection(COL.luckyDraws)
    .where({ coupleId })
    .orderBy('createdAt', 'desc')
    .limit(30)
    .get()
  return { list: res.data }
}

function pickByWeight(pool) {
  const total = pool.reduce((s, r) => s + r.weight, 0)
  let r = Math.random() * total
  for (const item of pool) {
    if (r < item.weight) return item
    r -= item.weight
  }
  return pool[pool.length - 1]
}
