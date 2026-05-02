// pages/timeline/timeline.js
const { api } = require('../../utils/cloud.js')
const { formatDate } = require('../../utils/format.js')

Page({
  data: {
    records: [],
    hasMore: false,
    loading: false,
    skip: 0
  },

  onShow() {
    this.refresh()
  },

  async refresh() {
    this.setData({ skip: 0 })
    await this.load(true)
  },

  async load(reset = false) {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const res = await api('records.list', {
        filter: 'all',
        limit: 20,
        skip: reset ? 0 : this.data.skip
      })
      const mapped = (res.list || []).map(r => this.mapRecord(r))
      this.setData({
        records: reset ? mapped : this.data.records.concat(mapped),
        hasMore: res.hasMore,
        skip: reset ? mapped.length : this.data.skip + mapped.length
      })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  mapRecord(r) {
    const iconMap = {
      add: '❤️',
      task: '❤️',
      deduct: '💔',
      redeem: '🎁',
      goal: '🎯',
      draw: '🎲',
      'draw-bonus': '✨'
    }
    const d = new Date(r.createdAt)
    return {
      _id: r._id,
      icon: iconMap[r.type] || '❤️',
      time: formatDate(d, 'HH:mm'),
      date: formatDate(d, 'MM月DD日'),
      title: r.reason,
      delta: (r.delta > 0 ? '+' : '') + r.delta + '积分'
    }
  },

  async onPullDownRefresh() {
    await this.refresh()
    wx.stopPullDownRefresh()
  },

  async onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      await this.load(false)
    }
  }
})
