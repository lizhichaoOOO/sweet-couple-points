// pages/tasks/tasks.js
Page({
  data: {
    activeTab: 'daily',
    tasks: []
  },
  onLoad() {
    // TODO: 拉取任务列表
  },
  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },
  completeTask(e) {
    const id = e.currentTarget.dataset.id
    // TODO: 调云函数完成任务并加分
    console.log('complete task', id)
  },
  addCustomTask() {
    // TODO: 弹出表单创建自定义任务
  }
})
