// pages/messages/messages.js
Page({
  data: {
    messages: [],
    inputText: ''
  },
  onLoad() {
    // TODO: 拉取留言列表
  },
  onInput(e) {
    this.setData({ inputText: e.detail.value })
  },
  sendMessage() {
    const text = this.data.inputText.trim()
    if (!text) return
    // TODO: 调云函数发送留言
    this.setData({ inputText: '' })
  }
})
