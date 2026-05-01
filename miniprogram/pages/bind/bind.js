// pages/bind/bind.js
Page({
  data: {
    myCode: '',
    inputCode: ''
  },
  onLoad() {
    // TODO: 获取我的邀请码（基于 openid）
  },
  onCodeInput(e) {
    this.setData({ inputCode: e.detail.value })
  },
  copyCode() {
    wx.setClipboardData({ data: this.data.myCode })
  },
  doBind() {
    const code = this.data.inputCode.trim()
    if (!code) {
      wx.showToast({ title: '请输入对方邀请码', icon: 'none' })
      return
    }
    // TODO: 调云函数完成绑定
    console.log('bind with', code)
  }
})
