// pages/games/who-knows/who-knows.js
const app = getApp()
const { api, apiWithToast } = require('../../../utils/cloud.js')

Page({
  data: {
    state: 'loading',    // loading / idle / answering / waiting / result
    sessionId: '',
    questions: [],       // 每题有 {id, text, options, subject}
    answers: [],
    currentIndex: 0,
    canSubmit: false,
    result: null,
    lastResult: null,
    myOpenid: ''
  },

  onShow() {
    this.refresh()
  },

  async refresh() {
    this.setData({ state: 'loading' })
    try {
      if (app.ready) await app.ready
      this.setData({ myOpenid: app.globalData.openid })
      const res = await api('games.whoKnows.current')
      this.apply(res)
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
      this.setData({ state: 'idle' })
    }
  },

  apply(res) {
    if (res.state === 'mine-pending') {
      const qs = res.session.questions
      this.setData({
        state: 'answering',
        sessionId: res.session._id,
        questions: qs,
        answers: new Array(qs.length).fill(null),
        currentIndex: 0,
        canSubmit: false,
        result: null
      })
    } else if (res.state === 'partner-pending') {
      this.setData({
        state: 'waiting',
        sessionId: res.session._id,
        result: null
      })
    } else if (res.state === 'none') {
      this.setData({
        state: 'idle',
        sessionId: '',
        questions: [],
        answers: [],
        result: null,
        lastResult: res.lastResult || null
      })
    }
  },

  async onStart() {
    try {
      await apiWithToast('games.whoKnows.start', {}, '出题中')
      await this.refresh()
    } catch (e) {}
  },

  pickOption(e) {
    const { idx, opt } = e.currentTarget.dataset
    const answers = this.data.answers.slice()
    answers[idx] = opt
    const canSubmit = answers.every(a => a !== null)
    this.setData({ answers, canSubmit })
    if (idx < this.data.questions.length - 1) {
      setTimeout(() => this.setData({ currentIndex: idx + 1 }), 280)
    }
  },

  prev() {
    const i = this.data.currentIndex
    if (i > 0) this.setData({ currentIndex: i - 1 })
  },
  next() {
    const i = this.data.currentIndex
    if (i < this.data.questions.length - 1) this.setData({ currentIndex: i + 1 })
  },
  jumpTo(e) {
    this.setData({ currentIndex: e.currentTarget.dataset.idx })
  },

  async submitAll() {
    if (!this.data.canSubmit) {
      wx.showToast({ title: '还有题没答', icon: 'none' })
      return
    }
    try {
      const res = await apiWithToast(
        'games.whoKnows.submit',
        { sessionId: this.data.sessionId, answers: this.data.answers },
        '提交中'
      )
      if (res.closed) {
        this.setData({ state: 'result', result: res.result })
      } else {
        this.setData({ state: 'waiting' })
      }
    } catch (e) {}
  },

  async cancelSession() {
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '取消本次测试？',
        success: r => resolve(r.confirm)
      })
    })
    if (!confirm) return
    try {
      await apiWithToast('games.whoKnows.cancel', { sessionId: this.data.sessionId }, '处理中')
      await this.refresh()
    } catch (e) {}
  },

  backToIdle() {
    this.refresh()
  }
})
