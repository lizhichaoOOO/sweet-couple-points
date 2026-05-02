// app.js
const { callFunction, api } = require('./utils/cloud.js')

App({
  globalData: {
    env: '',              // 云开发环境 ID（onLaunch 读取）
    cloudReady: false,    // wx.cloud.init 完成
    openid: '',           // 用户 openid（通过 login 云函数拿到）
    user: null,           // user.getProfile 返回的用户资料
    bound: false,         // 是否已绑定情侣
    coupleId: ''
  },

  // readyPromise 让页面的 onShow 可以 await app.ready
  ready: null,

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      wx.showToast({ title: '基础库版本过低', icon: 'none' })
      return
    }

    // TODO: 把云开发环境 ID 填到这里（在开发者工具 → 云开发 面板里创建）
    // 例：'cloud1-7g123xyzabcdef'
    this.globalData.env = ''

    try {
      wx.cloud.init({
        env: this.globalData.env || undefined,
        traceUser: true
      })
      this.globalData.cloudReady = true
    } catch (e) {
      console.error('wx.cloud.init failed', e)
      wx.showToast({ title: '云开发初始化失败', icon: 'none' })
      return
    }

    this.ready = this.bootstrap()
  },

  // 启动流程：login → getProfile → 写入 globalData
  async bootstrap() {
    try {
      // 1. 先从缓存取 openid，减少冷启动 RTT
      const cached = wx.getStorageSync('openid')
      if (cached) {
        this.globalData.openid = cached
      } else {
        const loginRes = await callFunction('login')
        if (loginRes && loginRes.openid) {
          this.globalData.openid = loginRes.openid
          wx.setStorageSync('openid', loginRes.openid)
        }
      }

      // 2. 拉取用户资料（首次自动创建）
      const profile = await api('user.getProfile')
      this.globalData.user = profile
      this.globalData.bound = !!profile.bound
      this.globalData.coupleId = profile.coupleId || ''
      return profile
    } catch (e) {
      console.error('bootstrap failed', e)
      // 不阻塞页面加载，但提示用户
      if (!this.globalData.env) {
        wx.showModal({
          title: '需要配置云开发环境',
          content: '请在 app.js 里把 globalData.env 填成你在开发者工具"云开发"面板里创建的环境 ID',
          showCancel: false
        })
      } else {
        wx.showToast({ title: '初始化失败：' + (e.message || 'unknown'), icon: 'none' })
      }
      throw e
    }
  },

  // 刷新绑定状态（bind 成功后调用）
  async refreshProfile() {
    try {
      const profile = await api('user.getProfile')
      this.globalData.user = profile
      this.globalData.bound = !!profile.bound
      this.globalData.coupleId = profile.coupleId || ''
      return profile
    } catch (e) {
      console.error('refreshProfile failed', e)
    }
  }
})
