// pages/punishment/punishment.js
const app = getApp()
const { api, apiWithToast } = require('../../utils/cloud.js')

Page({
  data: {
    currentPoints: 0,
    nextLevelGap: 0,
    progressPercent: 0,
    levels: [],
    currentLevel: null,
    canAccept: false
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    try {
      if (app.ready) await app.ready
      const res = await api('punishment.getStatus')
      this.setData({
        currentPoints: res.currentPoints,
        nextLevelGap: res.nextLevelGap,
        progressPercent: res.progressPercent,
        levels: res.levels,
        currentLevel: res.currentLevel,
        canAccept: !!res.currentLevel
      })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },

  async accept() {
    if (!this.data.canAccept) {
      wx.showToast({ title: '当前积分尚未触发惩罚', icon: 'none' })
      return
    }
    const lv = this.data.currentLevel
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: `接受${lv.name}惩罚`,
        content: `惩罚内容：${lv.content}`,
        confirmText: '接受',
        success: r => resolve(r.confirm)
      })
    })
    if (!confirm) return
    try {
      const res = await apiWithToast('punishment.accept', {}, '处理中')
      wx.showToast({ title: '已记录', icon: 'success' })
    } catch (e) {}
  }
})
