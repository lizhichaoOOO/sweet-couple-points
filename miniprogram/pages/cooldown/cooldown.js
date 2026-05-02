// pages/cooldown/cooldown.js
const app = getApp()
const { api, apiWithToast } = require('../../utils/cloud.js')

Page({
  data: {
    active: false,
    countdown: '--:--',
    remainSec: 0,
    endVoted: false,
    canEndEarly: false,
    loading: false
  },

  _timer: null,

  onShow() {
    this.loadData()
  },
  onHide() {
    this.stopTick()
  },
  onUnload() {
    this.stopTick()
  },

  async loadData() {
    try {
      if (app.ready) await app.ready
      const res = await api('cooldown.getActive')
      if (!res.active) {
        this.setData({ active: false, countdown: '--:--', remainSec: 0 })
        this.stopTick()
        return
      }
      this.setData({
        active: true,
        remainSec: res.remainSec,
        countdown: formatMMSS(res.remainSec),
        endVoted: (res.endVoters || []).includes(app.globalData.openid)
      })
      this.startTick()
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },

  startTick() {
    this.stopTick()
    this._timer = setInterval(() => {
      let s = this.data.remainSec - 1
      if (s <= 0) {
        s = 0
        this.stopTick()
        // 到期后自动刷新状态
        setTimeout(() => this.loadData(), 500)
      }
      this.setData({ remainSec: s, countdown: formatMMSS(s) })
    }, 1000)
  },
  stopTick() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  async startCooldown() {
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '开启冷静期',
        content: '开启后 30 分钟内双方都不能扣分，两人都同意才能提前结束。',
        success: r => resolve(r.confirm)
      })
    })
    if (!confirm) return
    try {
      await apiWithToast('cooldown.start', { durationMin: 30 }, '开启中')
      await this.loadData()
    } catch (e) {}
  },

  async extend() {
    try {
      await apiWithToast('cooldown.extend', { additionalMin: 10 }, '延长中')
      wx.showToast({ title: '已延长 10 分钟', icon: 'success' })
      await this.loadData()
    } catch (e) {}
  },

  async endEarly() {
    if (this.data.endVoted) {
      wx.showToast({ title: '你已同意结束，等 TA 确认', icon: 'none' })
      return
    }
    try {
      const res = await apiWithToast('cooldown.requestEnd', {}, '请求中')
      if (res.ended) {
        wx.showToast({ title: '冷静期已结束', icon: 'success' })
      } else {
        wx.showToast({ title: '已同意，等待对方确认', icon: 'none' })
        this.setData({ endVoted: true })
      }
      setTimeout(() => this.loadData(), 600)
    } catch (e) {}
  }
})

function formatMMSS(sec) {
  const mm = String(Math.floor(sec / 60)).padStart(2, '0')
  const ss = String(sec % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
