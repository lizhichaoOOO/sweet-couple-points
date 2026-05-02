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
        console.error(`云函数 ${name} 调用失败`, err)
        reject(err)
      }
    })
  })
}

// api(action, data)：调 quickstartFunctions 的 action
// 成功返回 result.data；失败抛出 BizError（message 来自云端）
async function api(action, data = {}) {
  const result = await callFunction(BIZ_FUNCTION, { action, ...data })
  if (!result || typeof result.code !== 'number') {
    throw new Error('云函数返回格式错误')
  }
  if (result.code !== 0) {
    const err = new Error(result.message || '云函数执行失败')
    err.code = result.code
    throw err
  }
  return result.data
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
