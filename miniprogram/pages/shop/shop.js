// pages/shop/shop.js
Page({
  data: {
    myPoints: 188,
    hero: {
      id: 0,
      title: '双人观影',
      price: 50,
      image: '🎬'
    },
    items: [
      { id: 1, title: '一起下厨', price: 80, image: '🍳' },
      { id: 2, title: '30分钟肩颈按摩', price: 100, image: '💆' },
      { id: 3, title: '浪漫散步', price: 30, image: '🌸' },
      { id: 4, title: '一杯奶茶', price: 20, image: '🧋' }
    ]
  },
  redeem(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认兑换',
      content: '使用积分兑换该奖励？',
      success: (res) => {
        if (res.confirm) console.log('redeem', id)
      }
    })
  },
  custom() {
    wx.showToast({ title: '自定义奖励', icon: 'none' })
  }
})
