// pages/shared-goal/shared-goal.js
const app = getApp()
const { api, apiWithToast } = require('../../utils/cloud.js')

Page({
  data: {
    goals: []
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    try {
      if (app.ready) await app.ready
      const res = await api('goals.list')
      const mine = app.globalData.openid
      const goals = (res.list || []).map(g => {
        const contrib = g.contributions || {}
        const myContrib = contrib[mine] || 0
        const partnerContrib = Object.entries(contrib)
          .filter(([k]) => k !== mine)
          .reduce((sum, [, v]) => sum + v, 0)
        return {
          _id: g._id,
          title: g.title,
          image: g.emoji || '🎯',
          current: g.current || 0,
          total: g.total,
          myContrib,
          partnerContrib,
          percent: Math.min(100, Math.round(((g.current || 0) / g.total) * 100)),
          status: g.status
        }
      })
      this.setData({ goals })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },

  async addGoal() {
    const title = await this.prompt('目标名称', '例如：一起看演唱会')
    if (!title) return
    const totalStr = await this.prompt('所需积分', '1000')
    if (!totalStr) return
    const total = parseInt(totalStr, 10)
    if (!total || total <= 0) {
      wx.showToast({ title: '积分必须为正整数', icon: 'none' })
      return
    }
    try {
      await apiWithToast('goals.create', { title, total }, '创建中')
      wx.showToast({ title: '已创建', icon: 'success' })
      await this.loadData()
    } catch (e) {}
  },

  async contribute(e) {
    const id = e.currentTarget.dataset.id
    const goal = this.data.goals.find(g => g._id === id)
    if (!goal) return

    const remaining = goal.total - goal.current
    const amountStr = await this.prompt(`投入积分（还差 ${remaining}）`, '50')
    if (!amountStr) return
    const amount = parseInt(amountStr, 10)
    if (!amount || amount <= 0) {
      wx.showToast({ title: '金额必须为正整数', icon: 'none' })
      return
    }
    try {
      const res = await apiWithToast('goals.contribute', { goalId: id, amount }, '投入中')
      if (res.achieved) {
        wx.showToast({ title: '🎉 目标达成！', icon: 'success' })
      } else {
        wx.showToast({ title: `已投入 ${amount} 分`, icon: 'success' })
      }
      await this.loadData()
    } catch (e) {}
  },

  async longPressGoal(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '删除目标',
        content: '确认删除这个共同目标？已投入的积分不会退回。',
        success: r => resolve(r.confirm)
      })
    })
    if (!confirm) return
    try {
      await apiWithToast('goals.delete', { goalId: id }, '删除中')
      await this.loadData()
    } catch (e) {}
  },

  prompt(title, placeholder = '') {
    return new Promise(resolve => {
      wx.showModal({
        title,
        editable: true,
        placeholderText: placeholder,
        success: r => resolve(r.confirm ? (r.content || '').trim() : ''),
        fail: () => resolve('')
      })
    })
  }
})
