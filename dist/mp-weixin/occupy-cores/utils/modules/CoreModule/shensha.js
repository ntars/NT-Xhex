/**
 * modules/CoreModule/shensha.js —— 黄历神煞内核 C06【单一真源】
 *
 * 算什么（每日黄历全套，圣经 2.1/2.2）：
 *   建除十二神（值星）、黄道/黑道六神（天神+吉凶）、二十八宿（含吉凶）、彭祖百忌（干+支）、
 *   胎神占方、喜神/福神/财神/阳贵/阴贵方位、冲煞（冲生肖+煞方）、宜/忌、纳音、九星、节日。
 * 算法来源：全部走 C01 底座（lunar-javascript 口径，权威）。
 * 校验收：  modules/CoreModule/__tests__/shensha.test.js
 * 加载：UMD —— require() 得 { daily }; 浏览器挂全局 NT.core.shensha。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./lunar.js'));
  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.shensha = factory(root.NT.core && root.NT.core.lunar); }
})(typeof self !== 'undefined' ? self : this, function (CORE) {

  function safe(fn, lu) { try { return fn(); } catch (e) { return ''; } }

  /**
   * 每日黄历全量（某公历日）。
   * @returns 结构化神煞对象（中文键）
   */
  function daily(y, m, d) {
    var r = CORE.fromSolar(y, m, d);
    var lu = r._raw;
    var g = r.ganzhi;

    // 黄道/黑道六神 + 值日天神
    var tianShen = safe(function () { return lu.getDayTianShen(); }, lu);
    var tianShenType = safe(function () { return lu.getDayTianShenType(); }, lu);   // 黄道/黑道
    var tianShenLuck = safe(function () { return lu.getDayTianShenLuck(); }, lu);   // 吉/凶

    // 二十八宿
    var xiu = safe(function () { return lu.getXiu(); }, lu);
    var xiuLuck = safe(function () { return lu.getXiuLuck(); }, lu);
    var xiuAnimal = safe(function () { return lu.getXiuLuck && lu.getAnimal ? lu.getAnimal() : ''; }, lu);

    // 方位（吉神五方）
    var posXi = safe(function () { return lu.getDayPositionXiDesc ? lu.getDayPositionXiDesc() : lu.getDayPositionXi(); }, lu);
    var posFu = safe(function () { return lu.getDayPositionFuDesc ? lu.getDayPositionFuDesc() : lu.getDayPositionFu(); }, lu);
    var posCai = safe(function () { return lu.getDayPositionCaiDesc ? lu.getDayPositionCaiDesc() : lu.getDayPositionCai(); }, lu);
    var posYangGui = safe(function () { return lu.getDayPositionYangGuiDesc ? lu.getDayPositionYangGuiDesc() : lu.getDayPositionYangGui && lu.getDayPositionYangGui(); }, lu);
    var posYinGui = safe(function () { return lu.getDayPositionYinGuiDesc ? lu.getDayPositionYinGuiDesc() : lu.getDayPositionYinGui && lu.getDayPositionYinGui(); }, lu);

    return {
      solar: r.solar, lunar: r.lunar,
      ganzhi: g,
      值星: safe(function () { return lu.getZhiXing(); }, lu),              // 建除十二神
      天神: tianShen, 天神类: tianShenType, 天神吉凶: tianShenLuck,          // 黄道黑道六神
      二十八宿: { 宿: xiu, 吉凶: xiuLuck, 动物: xiuAnimal },
      九星: safe(function () { var ns = lu.getDayNineStar(); return ns && ns.toString ? ns.toString() : ''; }, lu),
      彭祖百忌: {
        干: safe(function () { return lu.getPengZuGan(); }, lu),
        支: safe(function () { return lu.getPengZuZhi(); }, lu)
      },
      胎神: safe(function () { return lu.getDayPositionTai(); }, lu),
      方位: { 喜神: posXi, 福神: posFu, 财神: posCai, 阳贵: posYangGui, 阴贵: posYinGui },
      冲煞: {
        冲: safe(function () { return lu.getDayChongDesc(); }, lu),        // (丁巳)蛇
        冲生肖: safe(function () { return lu.getDayChongShengXiao(); }, lu),
        煞方: safe(function () { return lu.getDaySha(); }, lu)             // 东/西/南/北
      },
      宜: safe(function () { return lu.getDayYi(); }, lu),
      忌: safe(function () { return lu.getDayJi(); }, lu),
      吉神宜趋: safe(function () { return lu.getDayJiShen ? lu.getDayJiShen() : []; }, lu),
      凶煞宜忌: safe(function () { return lu.getDayXiongSha ? lu.getDayXiongSha() : []; }, lu),
      节日: r.lunar.festivals
    };
  }

  return { daily: daily };
});
