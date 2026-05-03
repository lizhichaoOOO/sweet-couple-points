// pages/games/rps/rps.js
const app = getApp()
const { api, apiWithToast } = require('../../../utils/cloud.js')

// 选项文案映射
const LABELS = {
  rock: { label: '石头', emoji: '✊' },
  paper: { label: '布',   emoji: '✋' },
  scissors: { label: '剪刀', emoji: '✌️' },
  person: { label: '小人', emoji: '🧍' },
  tiger: { label: '老虎', emoji: '🐯' },
  gun: { label: '枪',   emoji: '🔫' }
}

const VARIANT_UI = [
  { key: 'classic',  title: '石头剪刀布',     desc: '经典三选一',         emoji: '✊✌️✋' },
  { key: 'xlq',      title: '小人老虎枪',     desc: '老虎吃小人·小人拿枪·枪打老虎', emoji: '🧍🐯🔫' },
  { key: 'num',      title: '十五二十',       desc: '猜总数 + 出手数',    emoji: '🔢' },
  { key: 'twohand',  title: '双手石头剪刀布', desc: '双手出 → 保留一只',  emoji: '🤜🤛' },
  { key: 'dice',     title: '筛子大小',       desc: '各摇 3 颗，和大者胜', emoji: '🎲' }
]

Page({
  data: {
    state: 'loading',      // loading / idle / choose-move / wait-partner / choose-keep / result
    variantUI: VARIANT_UI,
    labels: LABELS,        // 前端 wxml 里查 emoji/label 用
    session: null,
    variantInfo: null,     // 后端返回的当前变体详情
    lastResult: null,
    result: null,

    // move 构造中间态
    selectedChoice: '',    // classic/xlq 的选择
    selectedHands: [],     // twohand 第一轮
    numGuess: null,
    numValue: null,
    diceRolling: false,
    diceTempView: [1, 1, 1],
    diceFinal: null,

    // keep 阶段
    selectedKeep: '',

    // 数字变体选项
    numGuesses: [0, 5, 10, 15, 20],
    numValues: [0, 5, 10]
  },

  _diceTimer: null,

  onShow() {
    this.refresh()
  },

  onHide() {
    this.stopDiceRoll()
  },

  onUnload() {
    this.stopDiceRoll()
  },

  async refresh() {
    this.setData({ state: 'loading' })
    try {
      if (app.ready) await app.ready
      const res = await api('games.rps.current')
      this.applyCurrent(res)
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
      this.setData({ state: 'idle' })
    }
  },

  applyCurrent(res) {
    // none
    if (res.state === 'none') {
      this.setData({
        state: 'idle',
        session: null,
        lastResult: res.lastResult || null,
        result: null,
        // 清理 move 中间态
        selectedChoice: '', selectedHands: [], numGuess: null, numValue: null,
        diceFinal: null, selectedKeep: ''
      })
      return
    }

    const s = res.session
    // 已出过 / 没出
    if (res.state === 'await-my-move') {
      this.setData({
        state: 'choose-move',
        session: s,
        variantInfo: res.variantInfo,
        selectedChoice: '', selectedHands: [], numGuess: null, numValue: null,
        diceFinal: null
      })
    } else if (res.state === 'await-partner-move') {
      this.setData({
        state: 'wait-partner',
        session: s,
        variantInfo: res.variantInfo
      })
    } else if (res.state === 'await-my-keep') {
      this.setData({
        state: 'choose-keep',
        session: s,
        variantInfo: res.variantInfo,
        selectedKeep: ''
      })
    } else if (res.state === 'await-partner-keep') {
      this.setData({
        state: 'wait-partner',
        session: s,
        variantInfo: res.variantInfo
      })
    }
  },

  // === idle：选变体开始 ===
  async pickVariant(e) {
    const variant = e.currentTarget.dataset.key
    try {
      await apiWithToast('games.rps.start', { variant }, '开局中')
      await this.refresh()
    } catch (e) {}
  },

  // === 经典 / 小人老虎枪 ===
  chooseOne(e) {
    const choice = e.currentTarget.dataset.choice
    this.setData({ selectedChoice: choice })
  },

  async submitClassicOrXlq() {
    if (!this.data.selectedChoice) {
      wx.showToast({ title: '请先选一个', icon: 'none' })
      return
    }
    await this.doSubmitMove({ choice: this.data.selectedChoice })
  },

  // === 十五二十 ===
  pickGuess(e) {
    this.setData({ numGuess: Number(e.currentTarget.dataset.n) })
  },
  pickValue(e) {
    this.setData({ numValue: Number(e.currentTarget.dataset.n) })
  },
  async submitNum() {
    const { numGuess, numValue } = this.data
    if (numGuess === null || numValue === null) {
      wx.showToast({ title: '猜数和出数都要选', icon: 'none' })
      return
    }
    await this.doSubmitMove({ guess: numGuess, value: numValue })
  },

  // === 双手石头剪刀布 第 1 轮 ===
  pickHand(e) {
    const hand = e.currentTarget.dataset.hand
    const hands = this.data.selectedHands.slice()
    if (hands.length >= 2) {
      hands.shift() // 满了就弹出第一只
    }
    hands.push(hand)
    this.setData({ selectedHands: hands })
  },
  clearHands() {
    this.setData({ selectedHands: [] })
  },
  async submitTwohandRound1() {
    const hands = this.data.selectedHands
    if (hands.length !== 2) {
      wx.showToast({ title: '请出 2 只手', icon: 'none' })
      return
    }
    await this.doSubmitMove({ hands })
  },

  // === 双手 第 2 轮：保留 ===
  pickKeep(e) {
    this.setData({ selectedKeep: e.currentTarget.dataset.hand })
  },
  async submitKeep() {
    const keep = this.data.selectedKeep
    if (!keep) {
      wx.showToast({ title: '请选一只保留', icon: 'none' })
      return
    }
    try {
      const res = await apiWithToast(
        'games.rps.submitKeep',
        { sessionId: this.data.session._id, keep },
        '结算中'
      )
      if (res.closed) {
        this.setData({ state: 'result', result: this.enrichResult(res.result) })
      } else {
        this.setData({ state: 'wait-partner' })
      }
    } catch (e) {}
  },

  // === 筛子 ===
  startDiceRoll() {
    if (this.data.diceRolling || this.data.diceFinal) return
    this.setData({ diceRolling: true })
    // 动画：前面几秒显示随机数，然后调后端"摇一次"
    this._diceTimer = setInterval(() => {
      this.setData({
        diceTempView: [randDie(), randDie(), randDie()]
      })
    }, 80)
    setTimeout(() => this.finishDiceRoll(), 1500)
  },
  stopDiceRoll() {
    if (this._diceTimer) {
      clearInterval(this._diceTimer)
      this._diceTimer = null
    }
  },
  async finishDiceRoll() {
    this.stopDiceRoll()
    try {
      const res = await apiWithToast(
        'games.rps.submitMove',
        { sessionId: this.data.session._id, move: {} },
        '计算中'
      )
      if (res.closed) {
        this.setData({
          diceRolling: false,
          state: 'result',
          result: this.enrichResult(res.result)
        })
      } else if (res.waitingForPartner) {
        this.setData({
          diceRolling: false,
          diceFinal: res.myMove.dice,
          state: 'wait-partner'
        })
      }
    } catch (e) {
      this.setData({ diceRolling: false })
    }
  },

  // === 公共：提交 move ===
  async doSubmitMove(move) {
    try {
      const res = await apiWithToast(
        'games.rps.submitMove',
        { sessionId: this.data.session._id, move },
        '提交中'
      )
      if (res.closed) {
        this.setData({ state: 'result', result: this.enrichResult(res.result) })
      } else if (res.nextStage === 'await-keep') {
        // 双手：进入保留阶段
        await this.refresh()
      } else {
        this.setData({ state: 'wait-partner' })
      }
    } catch (e) {}
  },

  // result 数据预处理（算骰子和 / 提取 num 详情等）
  enrichResult(r) {
    if (!r) return r
    const r2 = Object.assign({}, r)
    if (r.variant === 'dice') {
      r2.mySum = sum((r.myMove || {}).dice || [])
      r2.partnerSum = sum((r.partnerMove || {}).dice || [])
    }
    return r2
  },

  // === 其他 ===
  async cancelSession() {
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '取消本局？',
        content: '取消后本局作废。',
        confirmText: '取消',
        confirmColor: '#FF3B5C',
        success: r => resolve(r.confirm)
      })
    })
    if (!confirm) return
    try {
      await apiWithToast(
        'games.rps.cancel',
        { sessionId: this.data.session._id },
        '处理中'
      )
      await this.refresh()
    } catch (e) {}
  },

  backToIdle() {
    this.refresh()
  }
})

function randDie() {
  return 1 + Math.floor(Math.random() * 6)
}

function sum(arr) {
  return (arr || []).reduce((s, n) => s + n, 0)
}
