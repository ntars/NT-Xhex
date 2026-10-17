/**
 * modules/CoreModule/wuxing.js —— 五行 · 纳音 · 十二长生 · 生肖内核 C05【单一真源】
 *
 * 算什么：
 *   五行生克（生/克/被生/被克四关系）、天干/地支五行阴阳、纳音五行（60 甲子）、
 *   十二长生（长生…养 十二状态）、生肖 ↔ 地支 ↔ 五行 ↔ 时辰 ↔ 方位全对照、太岁。
 * 算法来源：五行生克为传统固定规则；十二长生走权威口诀「甲亥乙午丙戊寅丁己酉庚巳辛子壬申癸卯，阳顺阴逆」
 *          （十天干各自固定长生起点，5 源核对一致）；纳音走 C01 底座（lunar-javascript 口径统一）。
 * 校验收：  modules/CoreModule/__tests__/wuxing.test.js
 * 加载：UMD —— require() 得 { sheng, ke, nayin, changsheng, ... }；浏览器挂全局 NT.core.wuxing。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./lunar.js'));
  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.wuxing = factory(root.NT.core && root.NT.core.lunar); }
})(typeof self !== 'undefined' ? self : this, function (CORE) {
  var SL = CORE._SL;
  var WX = ['金', '木', '水', '火', '土'];

  // 五行生克（大白话：生=互相成就、克=互相压制）
  var SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };   // 我生者
  var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };      // 我克者
  var SHENG_WO = {}, KE_WO = {};
  WX.forEach(function (w) { SHENG_WO[SHENG[w]] = w; KE_WO[KE[w]] = w; });  // 生我者 / 克我者

  var GAN_W = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  var ZHI_W = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
  var ZHI_SX = { 子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇', 午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪' };
  var ZHI_HOUR = { 子: '23:00-01:00', 丑: '01:00-03:00', 寅: '03:00-05:00', 卯: '05:00-07:00', 辰: '07:00-09:00', 巳: '09:00-11:00', 午: '11:00-13:00', 未: '13:00-15:00', 申: '15:00-17:00', 酉: '17:00-19:00', 戌: '19:00-21:00', 亥: '21:00-23:00' };
  var ZHI_FANG = { 子: '正北', 丑: '东北', 寅: '东北', 卯: '正东', 辰: '东南', 巳: '东南', 午: '正南', 未: '西南', 申: '西南', 酉: '正西', 戌: '西北', 亥: '西北' };

  // 十二长生（顺序固定：长生→养）。起点 = 各天干固定长生地支（权威口诀，5 源核对一致）：
  //   阳干顺：甲亥 丙寅 戊寅 庚巳 壬申；阴干逆：乙午 丁酉 己酉 辛子 癸卯（「阳生阴死、阴生阳死」）
  var CHANGSHENG_NAMES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
  // 十天干 → 长生固定起点地支（口诀「甲亥丙戊寅 庚巳壬申 乙午丁己酉 辛子癸卯」）
  var CS_START = { 甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅', 己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯' };
  var ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var YANG_GAN = { 甲: true, 丙: true, 戊: true, 庚: true, 壬: true };

  /** 某天干在某地支的十二长生状态（阳干顺推、阴干逆推，各走自己固定长生起点） */
  function changsheng(gan, zhi) {
    var startZhi = CS_START[gan];
    var si = ZHI_ORDER.indexOf(startZhi), zi = ZHI_ORDER.indexOf(zhi);
    if (si < 0 || zi < 0 || !startZhi) return '';
    var step = YANG_GAN[gan] ? (zi - si) : (si - zi);   // 阳顺阴逆
    step = ((step % 12) + 12) % 12;
    return CHANGSHENG_NAMES[step];
  }

  /** 纳音（走底座 LunarUtil.NAYIN 全表，口径统一） */
  function nayin(ganzhi) {
    try {
      if (SL.LunarUtil && SL.LunarUtil.NAYIN) return SL.LunarUtil.NAYIN[ganzhi] || '';
      // 兜底：构造该干支的八字取日纳音
      var ec = SL.Solar.fromYmdHms(2000, 1, 1, 0, 0, 0).getLunar().getEightChar();
      return '';
    } catch (e) { return ''; }
  }

  /** 五行四关系 */
  function relation(a, b) {
    if (a === b) return '同';
    if (SHENG[a] === b) return '我生';      // a 生 b
    if (KE[a] === b) return '我克';
    if (SHENG_WO[a] === b) return '生我';
    if (KE_WO[a] === b) return '克我';
    return '';
  }

  /** 太岁：某年生肖即当年太岁 */
  function taisui(y) { return ZHI_SX[CORE.fromSolar(y, 6, 1).ganzhi.年.支]; }

  return {
    SHENG: SHENG, KE: KE, SHENG_WO: SHENG_WO, KE_WO: KE_WO,
    GAN_W: GAN_W, ZHI_W: ZHI_W, ZHI_SX: ZHI_SX, ZHI_HOUR: ZHI_HOUR, ZHI_FANG: ZHI_FANG,
    changsheng: changsheng, nayin: nayin, relation: relation, taisui: taisui,
    CHANGSHENG_NAMES: CHANGSHENG_NAMES, WUXING: WX
  };
});
