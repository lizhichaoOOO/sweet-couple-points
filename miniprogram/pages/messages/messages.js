// pages/messages/messages.js
Page({
  data: {
    input: '',
    letters: [
      { id: 1, date: '2025年5月20日', content: '今天一起看的日落，比昨天的更温柔', likes: 32, avatar: '' },
      { id: 2, date: '2025年5月20日', content: '今天一起看的日落，比昨天的更温柔', likes: 32, avatar: '' },
      { id: 3, date: '2025年5月20日', content: '文字一起的的爱的笑意。', likes: 0, avatar: '', mode: 'text' }
    ],
    stickers: ['💖', '🌸', '⭐', '💎']
  },
  onInput(e) {
    this.setData({ input: e.detail.value })
  },
  send() {
    wx.showToast({ title: '已发送', icon: 'success' })
  },
  writeNew() {
    wx.showToast({ title: '写新情书', icon: 'none' })
  }
})
