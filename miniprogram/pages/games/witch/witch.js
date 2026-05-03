// pages/games/witch/witch.js
const app = getApp()
const { api, apiWithToast } = require('../../../utils/cloud.js')

Page({
  data: {
    state: 'loading',   // loading / idle / pick-my-poison / wait-partner-poison / my-turn / partner-turn / result
    session: null,
    result: null,
    lastResult: null,
    gridSize: 25,
    // 本地选中的"我要下毒的"格子（仅在 pick-my-poison 阶段有用）
    selectedPoison: null,
    // 格子渲染视图
    cells: [],
    // 最近一次被吃的效果
    flashCell: -1,
    // 动画：中毒时的抖动
    poisonAnimating: false
  },

  onShow() {
    this.refresh()
  },

  async refresh() {
    this.setData({ state: 'loading' })
    try {
      if (app.ready) await app.ready
      const res = await api('games.witch.current')
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
        lastResult: res.lastResult || null,
        selectedPoison: null,
        cells: []
      })
      return
    }
    // 把 session 转换成可渲染的 cells
    const s = res.session
    const cells = buildCellsView(s)
    this.setData({
      state: res.state,
      session: s,
      cells,
      selectedPoison: res.state === 'pick-my-poison' ? null : s.myPoison
    })
  },

  async onStart() {
    try {
      await apiWithToast('games.witch.start', {}, '开局中')
      await this.refresh()
    } catch (e) {}
  },

  // === pick-my-poison：点格子选毒 ===
  selectPoison(e) {
    const cell = Number(e.currentTarget.dataset.cell)
    this.setData({ selectedPoison: cell })
    // 实时更新 cells，让被选中的加高亮
    const cells = this.data.cells.map(c =>
      Object.assign({}, c, { selected: c.cell === cell })
    )
    this.setData({ cells })
  },

  async confirmPoison() {
    if (this.data.selectedPoison == null) {
      wx.showToast({ title: '选一颗下毒', icon: 'none' })
      return
    }
    try {
      await apiWithToast(
        'games.witch.setPoison',
        { cell: this.data.selectedPoison },
        '下毒中'
      )
      await this.refresh()
    } catch (e) {}
  },

  // === playing：吃草莓 ===
  async eatCell(e) {
    if (this.data.state !== 'my-turn') return
    const cell = Number(e.currentTarget.dataset.cell)
    const targetCell = this.data.cells.find(c => c.cell === cell)
    if (!targetCell || targetCell.eaten) return

    this.setData({ flashCell: cell })
    try {
      const res = await apiWithToast(
        'games.witch.pickCell',
        { cell },
        '吃草莓..'
      )
      if (res.gameOver) {
        const isLost = !!res.lost
        if (isLost) {
          this.setData({ poisonAnimating: true })
          setTimeout(() => this.setData({ poisonAnimating: false }), 1000)
        }
        const cells = buildCellsView({
          picked: res.result.picked,
          myPoison: res.result.myPoison,
          partnerPoison: res.result.partnerPoison,
          gridSize: res.result.gridSize
        })
        this.setData({ state: 'result', result: res.result, cells })
      } else {
        // 继续：换对方回合
        await this.refresh()
        if (res.isOwnPoison) {
          wx.showToast({ title: '这颗是你自己的毒 🫢', icon: 'none' })
        }
      }
    } catch (e) {}
  },

  async cancelSession() {
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '取消本局？',
        content: '只在对方还没下毒时才能取消。',
        success: r => resolve(r.confirm)
      })
    })
    if (!confirm) return
    try {
      await apiWithToast('games.witch.cancel', {}, '处理中')
      await this.refresh()
    } catch (e) {}
  },

  backToIdle() {
    this.refresh()
  }
})

// 根据 session 构造 cells 渲染数据
// cell: { cell, eaten, eatenByMe, eatenByPartner, myPoison, partnerPoison(仅结算后), selected }
function buildCellsView(s) {
  const picked = s.picked || []
  const pickedMap = {}
  picked.forEach(p => { pickedMap[p.cell] = p.openid })

  const cells = []
  for (let i = 0; i < s.gridSize; i++) {
    const eaten = pickedMap[i] !== undefined
    cells.push({
      cell: i,
      eaten,
      eatenBy: pickedMap[i] || null,
      myPoison: s.myPoison === i,
      partnerPoison: s.partnerPoison === i,  // null 除非已结算
      selected: false
    })
  }
  return cells
}
