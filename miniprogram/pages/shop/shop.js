// pages/shop/shop.js
Page({
  data: {
    myPoints: 0,
    items: []
  },
  onLoad() {
    // TODO: 拉取奖励商品列表和当前积分
  },
  redeem(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认兑换',
      content: '使用积分兑换该奖励？',
      success: (res) => {
        if (res.confirm) {
          // TODO: 调云函数扣分并生成兑换记录
          console.log('redeem', id)
        }
      }
    })
  }
})
