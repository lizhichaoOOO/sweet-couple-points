// cloudfunctions/quickstartFunctions/lib/home.js
// 首页聚合：一次调用拿到首页需要的全部数据
const { db, _, COL, requireUser, requireCouple, startOfTodayISO } = require('./common')
const coupleLib = require('./couple')
const tasksLib = require('./tasks')

// home.get → { bound, me, partner, daysTogether, todayTasks, recentRecords }
exports.get = async (event, wx) => {
  const user = await requireUser(wx.OPENID)
  if (!user.coupleId) {
    return { bound: false }
  }

  // 并行拉情侣信息、今日任务、最近 3 条记录
  const [coupleInfo, todayTasks, recentRecords] = await Promise.all([
    coupleLib.getInfo(event, wx),
    tasksLib.listToday(event, wx),
    db.collection(COL.records)
      .where({ coupleId: user.coupleId })
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get()
      .then(r => r.data)
  ])

  return {
    bound: true,
    ...coupleInfo,
    todayTasks,
    recentRecords
  }
}
