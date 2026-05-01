// pages/shared-goal/shared-goal.js
Page({
  data: {
    goals: [
      {
        id: 1,
        title: '日本旅行',
        current: 2000,
        total: 5000,
        myContrib: 1200,
        partnerContrib: 800,
        image: '🌸'
      },
      {
        id: 2,
        title: '全新沙发',
        current: 800,
        total: 3000,
        myContrib: 500,
        partnerContrib: 300,
        image: '🛋'
      }
    ]
  },
  addGoal() {
    wx.showToast({ title: '新建共同目标', icon: 'none' })
  }
})
