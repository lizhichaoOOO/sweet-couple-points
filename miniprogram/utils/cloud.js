// utils/cloud.js - 云函数调用封装
const BIZ_FUNCTION = 'quickstartFunctions'

// 原始 callFunction：直接调某个云函数
function callFunction(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => resolve(res.result),
      fail: (err) => {
        console.error(`[cloud:fail] ${name}`, err)
        reject(err)
      }
    })
  })
}

// api(action, data)：调 quickstartFunctions 的 action
// 成功返回 result.data；失败抛出 BizError（message 来自云端）
async function api(action, data = {}) {
  const start = Date.now()
  try {
    const result = await callFunction(BIZ_FUNCTION, { action, ...data })
    const ms = Date.now() - start

    if (!result || typeof result.code !== 'number') {
      console.error(`[api:bad-shape] ${action}`, { ms, result })
      throw new Error('云函数返回格式错误')
    }
    if (result.code !== 0) {
      console.warn(`[api:biz-err] ${action}`, { ms, code: result.code, msg: result.message })
      const err = new Error(result.message || '云函数执行失败')
      err.code = result.code
      throw err
    }
    console.log(`[api:ok] ${action}`, { ms })
    return result.data
  } catch (e) {
    // 网络错误已在 callFunction 的 fail 里 log，业务错误已在上面 warn；这里只补漏
    if (!e.code) {
      console.error(`[api:err] ${action}`, { ms: Date.now() - start, msg: e.message })
    }
    throw e
  }
}

// 带 toast 的包装：自动展示错误消息，页面无需每处 try/catch
async function apiWithToast(action, data, loadingTitle) {
  if (loadingTitle) {
    wx.showLoading({ title: loadingTitle, mask: true })
  }
  try {
    return await api(action, data)
  } catch (e) {
    wx.showToast({ title: e.message || '请求失败', icon: 'none' })
    throw e
  } finally {
    if (loadingTitle) wx.hideLoading()
  }
}

module.exports = {
  callFunction,
  api,
  apiWithToast
}
