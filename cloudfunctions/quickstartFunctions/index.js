// cloudfunctions/quickstartFunctions/index.js
// 业务云函数统一入口：通过嵌套 action (如 "user.getProfile") 分发到各子模块
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const handlers = {
  ping: async () => ({ pong: true, time: Date.now() }),
  user: require('./lib/user'),
  couple: require('./lib/couple'),
  home: require('./lib/home'),
  points: require('./lib/points'),
  records: require('./lib/records'),
  tasks: require('./lib/tasks'),
  rewards: require('./lib/rewards'),
  anniversary: require('./lib/anniversary'),
  mood: require('./lib/mood'),
  letters: require('./lib/letters'),
  goals: require('./lib/goals'),
  cooldown: require('./lib/cooldown'),
  punishment: require('./lib/punishment'),
  luckyDraw: require('./lib/luckyDraw')
}

function resolveHandler(action) {
  if (!action || typeof action !== 'string') return null
  const parts = action.split('.')
  let fn = handlers
  for (const p of parts) {
    if (!fn || typeof fn !== 'object') return null
    fn = fn[p]
  }
  return typeof fn === 'function' ? fn : null
}

exports.main = async (event, context) => {
  const { action } = event
  const wxContext = cloud.getWXContext()
  const fn = resolveHandler(action)

  if (!fn) {
    return { code: 400, message: `unknown action: ${action}` }
  }
  if (!wxContext.OPENID) {
    return { code: 401, message: '未获取到用户身份' }
  }

  try {
    const data = await fn(event, wxContext)
    return { code: 0, data }
  } catch (err) {
    console.error(`action ${action} failed`, err)
    const code = typeof err.code === 'number' ? err.code : 500
    return { code, message: err.message || 'internal error' }
  }
}
