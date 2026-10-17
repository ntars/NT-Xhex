/**
 * modules/CoreModule/bazi.js —— 八字内核 C07【单一真源】
 *
 * 算什么：四柱干支（含多口径）→ 藏干 → 十神 → 纳音 → 旬空 → 胎元/命宫/身宫 →
 *        五行统计（含缺什么）→ 旺衰五档（得令/得地/得势加权）→ 用神喜忌分层 → 大运流年。
 * 算法来源：四柱/藏干/十神/纳音/旬空/胎元命宫/大运走 C01 底座（lunar-javascript 口径，权威）；
 *          旺衰五档 + 用神分层为本项目自研（依《滴天髓》《子平真诠》规则，圣经 3.2 硬性规则）。
 * 参照物：  问真八字在线排盘（pcbz.iwzwh.com）—— 同生辰输入比对（见 tools/reverse-check 计划）。
 * 校验收：  modules/CoreModule/__tests__/bazi.test.js
 * 加载：UMD —— require() 得 { chart, wangshuai, ... }；浏览器挂全局 NT.core.bazi。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./lunar.js'), require('./config.js'));
  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.bazi = factory(root.NT.core && root.NT.core.lunar, root.NT.config); }
})(typeof self !== 'undefined' ? self : this, function (CORE, CONF) {
  var SL = CORE._SL;

  // 五行基础表（自研，大白话：生=互相成就，克=互相压制）
  var GAN_W = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  var ZHI_W = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
  var SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };   // 我生者
  var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };      // 我克者
  var SHENG_WO = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' }; // 生我者（印）
  var KE_WO = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' };   // 克我者（官杀）

  /**
   * 完整排盘。
   * @param {Object} inp { y, m, d, h, i, s, gender, name, cityLon? }
   * @returns 结构化命盘（中文键）
   */
  function chart(inp) {
    inp = inp || {};
    var y = inp.y, m = inp.m, d = inp.d, hh = inp.h || 0, mi = inp.i || 0, ss = inp.s || 0;
    var solar = SL.Solar.fromYmdHms(y, m, d, hh, mi, ss);
    var lu = solar.getLunar();
    var ec = lu.getEightChar();

    // 四柱（含藏干/十神/纳音/旬空）
    function pillar(gan, zhi, shiShenGan, hideGan, shiShenZhi, naYin, xunKong) {
      return { 干: gan, 支: zhi, 干支: gan + zhi, 干五行: GAN_W[gan] || '', 支五行: ZHI_W[zhi] || '',
        十神: shiShenGan || '', 藏干: hideGan || [], 藏干十神: shiShenZhi || [], 纳音: naYin || '', 旬空: xunKong || '' };
    }
    var pillars = {
      年: pillar(ec.getYearGan(), ec.getYearZhi(), ec.getYearShiShenGan(), ec.getYearHideGan(), ec.getYearShiShenZhi(), ec.getYearNaYin(), ec.getYearXunKong()),
      月: pillar(ec.getMonthGan(), ec.getMonthZhi(), ec.getMonthShiShenGan(), ec.getMonthHideGan(), ec.getMonthShiShenZhi(), ec.getMonthNaYin(), ec.getMonthXunKong()),
      日: pillar(ec.getDayGan(), ec.getDayZhi(), '日主', ec.getDayHideGan(), ec.getDayShiShenZhi(), ec.getDayNaYin(), ec.getDayXunKong()),
      时: pillar(ec.getTimeGan(), ec.getTimeZhi(), ec.getTimeShiShenGan(), ec.getTimeHideGan(), ec.getTimeShiShenZhi(), ec.getTimeNaYin(), ec.getTimeXunKong())
    };

    // 五行统计（天干 + 地支本气，共 8 字）
    var wx = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
    [pillars.年, pillars.月, pillars.日, pillars.时].forEach(function (p) {
      if (wx[p.干五行] !== undefined) wx[p.干五行]++;
      if (wx[p.支五行] !== undefined) wx[p.支五行]++;
    });
    var total = 8, pct = {};
    for (var k in wx) pct[k] = Math.round(wx[k] / total * 100);
    var lack = Object.keys(wx).filter(function (k) { return wx[k] === 0; });

    var result = {
      input: { y: y, m: m, d: d, h: hh, i: mi, name: inp.name || '命主', gender: inp.gender || '未知' },
      lunar: { text: lu.toString() },
      pillars: pillars,
      dayMaster: { 干: ec.getDayGan(), 五行: GAN_W[ec.getDayGan()] },
      藏干: { 年: ec.getYearHideGan(), 月: ec.getMonthHideGan(), 日: ec.getDayHideGan(), 时: ec.getTimeHideGan() },
      十神: { 年: ec.getYearShiShenGan(), 月: ec.getMonthShiShenGan(), 日: '日主', 时: ec.getTimeShiShenGan() },
      纳音: { 年: ec.getYearNaYin(), 月: ec.getMonthNaYin(), 日: ec.getDayNaYin(), 时: ec.getTimeNaYin() },
      旬空: { 年: ec.getYearXunKong(), 月: ec.getMonthXunKong(), 日: ec.getDayXunKong(), 时: ec.getTimeXunKong() },
      胎元: ec.getTaiYuan(), 命宫: ec.getMingGong(), 身宫: ec.getShenGong(),
      五行: { 统计: wx, 百分比: pct, 缺: lack, 缺文本: lack.length ? ('缺' + lack.join('、')) : '五行俱全' },
      _ec: ec, _lu: lu
    };
    result.旺衰 = wangshuai(result, inp.gender);
    result.大运 = dayun(ec, inp.gender);
    return result;
  }

  /**
   * 旺衰五档 + 用神（自研，依圣经 3.2 硬性规则）：
   *   得令(月令权重 50%) / 得地(通根 30%) / 得势(印比 20%) → 加权 → 五档：极旺/身旺/中和偏弱/身弱/极弱。
   */
  function wangshuai(chartData, gender) {
    var dm = chartData.dayMaster.五行;                // 日主五行
    var monthZhiWx = chartData.pillars.月.支五行;      // 月令五行
    var P = chartData.pillars;
    // 得令：月令五行 = 日主五行（同气）或生我者（印）→ 当令
    var deLing = (monthZhiWx === dm || SHENG_WO[dm] === monthZhiWx);
    // 得地：四柱地支（本气）中与日主同五行者计 1，藏干同五行者计 0.5
    var deDi = 0;
    [P.年, P.月, P.日, P.时].forEach(function (p) {
      if (p.支五行 === dm) deDi += 1;
      (p.藏干 || []).forEach(function (g) { if (GAN_W[g] === dm) deDi += 0.5; });
    });
    // 得势：四柱天干中 比劫(同) 或 印(生我) 者计 1
    var deShi = 0;
    [P.年, P.月, P.时].forEach(function (p) {          // 日干本身不算（是日主）
      if (p.干五行 === dm || SHENG_WO[p.干五行] === dm) deShi += 1;
    });
    // 加权：得令 50 / 得地 30（上限按满 4 归一到 1）/ 得势 20（上限按满 3 归一）
    var sDi = Math.min(deDi / 4, 1), sShi = Math.min(deShi / 3, 1);
    var score = (deLing ? 50 : 0) + sDi * 30 + sShi * 20;
    var lvl = score >= 85 ? '极旺' : score >= 60 ? '身旺' : score >= 45 ? '中和偏弱' : score >= 25 ? '身弱' : '极弱';
    var isQiang = (lvl === '极旺' || lvl === '身旺');
    // 用神分层（简版：旺则克泄，弱则生扶）
    var yong, xi, ji;
    if (isQiang) { yong = KE[dm]; xi = SHENG[dm]; ji = SHENG_WO[dm]; }
    else { yong = SHENG_WO[dm]; xi = dm; ji = KE[dm]; }
    return {
      得令: deLing, 得地: Math.round(deDi * 10) / 10, 得势: deShi,
      加权分: Math.round(score), 判: lvl, 强: isQiang, 弱: !isQiang,
      用神: { 第一用神: yong, 喜神: xi, 忌神: ji },
      说明: '得令权重 50%、得地(通根)30%、得势(印比)20% 加权，五档判定（圣经 3.2 规则）。'
    };
  }

  /** 大运流年：顺逆运按「阳年男/阴年女顺排」；每步十年。上游 getYun(1=男,0=女)。 */
  function dayun(ec, gender) {
    var isF = (gender === '女' || gender === 'female');
    var yy = ec.getYearGan();
    var yangGan = ['甲', '丙', '戊', '庚', '壬'].indexOf(yy) >= 0;
    var forward = (yangGan && !isF) || (!yangGan && isF);   // 阳男阴女顺排
    try {
      var yun = ec.getYun(isF ? 0 : 1);     // 上游：1=男，0=女
      var dy = yun.getDaYun(9);
      // 上游第 0 步是「起运前」占位（干支为空、年龄=出生时），从第 1 步起才是真实大运
      var list = dy.map(function (x) {
        return { 开始年: x.getStartYear(), 年龄: x.getStartAge(), 干支: x.getGanZhi() };
      }).filter(function (x) { return x.干支; });
      var startAge = dy.length > 1 ? dy[1].getStartAge() : (yun.getStartAge ? yun.getStartAge() : '');
      return {
        顺逆: forward ? '顺排' : '逆排',
        起运: (yun.getStartYear ? yun.getStartYear() + ' 年后' : '') + '起运（约 ' + startAge + ' 岁）',
        列表: list
      };
    } catch (e) {
      return { 顺逆: forward ? '顺排' : '逆排', 列表: [], _err: String(e && e.message || e) };
    }
  }

  return { chart: chart, wangshuai: wangshuai, dayun: dayun, WUXING: { GAN_W: GAN_W, ZHI_W: ZHI_W, SHENG: SHENG, KE: KE } };
});
