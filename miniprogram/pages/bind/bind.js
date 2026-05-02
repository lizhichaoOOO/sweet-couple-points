// pages/bind/bind.js
const app = getApp()
const { api, apiWithToast } = require('../../utils/cloud.js')

Page({
  data: {
    myCode: '------',
    inputCode: '',
    loading: false
  },

  async onLoad() {
    await this.loadMyCode()
  },

  async loadMyCode() {
    try {
      if (app.ready) await app.ready
      const { code } = await api('couple.getInviteCode')
      this.setData({ myCode: code || '------' })
    } catch (e) {
      // 错误已由底层处理
    }
  },

  copyCode() {
    if (!this.data.myCode || this.data.myCode === '------') return
    wx.setClipboardData({
      data: this.data.myCode,
      success: () => wx.showToast({ title: '邀请码已复制', icon: 'success' })
    })
  },

  onInputCode(e) {
    this.setData({ inputCode: e.detail.value.trim() })
  },

  async scan() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.scanCode({
          onlyFromCamera: false,
          scanType: ['qrCode', 'barCode'],
          success: resolve,
          fail: reject
        })
      })
      const code = (res.result || '').trim()
      if (!code) {
        wx.showToast({ title: '未识别到邀请码', icon: 'none' })
        return
      }
      this.setData({ inputCode: code })
      await this.doBind(code)
    } catch (e) {
      // 用户取消扫码不提示
      if (e.errMsg && e.errMsg.includes('cancel')) return
      wx.showToast({ title: '扫码失败', icon: 'none' })
    }
  },

  async confirmBind() {
    const code = (this.data.inputCode || '').trim()
    if (!code) {
      wx.showToast({ title: '请输入对方邀请码', icon: 'none' })
      return
    }
    if (code === this.data.myCode) {
      wx.showToast({ title: '不能绑定自己', icon: 'none' })
      return
    }
    await this.doBind(code)
  },

  async doBind(code) {
    if (this.data.loading) return
    this.setData({ loading: true })
    console.log('[bind:attempt]', { code })
    try {
      const res = await apiWithToast('couple.bindByCode', { code }, '绑定中')
      console.log('[bind:ok]', { coupleId: res.coupleId })
      await app.refreshProfile()
      wx.showToast({ title: '绑定成功', icon: 'success' })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' })
      }, 800)
    } catch (e) {
      console.warn('[bind:fail]', { code, msg: e.message })
      // toast 已在 apiWithToast 里弹过
    } finally {
      this.setData({ loading: false })
    }
  }
})
