// utils/cloud.js - 云函数调用封装
function callFunction(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        if (res.result && res.result.code !== undefined && res.result.code !== 0) {
          reject(new Error(res.result.message || '云函数返回错误'))
          return
        }
        resolve(res.result)
      },
      fail: (err) => {
        console.error(`云函数 ${name} 调用失败`, err)
        reject(err)
      }
    })
  })
}

module.exports = {
  callFunction
}
