// pages/mood/mood.js
Page({
  data: {
    todayMood: null,
    moods: ['😊', '😐', '😢', '😡', '🥰', '😴'],
    history: []
  },
  onLoad() {
    // TODO: 拉取今日和历史心情
  },
  pickMood(e) {
    const mood = e.currentTarget.dataset.mood
    this.setData({ todayMood: mood })
    // TODO: 调云函数保存心情
  }
})
