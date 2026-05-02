// pages/mood/mood.js
const app = getApp()
const { api, apiWithToast } = require('../../utils/cloud.js')
const { formatDate } = require('../../utils/format.js')

Page({
  data: {
    myMood: '',
    partnerMood: '',
    moods: [
      { key: 'happy', emoji: '😊', color: '#FFD56B' },
      { key: 'love',  emoji: '❤️', color: '#FF6B8A' },
      { key: 'calm',  emoji: '😌', color: '#9BC7FF' },
      { key: 'sad',   emoji: '😢', color: '#A0C9FF' },
      { key: 'tired', emoji: '😐', color: '#B8B8B8' },
      { key: 'angry', emoji: '😠', color: '#FF7A7A' }
    ],
    input: '',
    weekTrack: []
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    try {
      if (app.ready) await app.ready
      const [today, week] = await Promise.all([
        api('mood.getToday'),
        api('mood.getWeek')
      ])
      const map = {}
      ;(week.list || []).forEach(m => {
        map[m.date] = m.mood
      })
      // 近 7 天
      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = formatDate(d, 'YYYY-MM-DD')
        const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
        days.push({
          date: dateStr,
          day: i === 0 ? '今天' : labels[d.getDay()],
          mood: map[dateStr] || '•'
        })
      }

      this.setData({
        myMood: today.mine ? today.mine.mood : '',
        partnerMood: today.partner ? today.partner.mood : '',
        input: today.mine ? (today.mine.note || '') : '',
        weekTrack: days
      })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },

  async pickMood(e) {
    const mood = e.currentTarget.dataset.mood
    if (mood === this.data.myMood) return
    this.setData({ myMood: mood })
    try {
      await apiWithToast('mood.set', { mood, note: this.data.input }, '保存中')
      wx.showToast({ title: '已更新', icon: 'success' })
      // 不重新拉取，本地已更新
      // 但更新一周轨迹里的今天
      const today = formatDate(new Date(), 'YYYY-MM-DD')
      const weekTrack = this.data.weekTrack.map(d =>
        d.date === today ? { ...d, mood } : d
      )
      this.setData({ weekTrack })
    } catch (e) {
      // 回滚
      await this.loadData()
    }
  },

  onInputChange(e) {
    this.setData({ input: e.detail.value })
  },

  async saveNote() {
    if (!this.data.myMood) {
      wx.showToast({ title: '先选一个心情', icon: 'none' })
      return
    }
    try {
      await apiWithToast('mood.set', { mood: this.data.myMood, note: this.data.input }, '保存中')
      wx.showToast({ title: '已保存', icon: 'success' })
    } catch (e) {}
  }
})
