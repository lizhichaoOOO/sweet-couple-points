// cloudfunctions/quickstartFunctions/index.js
// 业务云函数入口：通过 action 分发到不同子功能
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const handlers = {
  ping: async () => ({ pong: true, time: Date.now() }),

  // TODO: 实现以下动作
  // bindCouple: 情侣绑定
  // addPoints: 加分
  // deductPoints: 扣分
  // listRecords: 获取积分变动记录
  // listTasks: 任务列表
  // completeTask: 完成任务
  // redeemReward: 兑换奖励
}

exports.main = async (event, context) => {
  const { action } = event
  const wxContext = cloud.getWXContext()

  if (!action || !handlers[action]) {
    return { code: 400, message: `unknown action: ${action}` }
  }

  try {
    const data = await handlers[action](event, wxContext, db)
    return { code: 0, data }
  } catch (err) {
    console.error(`action ${action} failed`, err)
    return { code: 500, message: err.message || 'internal error' }
  }
}
