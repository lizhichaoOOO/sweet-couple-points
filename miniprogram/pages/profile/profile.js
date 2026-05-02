// pages/profile/profile.js
const app = getApp()
const { api, apiWithToast } = require('../../utils/cloud.js')

Page({
  data: {
    bound: false,
    myName: '',
    partnerName: 'TA',
    daysTogether: 0,
    photoUrl: '',
    stats: {
      totalPoints: 0,
      completedTasks: 0,
      redeemedRewards: 0
    },
    menus: [
      { icon: '🏠', label: '伴侣管理', url: '/pages/bind/bind' },
      { icon: '📋', label: '积分账本', url: '/pages/ledger/ledger' },
      { icon: '💌', label: '留言板',   url: '/pages/messages/messages' },
      { icon: '😊', label: '心情打卡', url: '/pages/mood/mood' },
      { icon: '🎯', label: '共同目标', url: '/pages/shared-goal/shared-goal' },
      { icon: '🎁', label: '幸运盒',   url: '/pages/lucky-draw/lucky-draw' },
      { icon: '⚠️', label: '惩罚池',   url: '/pages/punishment/punishment' },
      { icon: '🧘', label: '冷静模式', url: '/pages/cooldown/cooldown' },
      { icon: '🌸', label: '纪念日',   url: '/pages/anniversary/anniversary' }
    ]
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    try {
      if (app.ready) await app.ready
      if (!app.globalData.bound) {
        this.setData({
          bound: false,
          myName: (app.globalData.user && app.globalData.user.nickname) || '未绑定',
          partnerName: '未绑定 TA'
        })
        return
      }

      // 并行：情侣信息 + 兑换记录数（做完成任务/兑换次数的简易统计）
      const [info, redemptions] = await Promise.all([
        api('couple.getInfo'),
        api('rewards.listRedemptions').catch(() => ({ list: [] }))
      ])

      this.setData({
        bound: true,
        myName: info.me.nickname || '我',
        partnerName: info.partner.nickname || 'TA',
        daysTogether: info.daysTogether,
        stats: {
          totalPoints: info.me.points,
          completedTasks: 0, // TODO: 加一个 stats 云函数返回完成任务数
          redeemedRewards: (redemptions.list || []).filter(r => r.redeemerOpenid === app.globalData.openid).length
        }
      })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },

  tapMenu(e) {
    const url = e.currentTarget.dataset.url
    if (url) wx.navigateTo({ url })
  },

  async logout() {
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '解除绑定',
        content: '确认和 TA 解除绑定？双方的关系会解除，但历史数据保留。',
        confirmText: '解除',
        confirmColor: '#FF3B5C',
        success: r => resolve(r.confirm)
      })
    })
    if (!confirm) return
    try {
      await apiWithToast('couple.unbind', {}, '解绑中')
      await app.refreshProfile()
      wx.showToast({ title: '已解绑', icon: 'success' })
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 800)
    } catch (e) {}
  }
})
