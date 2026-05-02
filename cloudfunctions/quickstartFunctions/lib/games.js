// cloudfunctions/quickstartFunctions/lib/games.js
// 游戏聚合模块：每个子游戏独立一个 lib/games/xxx.js
module.exports = {
  truthDare: require('./games/truth-dare')
  // TODO: couple-quiz / rps / memory / who-knows / drawing / 1a2b / dice-truth
}
