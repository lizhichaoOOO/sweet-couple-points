// pages/mood/mood.js
Page({
  data: {
    myMood: '😊',
    partnerMood: '🥰',
    moods: [
      { key: 'happy', emoji: '😊', color: '#FFD56B' },
      { key: 'love',  emoji: '❤️', color: '#FF6B8A' },
      { key: 'calm',  emoji: '😌', color: '#9BC7FF' },
      { key: 'sad',   emoji: '😢', color: '#A0C9FF' },
      { key: 'tired', emoji: '😐', color: '#B8B8B8' },
      { key: 'angry', emoji: '😠', color: '#FF7A7A' }
    ],
    input: '',
    weekTrack: [
      { day: '周一', mood: '😊' },
      { day: '周三', mood: '😊' },
      { day: '周五', mood: '😊' },
      { day: '周日', mood: '😘' },
      { day: '历史心情', mood: '🥰' }
    ]
  },
  pickMood(e) {
    const mood = e.currentTarget.dataset.mood
    this.setData({ myMood: mood })
  },
  onInput(e) {
    this.setData({ input: e.detail.value })
  }
})
