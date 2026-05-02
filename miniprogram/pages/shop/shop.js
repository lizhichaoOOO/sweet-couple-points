// pages/shop/shop.js
const app = getApp()
const { api, apiWithToast } = require('../../utils/cloud.js')

Page({
  data: {
    myPoints: 0,
    hero: null,
    items: [],
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
      const [list, home] = await Promise.all([
        api('rewards.list'),
        api('home.get')
      ])
      // 第一个作为 hero（推荐）
      const hero = list[0] || null
      const items = list.slice(1)
      this.setData({
        hero,
        items,
        myPoints: home.bound ? (home.me && home.me.points) || 0 : 0
      })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async redeem(e) {
    const id = e.currentTarget.dataset.id
    const item = id === (this.data.hero && this.data.hero._id)
      ? this.data.hero
      : this.data.items.find(i => i._id === id)
    if (!item) return

    if (this.data.myPoints < item.price) {
      wx.showToast({ title: '积分不足', icon: 'none' })
      return
    }

    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '确认兑换',
        content: `用 ${item.price} 积分兑换"${item.title}"？`,
        success: r => resolve(r.confirm)
      })
    })
    if (!confirm) return

    try {
      await apiWithToast('rewards.redeem', { rewardId: item._id }, '兑换中')
      wx.showToast({ title: '兑换成功', icon: 'success' })
      await this.loadData()
    } catch (e) {}
  },

  async custom() {
    const title = await this.prompt('奖励名称', '例如：一杯奶茶')
    if (!title) return
    const priceStr = await this.prompt('所需积分', '20')
    if (!priceStr) return
    const price = parseInt(priceStr, 10)
    if (!price || price <= 0) {
      wx.showToast({ title: '积分必须为正整数', icon: 'none' })
      return
    }
    try {
      await apiWithToast('rewards.createCustom', { title: title.trim(), price }, '创建中')
      wx.showToast({ title: '奖励已创建', icon: 'success' })
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
