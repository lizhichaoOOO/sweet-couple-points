// pages/tasks/tasks.js
Page({
  data: {
    activeTab: 'daily',
    tabs: [
      { key: 'daily', label: 'Daily\nTasks' },
      { key: 'periodic', label: 'Periodic\nTasks' },
      { key: 'custom', label: 'Custom\nTasks' }
    ],
    tasks: {
      daily: [
        { id: 1, title: 'Say Good Morning', icon: '☀️', points: [5], done: false },
        { id: 2, title: 'Cook Dinner', icon: '🍲', points: [5, 10, 5], done: false },
        { id: 3, title: 'Wash Dishes', icon: '🍽️', points: [], done: true }
      ],
      periodic: [
        { id: 4, title: 'Weekly Date', icon: '💕', points: [20], done: false },
        { id: 5, title: 'Weekly Cleaning', icon: '🧹', points: [15], done: false }
      ],
      custom: []
    }
  },
  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },
  toggleTask(e) {
    const id = e.currentTarget.dataset.id
    const tab = this.data.activeTab
    const list = this.data.tasks[tab].map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    )
    this.setData({ [`tasks.${tab}`]: list })
  },
  addCustom() {
    wx.showToast({ title: '新建自定义任务', icon: 'none' })
  }
})
