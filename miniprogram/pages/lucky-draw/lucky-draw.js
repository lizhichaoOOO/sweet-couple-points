// pages/lucky-draw/lucky-draw.js
Page({
  data: {
    pool: [
      { rarity: 'common', name: '普通', color: '#B0D4F1', icon: '🎁' },
      { rarity: 'rare', name: '稀有', color: '#FFB6CE', icon: '📦' },
      { rarity: 'legendary', name: '传说', color: '#FFB07C', icon: '👛' }
    ],
    history: []
  },
  draw() {
    wx.showToast({ title: '抽奖中...', icon: 'loading' })
  }
})
