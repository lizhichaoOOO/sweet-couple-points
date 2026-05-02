// pages/anniversary/anniversary.js
const app = getApp()
const { api, apiWithToast } = require('../../utils/cloud.js')
const { formatDate } = require('../../utils/format.js')

Page({
  data: {
    totalDays: 0,
    list: []
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    try {
      if (app.ready) await app.ready
      const [info, anniv] = await Promise.all([
        api('couple.getInfo'),
        api('anniversary.list')
      ])
      const list = (anniv || []).map((a, i) => ({
        _id: a._id,
        title: a.title,
        emoji: a.emoji || '🌸',
        nextLabel: a.nextLabel || '纪念日',
        date: formatDate(new Date(a.date), 'YYYY-MM-DD'),
        countdown: a.countdown,
        big: i === (anniv.length - 1) && anniv.length % 2 === 1 // 末尾单张占满
      }))
      this.setData({
        totalDays: info.daysTogether || 0,
        list
      })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },

  async addAnniversary() {
    const title = await this.prompt('纪念日名称', '例如：认识 100 天')
    if (!title) return

    let dateStr = ''
    await new Promise(resolve => {
      wx.showActionSheet({
        itemList: ['年度循环（生日、在一起纪念日）', '一次性（毕业典礼、搬家）'],
        success: r => {
          const repeat = r.tapIndex === 0 ? 'yearly' : 'none'
          this._pickDate(title, repeat).then(resolve)
        },
        fail: () => resolve()
      })
    })
  },

  async _pickDate(title, repeat) {
    // 由于没有原生日期选择弹窗 API，引导输入 YYYY-MM-DD
    const dateStr = await this.prompt('日期 (YYYY-MM-DD)', formatDate(new Date(), 'YYYY-MM-DD'))
    if (!dateStr) return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      wx.showToast({ title: '日期格式错误', icon: 'none' })
      return
    }
    try {
      await apiWithToast(
        'anniversary.create',
        { title, date: dateStr, repeat, nextLabel: title.includes('生日') ? '生日' : '纪念日' },
        '创建中'
      )
      wx.showToast({ title: '已添加', icon: 'success' })
      await this.loadData()
    } catch (e) {}
  },

  async longPressItem(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '删除纪念日',
        content: '确认删除这个纪念日？',
        success: r => resolve(r.confirm)
      })
    })
    if (!confirm) return
    try {
      await apiWithToast('anniversary.delete', { id }, '删除中')
      await this.loadData()
    } catch (e) {}
  },

  prompt(title, placeholder = '') {
    return new Promise(resolve => {
      wx.showModal({
        title,
        editable: true,
        placeholderText: placeholder,
        success: r => resolve(r.confirm ? (r.content || '').trim() : ''),
        fail: () => resolve('')
      })
    })
  }
})
