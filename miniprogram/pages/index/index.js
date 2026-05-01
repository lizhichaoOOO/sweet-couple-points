// pages/index/index.js
const app = getApp()

Page({
  data: {
    bound: false,
    myInfo: { nickname: '我', avatar: '', points: 0 },
    partnerInfo: { nickname: 'TA', avatar: '', points: 0 },
    daysToghter: 0
  },

  onLoad() {
    // TODO: 调用云函数获取情侣信息和积分
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    // TODO: 拉取最新积分和情侣信息
  },

  goBind() {
    wx.navigateTo({ url: '/pages/bind/bind' })
  }
})
