// pages/bind/bind.js
Page({
  data: {
    myCode: '123456'
  },
  onLoad() {},
  copyCode() {
    wx.setClipboardData({
      data: this.data.myCode,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    })
  },
  scan() {
    wx.scanCode({
      success: (res) => console.log('scan', res),
      fail: () => {}
    })
  }
})
