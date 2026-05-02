// pages/lucky-draw/lucky-draw.js
const app = getApp()
const { api, apiWithToast } = require('../../utils/cloud.js')

Page({
  data: {
    myPoints: 0,
    drawing: false,
    pool: [
      { rarity: 'common',    name: '普通', color: '#B0D4F1', icon: '🎁' },
      { rarity: 'rare',      name: '稀有', color: '#FFB6CE', icon: '📦' },
      { rarity: 'legendary', name: '传说', color: '#FFB07C', icon: '👛' }
    ],
    history: []
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    try {
      if (app.ready) await app.ready
      const [info, hist] = await Promise.all([
        api('couple.getInfo'),
        api('luckyDraw.history').catch(() => ({ list: [] }))
      ])
      this.setData({
        myPoints: info.me.points,
        history: hist.list || []
      })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },

  async draw() {
    if (this.data.drawing) return
    if (this.data.myPoints < 20) {
      wx.showToast({ title: '积分不足 20', icon: 'none' })
      return
    }
    this.setData({ drawing: true })
    try {
      const res = await apiWithToast('luckyDraw.draw', {}, '抽取中')
      const rarity = res.rarity
      const prize = res.prize
      const bonus = prize.bonus ? ` +${prize.bonus} 积分` : ''
      wx.showModal({
        title: `${rarityEmoji(rarity)} ${rarity.toUpperCase()}`,
        content: `${prize.icon} ${prize.name}${bonus}`,
        showCancel: false,
        confirmText: '收下'
      })
      await this.loadData()
    } catch (e) {
    } finally {
      this.setData({ drawing: false })
    }
  }
})

function rarityEmoji(rarity) {
  return rarity === 'legendary' ? '⭐⭐⭐' : rarity === 'rare' ? '⭐⭐' : '⭐'
}
