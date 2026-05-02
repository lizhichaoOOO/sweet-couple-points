// pages/cooldown/cooldown.js
Page({
  data: {
    countdown: '15:00',
    remainSec: 900,
    mineCalm: true,
    partnerCalm: true
  },

  // 不放进 data：setInterval ID 不需要渲染，放 this 上避免每秒触发多余 setData
  _timer: null,

  onShow() {
    this.startTimer()
  },
  onHide() {
    this.stopTimer()
  },
  onUnload() {
    this.stopTimer()
  },
  startTimer() {
    this.stopTimer()
    this._timer = setInterval(() => {
      let s = this.data.remainSec - 1
      if (s <= 0) {
        s = 0
        this.stopTimer()
      }
      const mm = String(Math.floor(s / 60)).padStart(2, '0')
      const ss = String(s % 60).padStart(2, '0')
      this.setData({ remainSec: s, countdown: `${mm}:${ss}` })
    }, 1000)
  },
  stopTimer() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },
  extend() {
    this.setData({ remainSec: this.data.remainSec + 600 })
  },
  endEarly() {
    wx.showModal({
      title: '提前结束冷静期',
      content: '需要双方都同意才能提前结束',
      success: () => {}
    })
  }
})
