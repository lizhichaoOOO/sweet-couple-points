// pages/timeline/timeline.js
Page({
  data: {
    records: []
  },
  onLoad() {
    // TODO: 拉取积分变动记录
  },
  onPullDownRefresh() {
    this.onLoad()
    wx.stopPullDownRefresh()
  }
})
