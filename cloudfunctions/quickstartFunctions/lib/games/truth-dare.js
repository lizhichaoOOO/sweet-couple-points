// cloudfunctions/quickstartFunctions/lib/games/truth-dare.js
// 真心话大冒险：题库 + 抽题 + 完成/拒绝打分
const { db, _, COL, BizError, requireCouple, log, shortId } = require('../common')
const pointsLib = require('../points')

// 完成奖励 / 拒绝惩罚
const DONE_REWARD = 2
const REJECT_PENALTY = -10

// 题库：融合朋友圈/微信/短视频/表情包/外卖/前任等 2025 情侣日常场景
// level: mild（温和）/ spicy（进阶、带情感深度或当众行动）
const TRUTHS = [
  // --- mild (温和，20 条) ---
  { id: 't01', level: 'mild', text: '第一次看到我你想的第一件事是什么？可以不用美化。' },
  { id: 't02', level: 'mild', text: '你手机里存了我几张照片？哪一张是你最喜欢的？' },
  { id: 't03', level: 'mild', text: '你给我的微信备注是什么？不许改了再告诉我。' },
  { id: 't04', level: 'mild', text: '你朋友圈最近一条和我有关的是哪一条？' },
  { id: 't05', level: 'mild', text: '我最近哪一句话或消息，你截屏保存过？' },
  { id: 't06', level: 'mild', text: '我穿哪件衣服是你最喜欢的？为什么？' },
  { id: 't07', level: 'mild', text: '我最常用的表情包里，你最受不了的是哪个？' },
  { id: 't08', level: 'mild', text: '你觉得我最有魅力的一个瞬间是什么时候？' },
  { id: 't09', level: 'mild', text: '有没有一瞬间你想"这人我要定了"？什么时候？' },
  { id: 't10', level: 'mild', text: '点过这么多顿外卖，哪一次让你印象最深？' },
  { id: 't11', level: 'mild', text: '如果重新给我起一个外号（不能用现在的），你会叫我什么？' },
  { id: 't12', level: 'mild', text: '我做过最让你心动的一件小事是什么？' },
  { id: 't13', level: 'mild', text: '和我在一起之后，你改掉的一个习惯是什么？' },
  { id: 't14', level: 'mild', text: '如果我俩拍短视频当博主，你觉得我们人设是什么？' },
  { id: 't15', level: 'mild', text: '你偷偷在什么场合刷到过我的朋友圈很久？' },
  { id: 't16', level: 'mild', text: '你最喜欢我身上的哪个部位？（除了心）' },
  { id: 't17', level: 'mild', text: '你最喜欢和我一起做的一件最平常的事是什么？' },
  { id: 't18', level: 'mild', text: '我在你手机里是什么铃声 / 通知提示音？' },
  { id: 't19', level: 'mild', text: '在你眼里，我有什么特别"自以为很帅 / 很美"的时刻？' },
  { id: 't20', level: 'mild', text: '你觉得我们 5 年后会在哪个城市生活？吃什么早餐？' },

  // --- spicy (进阶，20 条) ---
  { id: 't21', level: 'spicy', text: '有没有什么事你一直想告诉我，但始终没开口？' },
  { id: 't22', level: 'spicy', text: '我做过让你最生气的一件事是什么？当时你有多想分手？' },
  { id: 't23', level: 'spicy', text: '你手机里是否还留着前任的照片或聊天记录？（如实回答）' },
  { id: 't24', level: 'spicy', text: '在我不知道的地方，你是否偷偷看过我的社交账号？看到过什么？' },
  { id: 't25', level: 'spicy', text: '最近有异性让你动心过吗？（不用说是谁，但要说是有还是没有）' },
  { id: 't26', level: 'spicy', text: '如果我们今天分开，你明天会把我发给你的东西都删掉吗？' },
  { id: 't27', level: 'spicy', text: '你对我做过哪一个你没告诉我的"脑补场景"？' },
  { id: 't28', level: 'spicy', text: '我的哪一个习惯其实让你很抓狂，但你一直忍着？' },
  { id: 't29', level: 'spicy', text: '你爸妈对我最真实的评价是什么？别粉饰。' },
  { id: 't30', level: 'spicy', text: '你觉得我们现在的关系里，最大的一个问题是什么？' },
  { id: 't31', level: 'spicy', text: '你心里的排序是：我、家人、朋友、工作——真实顺序是？' },
  { id: 't32', level: 'spicy', text: '如果我突然消失联系不上，你会找我多久？之后呢？' },
  { id: 't33', level: 'spicy', text: '你最怕我知道你的哪件事？可以不具体说，但要承认它存在。' },
  { id: 't34', level: 'spicy', text: '你愿意为我牺牲的底线是什么？什么是你不会为我做的？' },
  { id: 't35', level: 'spicy', text: '你理想中的求婚场景是怎样的？具体到地点和台词。' },
  { id: 't36', level: 'spicy', text: '我说过的哪句话，曾经让你一夜没睡好？' },
  { id: 't37', level: 'spicy', text: '你上一次因为我哭是什么时候？是什么触发的？' },
  { id: 't38', level: 'spicy', text: '如果要给我写一段遗言，第一句你会怎么写？' },
  { id: 't39', level: 'spicy', text: '你觉得三年后我们还会在一起吗？凭什么判断？' },
  { id: 't40', level: 'spicy', text: '你有没有过"这段感情可能不值得再继续"的瞬间？' }
]

const DARES = [
  // --- mild (温和，20 条) ---
  { id: 'd01', level: 'mild', text: '抱住对方 30 秒，期间不能说话，也不能笑。' },
  { id: 'd02', level: 'mild', text: '给对方清唱一段情歌，走调也要坚持唱完。' },
  { id: 'd03', level: 'mild', text: '用最深情的声音对对方说"我爱你"5 次，每次语气都要不同。' },
  { id: 'd04', level: 'mild', text: '和对方对视 30 秒，先眨眼、先笑、先说话的输。' },
  { id: 'd05', level: 'mild', text: '把对方的自拍设成你手机锁屏，发截图给对方。' },
  { id: 'd06', level: 'mild', text: '在对方最新一条朋友圈留言："今天也在想你 ❤️"' },
  { id: 'd07', level: 'mild', text: '学对方说话的语气和语速，和 TA 对话 2 分钟。' },
  { id: 'd08', level: 'mild', text: '给对方做一次"公主抱"或"王子抱"，坚持 10 秒。' },
  { id: 'd09', level: 'mild', text: '用手写体在纸上写"我喜欢你"，拍照发给对方。' },
  { id: 'd10', level: 'mild', text: '连发 3 个对方最怕你发的表情包给对方，不解释。' },
  { id: 'd11', level: 'mild', text: '模仿对方最有代表性的一个口头禅或动作，要像到对方自己认得。' },
  { id: 'd12', level: 'mild', text: '用咖啡豆 / 硬币 / 任何手边的小物件摆一个心形，拍照给对方。' },
  { id: 'd13', level: 'mild', text: '把对方名字认真写在自己手心，给对方看。' },
  { id: 'd14', level: 'mild', text: '即兴表演"五年后我们的早晨"，时长 15 秒。' },
  { id: 'd15', level: 'mild', text: '唱《小情歌》任意一句，录音发给对方。' },
  { id: 'd16', level: 'mild', text: '用对方脸型 / 发型模仿一个你们共同认识的人。' },
  { id: 'd17', level: 'mild', text: '对着手机前置摄像头说"我是 TA 的粉丝"，录视频发给对方。' },
  { id: 'd18', level: 'mild', text: '给对方念出你今天朋友圈的草稿（如果没有就现场写一条）。' },
  { id: 'd19', level: 'mild', text: '给对方做个 3 秒的"追星式"尖叫表情（不准笑场）。' },
  { id: 'd20', level: 'mild', text: '给对方点一杯奶茶 / 咖啡外卖，并备注一句肉麻的话。' },

  // --- spicy (进阶，20 条) ---
  { id: 'd21', level: 'spicy', text: '打电话给对方的一个好友，说一件最近关于对方你觉得感动的事。' },
  { id: 'd22', level: 'spicy', text: '当面、认真地说出对方身上三个你觉得想改的缺点。' },
  { id: 'd23', level: 'spicy', text: '把你们的第一张合照发朋友圈，并 @ 对方，配一句你的真心话。' },
  { id: 'd24', level: 'spicy', text: '现在立刻删掉手机里所有前任的痕迹，对方全程监督。' },
  { id: 'd25', level: 'spicy', text: '给对方念你备忘录 / 日记里最近一条关于 TA 的内容。' },
  { id: 'd26', level: 'spicy', text: '把你和对方聊天记录里最肉麻的 1 条转发给对方，不许撤回。' },
  { id: 'd27', level: 'spicy', text: '给对方念一段你写过但一直没发出去的东西。' },
  { id: 'd28', level: 'spicy', text: '当场给对方发一个不小于 52 元的红包，备注一句情话。' },
  { id: 'd29', level: 'spicy', text: '用对方手机给你自己发"我爱你"，并把消息截图发朋友圈 30 分钟。' },
  { id: 'd30', level: 'spicy', text: '公开说出你在这段关系里最害怕的一件事，不许回避。' },
  { id: 'd31', level: 'spicy', text: '给对方看你通讯录里最近聊天最多的 3 个异性的备注。' },
  { id: 'd32', level: 'spicy', text: '把你觉得最丑的一张自拍发给对方，不允许磨皮。' },
  { id: 'd33', level: 'spicy', text: '认真给对方做一次足部按摩，至少 10 分钟，不能玩手机。' },
  { id: 'd34', level: 'spicy', text: '手写一封不少于 100 字的情书，明天当面给对方。' },
  { id: 'd35', level: 'spicy', text: '在对方的主页（朋友圈 / 小红书 / 微博）评论一条永久置顶的话。' },
  { id: 'd36', level: 'spicy', text: '模拟一次求婚场景，给对方 3 分钟准备，然后认真演一次。' },
  { id: 'd37', level: 'spicy', text: '给对方念你手机里保存的 TA 发给你的第一条消息。' },
  { id: 'd38', level: 'spicy', text: '换上对方的一件外套，当着 TA 面走个 T 台，持续 1 分钟。' },
  { id: 'd39', level: 'spicy', text: '公开一个你从没告诉过对方的小秘密，一个就行。' },
  { id: 'd40', level: 'spicy', text: '对方为你做过的一件事，你现在当面具体、认真地说一次谢谢。' }
]

function sample(list) {
  return list[Math.floor(Math.random() * list.length)]
}

// games.truthDare.draw({ type, level? })
// type: 'truth' | 'dare'
// level: 'mild' | 'spicy' | 'random' (default 'mild')
exports.draw = async (event, wx) => {
  const type = event.type === 'dare' ? 'dare' : 'truth'
  const level = ['mild', 'spicy', 'random'].includes(event.level) ? event.level : 'mild'

  await requireCouple(wx.OPENID) // 必须绑定情侣才能玩

  const pool = type === 'truth' ? TRUTHS : DARES
  const filtered = level === 'random' ? pool : pool.filter(q => q.level === level)
  if (!filtered.length) throw new BizError('题库为空', 500)

  const picked = sample(filtered)
  log('games.truthDare.draw', {
    oid: shortId(wx.OPENID),
    type, level,
    id: picked.id
  })
  return { ...picked, type, poolSize: filtered.length }
}

// games.truthDare.submit({ id, type, text, result })
// result: 'done' (完成 +2) | 'rejected' (拒绝 -10)
exports.submit = async (event, wx) => {
  const { id, type, text, result } = event
  if (!id || !type || !text) throw new BizError('参数不完整')
  if (!['truth', 'dare'].includes(type)) throw new BizError('type 非法')
  if (!['done', 'rejected'].includes(result)) throw new BizError('result 非法')

  const typeLabel = type === 'truth' ? '真心话' : '大冒险'
  const shortText = text.length > 20 ? text.slice(0, 20) + '...' : text

  if (result === 'done') {
    await pointsLib.adjust(
      {
        delta: DONE_REWARD,
        reason: `游戏-${typeLabel}-完成：${shortText}`,
        type: 'game'
      },
      wx
    )
    log('games.truthDare.done', {
      oid: shortId(wx.OPENID), id, type, reward: DONE_REWARD
    })
    return { ok: true, delta: DONE_REWARD }
  }

  // rejected
  await pointsLib.adjust(
    {
      delta: REJECT_PENALTY,
      reason: `游戏-${typeLabel}-拒绝：${shortText}`,
      type: 'game'
    },
    wx
  )
  log('games.truthDare.rejected', {
    oid: shortId(wx.OPENID), id, type, penalty: REJECT_PENALTY
  })
  return { ok: true, delta: REJECT_PENALTY }
}

// games.truthDare.stats → 返回题库容量和各级别数量，便于前端显示
exports.stats = async () => {
  return {
    truths: {
      total: TRUTHS.length,
      mild: TRUTHS.filter(t => t.level === 'mild').length,
      spicy: TRUTHS.filter(t => t.level === 'spicy').length
    },
    dares: {
      total: DARES.length,
      mild: DARES.filter(d => d.level === 'mild').length,
      spicy: DARES.filter(d => d.level === 'spicy').length
    },
    doneReward: DONE_REWARD,
    rejectPenalty: REJECT_PENALTY
  }
}
