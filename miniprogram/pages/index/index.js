// pages/index/index.js
const app = getApp()
const { api, apiWithToast } = require('../../utils/cloud.js')

Page({
  data: {
    ready: false,
    bound: false,
    me: { nickname: '我', avatar: '', points: 0 },
    partner: { nickname: 'TA', avatar: '', points: 0 },
    daysTogether: 0,
    todayTasks: [],
    loading: false
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      if (app.ready) await app.ready
      const data = await api('home.get')
      if (!data.bound) {
        this.setData({ ready: true, bound: false })
        return
      }
      this.setData({
        ready: true,
        bound: true,
        me: data.me,
        partner: data.partner,
        daysTogether: data.daysTogether,
        todayTasks: data.todayTasks || []
      })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
      this.setData({ ready: true })
    } finally {
      this.setData({ loading: false })
    }
  },

  goBind() {
    wx.navigateTo({ url: '/pages/bind/bind' })
  },

  async toggleTask(e) {
    const task = e.currentTarget.dataset.task
    if (!task || task.done) return
    try {
      await apiWithToast(
        'tasks.complete',
        { taskId: task._id },
        '打卡中'
      )
      wx.showToast({ title: `+${task.points} 积分`, icon: 'success' })
      await this.loadData()
    } catch (e) {}
  },

  // 点击加分：预设选项
  async addPoints() {
    const options = [
      { delta: 5,  reason: '早安打卡' },
      { delta: 10, reason: '做了早餐' },
      { delta: 15, reason: '陪我散步' },
      { delta: 20, reason: '送了礼物' }
    ]
    const res = await this.showActionSheet(options.map(o => `+${o.delta} ${o.reason}`))
    if (res == null) return
    const picked = options[res]
    try {
      await apiWithToast(
        'points.adjust',
        { delta: picked.delta, reason: picked.reason },
        '加分中'
      )
      wx.showToast({ title: `+${picked.delta}`, icon: 'success' })
      await this.loadData()
    } catch (e) {}
  },

  async deductPoints() {
    const options = [
      { delta: -5,  reason: '忘记回消息' },
      { delta: -10, reason: '说话没耐心' },
      { delta: -20, reason: '忘记纪念日' },
      { delta: -30, reason: '吵架不理人' }
    ]
    const res = await this.showActionSheet(options.map(o => `${o.delta} ${o.reason}`))
    if (res == null) return
    const picked = options[res]
    try {
      await apiWithToast(
        'points.adjust',
        { delta: picked.delta, reason: picked.reason, targetOpenid: app.globalData.openid },
        '扣分中'
      )
      wx.showToast({ title: `${picked.delta}`, icon: 'none' })
      await this.loadData()
    } catch (e) {}
  },

  showActionSheet(itemList) {
    return new Promise(resolve => {
      wx.showActionSheet({
        itemList,
        success: r => resolve(r.tapIndex),
        fail: () => resolve(null)
      })
    })
  }
})
