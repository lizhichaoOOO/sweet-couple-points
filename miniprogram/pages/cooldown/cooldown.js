// pages/cooldown/cooldown.js
Page({
  data: {
    countdown: '15:00',
    remainSec: 900,
    timer: null,
    mineCalm: true,
    partnerCalm: true
  },
  onShow() {
    this.startTimer()
  },
  onHide() {
    if (this.data.timer) clearInterval(this.data.timer)
  },
  startTimer() {
    const timer = setInterval(() => {
      let s = this.data.remainSec - 1
      if (s <= 0) {
        clearInterval(timer)
        s = 0
      }
      const mm = String(Math.floor(s / 60)).padStart(2, '0')
      const ss = String(s % 60).padStart(2, '0')
      this.setData({ remainSec: s, countdown: `${mm}:${ss}` })
    }, 1000)
    this.setData({ timer })
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
