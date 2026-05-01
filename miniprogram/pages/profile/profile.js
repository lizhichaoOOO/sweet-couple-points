// pages/profile/profile.js
Page({
  data: {
    userInfo: null,
    bound: false
  },
  onShow() {
    // TODO: 加载个人信息
  },
  goBind() {
    wx.navigateTo({ url: '/pages/bind/bind' })
  },
  goAnniversary() {
    wx.navigateTo({ url: '/pages/anniversary/anniversary' })
  },
  goMood() {
    wx.navigateTo({ url: '/pages/mood/mood' })
  },
  goMessages() {
    wx.navigateTo({ url: '/pages/messages/messages' })
  }
})
