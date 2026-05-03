// cloudfunctions/quickstartFunctions/lib/games.js
// 游戏聚合模块：每个子游戏独立一个 lib/games/xxx.js
module.exports = {
  truthDare: require('./games/truth-dare'),
  quiz: require('./games/quiz'),
  rps: require('./games/rps'),
  witch: require('./games/witch')
  // TODO: memory / who-knows / drawing / 1a2b / dice-truth
}
