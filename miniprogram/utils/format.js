// utils/format.js - 格式化辅助函数
function formatDate(date, fmt = 'YYYY-MM-DD') {
  const d = date instanceof Date ? date : new Date(date)
  const map = {
    YYYY: d.getFullYear(),
    MM: String(d.getMonth() + 1).padStart(2, '0'),
    DD: String(d.getDate()).padStart(2, '0'),
    HH: String(d.getHours()).padStart(2, '0'),
    mm: String(d.getMinutes()).padStart(2, '0'),
    ss: String(d.getSeconds()).padStart(2, '0')
  }
  return fmt.replace(/YYYY|MM|DD|HH|mm|ss/g, (m) => map[m])
}

function relativeTime(date) {
  const now = Date.now()
  const ts = (date instanceof Date ? date : new Date(date)).getTime()
  const diff = Math.floor((now - ts) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} 天前`
  return formatDate(date)
}

function daysSince(date) {
  const target = (date instanceof Date ? date : new Date(date)).getTime()
  return Math.floor((Date.now() - target) / 86400000)
}

module.exports = {
  formatDate,
  relativeTime,
  daysSince
}
