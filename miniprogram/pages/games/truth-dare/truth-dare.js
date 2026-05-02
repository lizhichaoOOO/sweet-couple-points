// pages/games/truth-dare/truth-dare.js
const app = getApp()
const { api, apiWithToast } = require('../../../utils/cloud.js')

Page({
  data: {
    level: 'mild',          // mild / spicy
    state: 'idle',          // idle / showing / submitting
    current: null,          // 当前抽到的题 { id, type, level, text }
    flipping: false,        // 卡片翻转动画
    pickedTypeLabel: '',
    stats: null,            // 题库统计
    todayDone: 0,
    todayReject: 0
  },

  onLoad() {
    this.loadStats()
  },

  async loadStats() {
    try {
      if (app.ready) await app.ready
      const stats = await api('games.truthDare.stats')
      this.setData({ stats })
    } catch (e) {
      // stats 加载失败不影响游戏，静默处理
    }
  },

  switchLevel(e) {
    const level = e.currentTarget.dataset.level
    if (level === this.data.level) return
    this.setData({ level })
  },

  async drawTruth() {
    await this.draw('truth')
  },

  async drawDare() {
    await this.draw('dare')
  },

  async draw(type) {
    if (this.data.state === 'submitting' || this.data.flipping) return

    this.setData({ flipping: true })
    try {
      const q = await apiWithToast(
        'games.truthDare.draw',
        { type, level: this.data.level }
      )
      // 给点动画时间
      setTimeout(() => {
        this.setData({
          current: q,
          state: 'showing',
          flipping: false,
          pickedTypeLabel: type === 'truth' ? '真心话' : '大冒险'
        })
      }, 350)
    } catch (e) {
      this.setData({ flipping: false })
    }
  },

  async reroll() {
    if (!this.data.current) return
    await this.draw(this.data.current.type)
  },

  async submitDone() {
    await this.submit('done')
  },

  async submitReject() {
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '确认拒绝？',
        content: '拒绝会扣 10 积分。冷静期内拒绝也会被拦截哦。',
        confirmText: '我拒绝',
        confirmColor: '#FF3B5C',
        success: r => resolve(r.confirm)
      })
    })
    if (!confirm) return
    await this.submit('rejected')
  },

  async submit(result) {
    if (!this.data.current || this.data.state === 'submitting') return
    this.setData({ state: 'submitting' })
    try {
      const res = await apiWithToast(
        'games.truthDare.submit',
        {
          id: this.data.current.id,
          type: this.data.current.type,
          text: this.data.current.text,
          result
        },
        result === 'done' ? '记录中' : '扣分中'
      )
      const sign = res.delta > 0 ? '+' : ''
      wx.showToast({
        title: `${sign}${res.delta} 积分`,
        icon: result === 'done' ? 'success' : 'none'
      })
      const todayDone = this.data.todayDone + (result === 'done' ? 1 : 0)
      const todayReject = this.data.todayReject + (result === 'rejected' ? 1 : 0)
      this.setData({
        current: null,
        state: 'idle',
        pickedTypeLabel: '',
        todayDone,
        todayReject
      })
    } catch (e) {
      // 出错回到 showing 让用户重试
      this.setData({ state: 'showing' })
    }
  },

  cancel() {
    if (this.data.state === 'submitting') return
    this.setData({ current: null, state: 'idle', pickedTypeLabel: '' })
  }
})
