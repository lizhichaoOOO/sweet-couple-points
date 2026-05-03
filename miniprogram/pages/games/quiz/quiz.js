// pages/games/quiz/quiz.js
const app = getApp()
const { api, apiWithToast } = require('../../../utils/cloud.js')

Page({
  data: {
    state: 'loading',     // loading / idle / answering / waiting / result
    sessionId: '',
    questions: [],
    answers: [],          // 本地暂存的答案 [null, 2, 0, ...]
    currentIndex: 0,      // 当前答题索引
    canSubmit: false,     // 所有题都答了才为 true
    result: null,
    lastResult: null,     // 上一次的结果（idle 状态展示）
    loading: false
  },

  onShow() {
    this.refresh()
  },

  async refresh() {
    if (this.data.loading) return
    this.setData({ loading: true, state: 'loading' })
    try {
      if (app.ready) await app.ready
      const res = await api('games.quiz.current')
      this.applyCurrent(res)
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
      this.setData({ state: 'idle' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 把 games.quiz.current 返回值映射到 state
  applyCurrent(res) {
    if (res.state === 'mine-pending') {
      // 我还没答
      const s = res.session
      const answers = new Array(s.questions.length).fill(null)
      this.setData({
        state: 'answering',
        sessionId: s._id,
        questions: s.questions,
        answers,
        currentIndex: 0,
        result: null
      })
    } else if (res.state === 'partner-pending') {
      // 我答完了等 TA
      this.setData({
        state: 'waiting',
        sessionId: res.session._id,
        questions: res.session.questions,
        result: null
      })
    } else if (res.state === 'closed') {
      // 理论上 current 不会返回 closed，兜底
      this.setData({ state: 'idle' })
    } else {
      // none
      this.setData({
        state: 'idle',
        lastResult: res.lastResult || null
      })
    }
  },

  async onStart() {
    try {
      const res = await apiWithToast('games.quiz.start', {}, '准备题目')
      const answers = new Array(res.questions.length).fill(null)
      this.setData({
        state: 'answering',
        sessionId: res.sessionId,
        questions: res.questions,
        answers,
        currentIndex: 0,
        result: null
      })
    } catch (e) {}
  },

  pickOption(e) {
    const { idx, opt } = e.currentTarget.dataset
    const answers = this.data.answers.slice()
    answers[idx] = opt
    const canSubmit = answers.every(a => a !== null)
    this.setData({ answers, canSubmit })
    // 选完自动下一题（最后一题不动）
    if (idx < this.data.questions.length - 1) {
      setTimeout(() => {
        this.setData({ currentIndex: idx + 1 })
      }, 300)
    }
  },

  prevQuestion() {
    const i = this.data.currentIndex
    if (i > 0) this.setData({ currentIndex: i - 1 })
  },

  nextQuestion() {
    const i = this.data.currentIndex
    if (i < this.data.questions.length - 1) {
      this.setData({ currentIndex: i + 1 })
    }
  },

  jumpTo(e) {
    const idx = e.currentTarget.dataset.idx
    this.setData({ currentIndex: idx })
  },

  allAnswered() {
    return this.data.answers.every(a => a !== null)
  },

  async submitAll() {
    if (!this.allAnswered()) {
      wx.showToast({ title: '还有题没答', icon: 'none' })
      return
    }    try {
      const res = await apiWithToast(
        'games.quiz.submit',
        {
          sessionId: this.data.sessionId,
          answers: this.data.answers
        },
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
        title: '取消这次测试？',
        content: '取消后本次题目会作废，对方也就不能再参与了。',
        confirmText: '取消',
        confirmColor: '#FF3B5C',
        success: r => resolve(r.confirm)
      })
    })
    if (!confirm) return
    try {
      await apiWithToast(
        'games.quiz.cancel',
        { sessionId: this.data.sessionId },
        '处理中'
      )
      await this.refresh()
    } catch (e) {}
  },

  backToIdle() {
    this.setData({
      state: 'idle',
      sessionId: '',
      questions: [],
      answers: [],
      result: null
    })
    // 刷新一下拿最新 lastResult
    this.refresh()
  }
})
