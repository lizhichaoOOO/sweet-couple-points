// pages/games/drawing/drawing.js
const app = getApp()
const { api, apiWithToast } = require('../../../utils/cloud.js')

Page({
  data: {
    state: 'loading',     // loading / idle / draw-turn / waiting-draw / guess-turn / waiting-guess / judge-turn / waiting-judge / result
    session: null,
    result: null,
    lastResult: null,
    guessInput: '',
    // canvas 配置
    canvasW: 300,
    canvasH: 300,
    isDrawing: false,
    // 画笔轨迹（只在本地，用于清空用）
    strokes: []
  },

  _ctx: null,
  _lastX: null,
  _lastY: null,

  onShow() {
    this.refresh()
  },

  async refresh() {
    this.setData({ state: 'loading' })
    try {
      if (app.ready) await app.ready
      const res = await api('games.drawing.current')
      this.apply(res)
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
      this.setData({ state: 'idle' })
    }
  },

  apply(res) {
    if (res.state === 'none') {
      this.setData({
        state: 'idle',
        session: null,
        result: null,
        lastResult: res.lastResult || null
      })
      return
    }
    this.setData({ state: res.state, session: res.session })
    if (res.state === 'draw-turn') {
      // 准备画布
      setTimeout(() => this.initCanvas(), 50)
    }
  },

  async onStart() {
    try {
      await apiWithToast('games.drawing.start', {}, '抽词中')
      await this.refresh()
    } catch (e) {}
  },

  // ===== canvas 画图 =====

  initCanvas() {
    const query = wx.createSelectorQuery()
    query.select('#drawBoard')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getWindowInfo().pixelRatio
        canvas.width = res[0].width * dpr
        canvas.height = res[0].height * dpr
        ctx.scale(dpr, dpr)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.lineWidth = 4
        ctx.strokeStyle = '#2D1B2E'
        // 白底
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, res[0].width, res[0].height)
        this._canvas = canvas
        this._ctx = ctx
        this._canvasWidth = res[0].width
        this._canvasHeight = res[0].height
      })
  },

  touchStart(e) {
    if (!this._ctx) return
    const { x, y } = e.touches[0]
    this._lastX = x
    this._lastY = y
    this.setData({ isDrawing: true })
  },

  touchMove(e) {
    if (!this._ctx || !this.data.isDrawing) return
    const { x, y } = e.touches[0]
    const ctx = this._ctx
    ctx.beginPath()
    ctx.moveTo(this._lastX, this._lastY)
    ctx.lineTo(x, y)
    ctx.stroke()
    this._lastX = x
    this._lastY = y
  },

  touchEnd() {
    this.setData({ isDrawing: false })
    this._lastX = null
    this._lastY = null
  },

  clearCanvas() {
    if (!this._ctx) return
    this._ctx.fillStyle = '#FFFFFF'
    this._ctx.fillRect(0, 0, this._canvasWidth, this._canvasHeight)
  },

  async submitDrawing() {
    if (!this._canvas) {
      wx.showToast({ title: '画板未就绪', icon: 'none' })
      return
    }
    wx.showLoading({ title: '上传画作', mask: true })
    try {
      // 1. canvas → 临时文件
      const tempFile = await new Promise((resolve, reject) => {
        wx.canvasToTempFilePath({
          canvas: this._canvas,
          success: (r) => resolve(r.tempFilePath),
          fail: reject
        })
      })
      // 2. 上传到云存储
      const sessionId = this.data.session._id
      const cloudPath = `drawings/${sessionId}_${Date.now()}.png`
      const upload = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFile
      })
      const fileID = upload.fileID
      // 3. 告诉后端
      await api('games.drawing.submitDrawing', { sessionId, fileID })
      wx.hideLoading()
      wx.showToast({ title: '已提交，等 TA 猜', icon: 'success' })
      await this.refresh()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e.message || '提交失败', icon: 'none' })
    }
  },

  // ===== 猜 =====

  onGuessInput(e) {
    this.setData({ guessInput: e.detail.value })
  },

  async submitGuess() {
    const g = (this.data.guessInput || '').trim()
    if (!g) {
      wx.showToast({ title: '请输入猜测', icon: 'none' })
      return
    }
    try {
      const res = await apiWithToast(
        'games.drawing.submitGuess',
        { sessionId: this.data.session._id, guess: g },
        '提交中'
      )
      if (res.exactMatch && res.closed) {
        wx.showToast({ title: '完全正确！', icon: 'success' })
        this.setData({ state: 'result', result: res.result, guessInput: '' })
      } else {
        wx.showToast({ title: '已提交，等 TA 判', icon: 'none' })
        this.setData({ guessInput: '' })
        await this.refresh()
      }
    } catch (e) {}
  },

  // ===== 判定 =====

  async judge(correct) {
    try {
      const res = await apiWithToast(
        'games.drawing.judge',
        { sessionId: this.data.session._id, correct },
        '处理中'
      )
      this.setData({ state: 'result', result: res.result })
    } catch (e) {}
  },

  judgeTrue() { this.judge(true) },
  judgeFalse() { this.judge(false) },

  async cancelSession() {
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '取消本局？',
        success: r => resolve(r.confirm)
      })
    })
    if (!confirm) return
    try {
      await apiWithToast('games.drawing.cancel', { sessionId: this.data.session._id }, '处理中')
      await this.refresh()
    } catch (e) {}
  },

  backToIdle() {
    this.refresh()
  }
})
