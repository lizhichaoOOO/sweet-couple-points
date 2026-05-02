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
  luckyDraw: require('./lib/luckyDraw'),
  games: require('./lib/games')
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

// 安全裁剪 event：action 已在 key 里了；超长字段也截断
function sanitize(event) {
  const { action, ...rest } = event
  const out = {}
  for (const k of Object.keys(rest)) {
    const v = rest[k]
    if (typeof v === 'string' && v.length > 100) {
      out[k] = v.slice(0, 100) + '...'
    } else {
      out[k] = v
    }
  }
  return out
}

// openid 取后 6 位，保持日志紧凑又可对应人
function shortId(openid) {
  return openid ? openid.slice(-6) : ''
}

exports.main = async (event, context) => {
  const { action } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID || ''
  const oid = shortId(openid)
  const start = Date.now()

  const fn = resolveHandler(action)
  if (!fn) {
    console.warn('[action:unknown]', { action, oid })
    return { code: 400, message: `unknown action: ${action}` }
  }
  if (!openid) {
    console.warn('[action:no-openid]', { action })
    return { code: 401, message: '未获取到用户身份' }
  }

  console.log(`[action:start] ${action}`, { oid, args: sanitize(event) })

  try {
    const data = await fn(event, wxContext)
    const ms = Date.now() - start
    console.log(`[action:ok] ${action}`, { oid, ms })
    return { code: 0, data }
  } catch (err) {
    const ms = Date.now() - start
    const code = typeof err.code === 'number' ? err.code : 500
    // 业务错误（4xx）用 warn，系统错误（5xx）用 error
    if (code < 500) {
      console.warn(`[action:biz-err] ${action}`, { oid, ms, code, message: err.message })
    } else {
      console.error(`[action:err] ${action}`, { oid, ms, code, message: err.message, stack: err.stack })
    }
    return { code, message: err.message || 'internal error' }
  }
}
