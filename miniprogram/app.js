// app.js
App({
  globalData: {
    userInfo: null,
    openid: null,
    coupleId: null,
    partnerInfo: null
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }

    wx.cloud.init({
      // TODO: 在微信开发者工具的 "云开发" 面板里创建环境后，把环境 ID 填到这里
      // env: 'your-env-id',
      env: '',
      traceUser: true
    })

    this.checkSession()
  },

  // 检查登录态：本地有 openid 就直接用，没有就走登录流程
  async checkSession() {
    const cachedOpenid = wx.getStorageSync('openid')
    if (cachedOpenid) {
      this.globalData.openid = cachedOpenid
      return
    }
    try {
      const res = await wx.cloud.callFunction({ name: 'login' })
      const openid = res.result && res.result.openid
      if (openid) {
        this.globalData.openid = openid
        wx.setStorageSync('openid', openid)
      }
    } catch (err) {
      console.error('login failed', err)
    }
  }
})
