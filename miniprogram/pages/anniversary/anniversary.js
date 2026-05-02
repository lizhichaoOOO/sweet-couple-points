// pages/anniversary/anniversary.js
Page({
  data: {
    totalDays: 1008,
    list: [
      { id: 1, title: '在一起365天', date: '2025-05-20', countdown: '0',  emoji: '🌸', big: false, nextLabel: '纪念日' },
      { id: 2, title: '生日倒计时',  date: '2025-06-19', countdown: '30', emoji: '🎂', big: false, nextLabel: '生日' },
      { id: 3, title: '第一次约会',  date: '2025-06-08', countdown: '0',  emoji: '💐', big: true,  nextLabel: '纪念日' }
    ]
  },
  addAnniversary() {
    wx.showToast({ title: '添加纪念日', icon: 'none' })
  }
})
