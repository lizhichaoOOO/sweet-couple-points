// pages/tasks/tasks.js
const { api, apiWithToast } = require('../../utils/cloud.js')

Page({
  data: {
    activeTab: 'daily',
    tabs: [
      { key: 'daily',    label: 'Daily\nTasks' },
      { key: 'periodic', label: 'Periodic\nTasks' },
      { key: 'custom',   label: 'Custom\nTasks' }
    ],
    tasks: [],
    loading: false
  },

  onShow() {
    this.loadTasks()
  },

  async switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.activeTab) return
    this.setData({ activeTab: tab })
    await this.loadTasks()
  },

  async loadTasks() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const list = await api('tasks.list', { type: this.data.activeTab })
      this.setData({ tasks: list || [] })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async completeTask(e) {
    const task = e.currentTarget.dataset.task
    if (!task || task.done) return
    try {
      const res = await apiWithToast('tasks.complete', { taskId: task._id }, '打卡中')
      wx.showToast({ title: `+${res.pointsEarned} 积分`, icon: 'success' })
      await this.loadTasks()
    } catch (e) {}
  },

  async addCustom() {
    const { confirm, content } = await this.prompt('任务名称', '例如：叫我起床')
    if (!confirm || !content) return
    const { confirm: c2, content: c2Content } = await this.prompt('奖励积分', '5', 'number')
    if (!c2) return
    const points = parseInt(c2Content, 10)
    if (!points || points <= 0) {
      wx.showToast({ title: '积分必须为正整数', icon: 'none' })
      return
    }
    try {
      await apiWithToast(
        'tasks.createCustom',
        { title: content.trim(), points, period: 'daily' },
        '创建中'
      )
      wx.showToast({ title: '任务已创建', icon: 'success' })
      await this.loadTasks()
    } catch (e) {}
  },

  async longPressTask(e) {
    const task = e.currentTarget.dataset.task
    if (!task || task.preset || this.data.activeTab !== 'custom') return
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '删除任务',
        content: `确认删除"${task.title}"？`,
        success: r => resolve(r.confirm)
      })
    })
    if (!confirm) return
    try {
      await apiWithToast('tasks.deleteCustom', { taskId: task._id }, '删除中')
      await this.loadTasks()
    } catch (e) {}
  },

  prompt(title, placeholder = '', type = 'text') {
    return new Promise(resolve => {
      wx.showModal({
        title,
        editable: true,
        placeholderText: placeholder,
        success: r => resolve({ confirm: r.confirm, content: r.content || '' }),
        fail: () => resolve({ confirm: false, content: '' })
      })
    })
  }
})
