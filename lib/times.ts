/**
 * 获取当前时间，格式为 HH:MM:SS。
 * Get the current time in the format of HH:MM:SS.
 * @returns {string} - 当前时间的字符串表示。
 * @returns {string} - A string representation of the current time.
 */
export function get_Time() {
  // 创建一个 Date 对象，表示当前时间
  // Create a Date object representing the current time
  const now = new Date()
  // 获取小时，并确保是两位数
  // Get the hours and ensure it is two digits
  const hours = now.getHours().toString().padStart(2, "0")
  // 获取分钟，并确保是两位数
  // Get the minutes and ensure it is two digits
  const minutes = now.getMinutes().toString().padStart(2, "0")
  // 获取秒，并确保是两位数
  // Get the seconds and ensure it is two digits
  const seconds = now.getSeconds().toString().padStart(2, "0")
  // 返回格式化后的时间字符串
  // Return the formatted time string
  return `${hours}:${minutes}:${seconds}`
}

/**
 * 获取当前日期，格式为 YYYY-MM-DD。
 * Get the current date in the format of YYYY-MM-DD.
 * @returns {string} - 当前日期的字符串表示。
 * @returns {string} - A string representation of the current date.
 */
export function get_Date() {
  // 创建一个 Date 对象，表示当前时间
  // Create a Date object representing the current time
  const now = new Date()
  // 获取年份并转换为字符串
  // Get the year and convert it to a string
  const year = now.getFullYear().toString()
  // 获取月份并转换为字符串（注意：月份从 0 开始计数）
  // Get the month and convert it to a string (Note: Months are counted from 0)
  const month = now.getMonth().toString()
  // 获取日期并转换为字符串
  // Get the day of the month and convert it to a string
  const day = now.getDate().toString()
  // 返回格式化后的日期字符串
  // Return the formatted date string
  return `${year}-${month}-${day}`
}

