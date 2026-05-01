// pages/punishment/punishment.js
Page({
  data: {
    currentPoints: -20,
    nextLevelGap: 10,
    levels: [
      { level: 'light', name: '轻度', threshold: -30, icon: '🍜', punishment: '洗碗三天' },
      { level: 'medium', name: '中度', threshold: -60, icon: '🧹', punishment: '拖地一周' },
      { level: 'severe', name: '重度', threshold: -100, icon: '🧋', punishment: '为对方买一周奶茶' }
    ]
  },
  accept() {
    wx.showToast({ title: '已接受惩罚', icon: 'success' })
  }
})
