// pages/index/index.js
const app = getApp()

Page({
  data: {
    bound: true,
    myInfo: { nickname: '男友', avatar: '', points: 88 },
    partnerInfo: { nickname: '女友', avatar: '', points: 92 },
    daysToghter: 128,
    todayTasks: [
      { id: 1, title: '一起做早餐', done: false },
      { id: 2, title: '一起看电影', done: false },
      { id: 3, title: '一起散步', done: false }
    ]
  },
  onLoad() {},
  onShow() {
    this.refresh()
  },
  refresh() {},
  toggleTask(e) {
    const id = e.currentTarget.dataset.id
    const tasks = this.data.todayTasks.map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    )
    this.setData({ todayTasks: tasks })
  },
  addPoints() {
    wx.showToast({ title: '加分', icon: 'none' })
  },
  deductPoints() {
    wx.showToast({ title: '扣分', icon: 'none' })
  },
  goBind() {
    wx.navigateTo({ url: '/pages/bind/bind' })
  }
})
