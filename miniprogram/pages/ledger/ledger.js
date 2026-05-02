// pages/ledger/ledger.js
const { api } = require('../../utils/cloud.js')
const { formatDate } = require('../../utils/format.js')

Page({
  data: {
    filter: 'all',
    keyword: '',
    records: [],
    loading: false
  },

  _debounce: null,

  onShow() {
    this.reload()
  },

  async reload() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const res = await api('records.list', {
        filter: this.data.filter === 'add' ? 'add' : this.data.filter === 'deduct' ? 'deduct' : 'all',
        keyword: this.data.keyword,
        limit: 50
      })
      const mapped = (res.list || []).map(r => ({
        _id: r._id,
        title: r.reason,
        time: formatDate(new Date(r.createdAt), 'YYYY-MM-DD HH:mm'),
        delta: r.delta,
        type: r.type === 'add' || r.delta > 0 ? 'add' : 'deduct',
        isMine: r.actorOpenid === r.targetOpenid
      }))
      this.setData({ records: mapped })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter
    if (filter === this.data.filter) return
    this.setData({ filter })
    this.reload()
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value })
    // 防抖：停止输入 400ms 后触发
    if (this._debounce) clearTimeout(this._debounce)
    this._debounce = setTimeout(() => this.reload(), 400)
  }
})
