// pages/ledger/ledger.js
const ALL_RECORDS = [
  { id: 1, title: '一起看电影', time: '2024-05-20 19:30', delta: 100, type: 'add' },
  { id: 2, title: '事由', time: '2024-05-20 19:30', type: 'by', actor: '男友发起' },
  { id: 3, title: '忘记纪念日', time: '2024-05-21 22:00', delta: -50, type: 'deduct' },
  { id: 4, title: '事田', time: '2024-05-21 22:00', type: 'by', actor: '女友发起' }
]

Page({
  data: {
    filter: 'all',
    keyword: '',
    records: ALL_RECORDS
  },
  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ filter }, () => this.applyFilter())
  },
  onInput(e) {
    this.setData({ keyword: e.detail.value }, () => this.applyFilter())
  },
  applyFilter() {
    const { filter, keyword } = this.data
    const kw = keyword.trim()
    const records = ALL_RECORDS.filter(r => {
      if (filter === 'add' && r.type !== 'add') return false
      if (filter === 'deduct' && r.type !== 'deduct') return false
      if (kw && !r.title.includes(kw)) return false
      return true
    })
    this.setData({ records })
  }
})
