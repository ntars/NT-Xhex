/**
 * modules/CoreModule/bazhai.js —— 八宅 · 命卦内核 C08【单一真源】
 *
 * 算什么：命卦（男 11减/女 4加 + 得5寄卦 + 东西四命）、八宅八星（游年排布）、
 *        宅卦判定、东四/西四命宫位吉凶、八等婚合婚。
 * 算法来源：自研，依圣经 13.1/13.2/13.5 + 《八宅明镜》大游年法。
 * 参照物：  主流八宅排盘。
 * 校验收：  modules/CoreModule/__tests__/bazhai.test.js
 * 加载：UMD —— require() 得 { mingGua, younian, ... }；浏览器挂全局 NT.core.bazhai。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.bazhai = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  // 九宫 ↔ 方位 ↔ 卦 ↔ 东西（命卦数 1-9 对应）
  var GONG = {
    1: { 卦: '坎', 方位: '正北', 东西: '东' }, 3: { 卦: '震', 方位: '正东', 东西: '东' },
    4: { 卦: '巽', 方位: '东南', 东西: '东' }, 9: { 卦: '离', 方位: '正南', 东西: '东' },
    2: { 卦: '坤', 方位: '西南', 东西: '西' }, 7: { 卦: '兑', 方位: '正西', 东西: '西' },
    8: { 卦: '艮', 方位: '东北', 东西: '西' }, 6: { 卦: '乾', 方位: '西北', 东西: '西' }
  };

  /**
   * 命卦计算（圣经 13.1 规则：出生年叠加至一位数 → 男 11 减 / 女 4 加 → 得5：男寄艮8 女寄坤2）。
   * @param {number} year 出生公历年
   * @param {'男'|'女'|'male'|'female'} gender
   * @returns { 卦, 方位, 东西命, 命卦数 }
   */
  function mingGua(year, gender) {
    var male = (gender === '男' || gender === 'male');
    var s = year % 100;
    while (s >= 10) s = Math.floor(s / 10) + (s % 10);
    var n = s;
    var r;
    if (male) {
      r = (11 - n) % 10;
      if (r === 0) r = 10;
      if (r === 5) r = 8;          // 男寄艮
      if (r === 10) r = 9;         // 10 → 寄离9（男）
    } else {
      r = (n + 4) % 10;
      if (r === 0) r = 10;
      if (r === 5) r = 2;          // 女寄坤
      if (r === 10) r = 1;         // 10 → 寄坎1（女）
    }
    var g = GONG[r] || { 卦: '中', 方位: '中央', 东西: '' };
    return { 命卦数: r, 卦: g.卦, 方位: g.方位, 东西命: g.东西, 年数字: n };
  }

  // 大游年：本卦（伏位）顺排八星。游年歌诀固定（以命卦为伏位起排）
  // 八星顺序（大游年/八卦配卦口诀「伏→生气→五鬼→延年→天医→绿煞(六煞)→祸害→绝命」按卦定）
  // 这里给「命卦 → 八星落于哪几宫」的游年表（每宫一星）。用「上二为五下二天」口诀。
  var YOU = {
    坎: { 伏位: 1, 生气: 4, 五鬼: 7, 延年: 2, 天医: 9, 六煞: 8, 祸害: 6, 绝命: 3 },
    艮: { 伏位: 8, 生气: 9, 五鬼: 4, 延年: 7, 天医: 1, 六煞: 6, 祸害: 2, 绝命: 3 },
    震: { 伏位: 3, 生气: 8, 五鬼: 9, 延年: 1, 天医: 7, 六煞: 2, 祸害: 6, 绝命: 4 },
    巽: { 伏位: 4, 生气: 1, 五鬼: 8, 延年: 9, 天医: 7, 六煞: 3, 祸害: 7, 绝命: 2 },
    中: { 伏位: 5, 生气: 6, 五鬼: 7, 延年: 2, 天医: 9, 六煞: 8, 祸害: 3, 绝命: 4 },
    乾: { 伏位: 6, 生气: 7, 五鬼: 4, 延年: 5, 天医: 1, 六煞: 2, 祸害: 3, 绝命: 8 },
    兑: { 伏位: 7, 生气: 5, 五鬼: 6, 延年: 4, 天医: 9, 六煞: 8, 祸害: 3, 绝命: 2 },
    坤: { 伏位: 2, 生气: 7, 五鬼: 6, 延年: 9, 天医: 1, 六煞: 8, 祸害: 4, 绝命: 3 },
    离: { 伏位: 9, 生气: 2, 五鬼: 3, 延年: 8, 天医: 4, 六煞: 1, 祸害: 6, 绝命: 7 }
  };

  /** 游年：给命卦，返回八星落宫（哪宫是生气/五鬼/天医/绝命…） */
  function younian(gua) { var y = YOU[gua]; if (!y) return null; return y; }

  /** 八等婚合婚（1天医婚…8绝命婚，依双方命卦关系） */
  function hehun(guaA, guaB) {
    var yA = YOU[guaA], yB = YOU[guaB];
    if (!yA || !yB) return { 等: 8, 名: '绝命婚', 说明: '命卦无法定位' };
    // A 的伏位(=A卦数) 落在 B 游年表的哪一星
    var numA = { 坎: 1, 艮: 8, 震: 3, 巽: 4, 中: 5, 乾: 6, 兑: 7, 坤: 2, 离: 9 }[guaA];
    var starB = Object.keys(yB).find(function (k) { return yB[k] === numA; }) || '绝命';
    var ORDER = ['天医', '生气', '延年', '伏位', '六煞', '祸害', '五鬼', '绝命'];
    var idx = ORDER.indexOf(starB);
    var grades = ['天医婚', '生气婚', '延年婚', '伏位婚', '六煞婚', '祸害婚', '五鬼婚', '绝命婚'];
    var desc = ['大吉，夫妻和睦财旺', '吉，生机贵人', '吉，长寿和谐', '平，安稳', '小凶，六煞主口舌', '中凶，祸害主失', '凶，五鬼主灾', '大凶，绝命主克'][idx];
    return { 等: idx + 1, 名: grades[idx], 关系星: starB, 说明: desc };
  }

  /** 宅卦判定：坐向定宅（坐北朝南=坎宅…）。坐山所在宫。 */
  function zhaiGua(zuodirection) {
    var map = { 坐北: '离', 坐南: '坎', 坐东: '兑', 坐西: '震', 坐西北: '艮', 坐东北: '乾', 坐西南: '巽', 坐东南: '坤' };
    // 简化：坐向取「坐」方对应八宅（坐北朝南，坐方=正北=坎宫）
    return map[zuodirection] || null;
  }

  return { GONG: GONG, mingGua: mingGua, younian: younian, hehun: hehun, zhaiGua: zhaiGua, YOU: YOU };
});
