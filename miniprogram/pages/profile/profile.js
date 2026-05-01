// pages/profile/profile.js
Page({
  data: {
    myName: '林晓',
    partnerName: '陈宇',
    daysTogether: 128,
    photoUrl: '',
    stats: {
      totalPoints: 2368,
      completedTasks: 72,
      redeemedRewards: 16
    },
    menus: [
      { icon: '🏠', label: '伴侣管理', url: '/pages/bind/bind' },
      { icon: '📋', label: '积分账本', url: '/pages/ledger/ledger' },
      { icon: '💌', label: '留言板', url: '/pages/messages/messages' },
      { icon: '😊', label: '心情打卡', url: '/pages/mood/mood' },
      { icon: '🎯', label: '共同目标', url: '/pages/shared-goal/shared-goal' },
      { icon: '🎁', label: '幸运盒', url: '/pages/lucky-draw/lucky-draw' },
      { icon: '⚠️', label: '惩罚池', url: '/pages/punishment/punishment' },
      { icon: '🧘', label: '冷静模式', url: '/pages/cooldown/cooldown' },
      { icon: '🌸', label: '纪念日设置', url: '/pages/anniversary/anniversary' },
      { icon: '🔔', label: '通知设置' },
      { icon: '💖', label: '数据备份' },
      { icon: '⚙️', label: '关于我们' }
    ]
  },
  tapMenu(e) {
    const url = e.currentTarget.dataset.url
    if (url) wx.navigateTo({ url })
  },
  logout() {
    wx.showModal({ title: '退出登录', content: '确定退出吗？' })
  }
})
