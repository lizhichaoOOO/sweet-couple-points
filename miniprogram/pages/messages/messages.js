// pages/messages/messages.js
const app = getApp()
const { api, apiWithToast } = require('../../utils/cloud.js')
const { formatDate } = require('../../utils/format.js')

Page({
  data: {
    input: '',
    letters: [],
    stickers: ['💖', '🌸', '⭐', '💎']
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    try {
      if (app.ready) await app.ready
      const res = await api('letters.list', { limit: 30 })
      const mine = app.globalData.openid
      const letters = (res.list || []).map(l => ({
        _id: l._id,
        date: formatDate(new Date(l.createdAt), 'YYYY年MM月DD日'),
        content: l.content,
        likes: l.likes || 0,
        mine: l._openid === mine
      }))
      this.setData({ letters })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },

  onInput(e) {
    this.setData({ input: e.detail.value })
  },

  async send() {
    const content = (this.data.input || '').trim()
    if (!content) {
      wx.showToast({ title: '写点什么吧', icon: 'none' })
      return
    }
    try {
      await apiWithToast('letters.send', { content }, '发送中')
      this.setData({ input: '' })
      wx.showToast({ title: '已发送', icon: 'success' })
      await this.loadData()
    } catch (e) {}
  },

  async writeNew() {
    const content = await new Promise(resolve => {
      wx.showModal({
        title: '写新情书',
        editable: true,
        placeholderText: '说点甜的...',
        confirmText: '发送',
        success: r => resolve(r.confirm ? (r.content || '').trim() : ''),
        fail: () => resolve('')
      })
    })
    if (!content) return
    try {
      await apiWithToast('letters.send', { content }, '发送中')
      wx.showToast({ title: '已发送', icon: 'success' })
      await this.loadData()
    } catch (e) {}
  },

  async likeLetter(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    try {
      await api('letters.like', { id })
      // 本地直接 +1，避免刷新闪烁
      const letters = this.data.letters.map(l =>
        l._id === id ? { ...l, likes: l.likes + 1 } : l
      )
      this.setData({ letters })
    } catch (e) {}
  },

  async longPressLetter(e) {
    const letter = e.currentTarget.dataset.letter
    if (!letter || !letter.mine) return
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '删除留言',
        content: '确认删除这条留言？',
        success: r => resolve(r.confirm)
      })
    })
    if (!confirm) return
    try {
      await apiWithToast('letters.delete', { id: letter._id }, '删除中')
      await this.loadData()
    } catch (e) {}
  }
})
