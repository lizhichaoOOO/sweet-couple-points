// pages/timeline/timeline.js
Page({
  data: {
    records: [
      { id: 1, icon: '❤️', type: 'add',     time: '09:30', date: '10月05日', title: '完成情侣打卡',   delta: '+10积分' },
      { id: 2, icon: '💔', type: 'deduct',  time: '14:20', date: '10月03日', title: '兑换奶茶券',     delta: '-50积分' },
      { id: 3, icon: '🎁', type: 'redeem',  time: '08:15', date: '10月01日', title: '国庆情侣福利',   delta: '+20积分' },
      { id: 4, icon: '❤️', type: 'add',     time: '20:00', date: '09月28日', title: '分享恋爱日常',   delta: '+5积分' },
      { id: 5, icon: '🩶', type: 'deduct',  time: '12:30', date: '09月25日', title: '忘记打卡',       delta: '-3积分' },
      { id: 6, icon: '🎁', type: 'redeem',  time: '18:45', date: '09月20日', title: '签到满7天',      delta: '+15积分' }
    ]
  },
  onPullDownRefresh() {
    wx.stopPullDownRefresh()
  }
})
