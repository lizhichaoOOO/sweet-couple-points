// pages/games/games.js
Page({
  data: {
    games: [
      { key: 'truth_dare',  title: '真心话大冒险', emoji: '😈', desc: '随机抽题，必须回答或执行', url: '/pages/games/truth-dare/truth-dare', ready: true },
      { key: 'couple_quiz', title: '情侣默契测试', emoji: '💑', desc: '10 道题看你们有多了解对方', url: '/pages/games/quiz/quiz', ready: true },
      { key: 'rps',         title: '石头剪刀布',   emoji: '✊', desc: '输了的扣分，赢了的加分' },
      { key: 'memory',      title: '翻牌记忆',     emoji: '🃏', desc: '记忆爱情瞬间，翻对得积分' },
      { key: 'who_knows',   title: '谁更懂谁',     emoji: '🧐', desc: '双方同时答同一题，看答案是否一致' },
      { key: 'drawing',     title: '你画我猜',     emoji: '🎨', desc: '一个画一个猜，增加默契' },
      { key: 'number_1a2b', title: '1A2B 猜数字',  emoji: '🔢', desc: '经典推理小游戏，适合约会时玩' },
      { key: 'dice_truth',  title: '骰子惩罚',     emoji: '🎲', desc: '掷骰子点数对应的惩罚任务' }
    ]
  },

  onPlay(e) {
    const game = e.currentTarget.dataset.game
    if (game.ready && game.url) {
      wx.navigateTo({ url: game.url })
      return
    }
    wx.showToast({
      title: `${game.title} 敬请期待`,
      icon: 'none'
    })
  }
})
