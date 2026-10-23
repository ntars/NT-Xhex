/**
 * modules/CoreModule/festival.js —— 节日与法定节假日内核【单一真源】
 *
 * 算什么：
 *   ① 公历固定节日（元旦 / 劳动 / 国庆 / 妇女 / 儿童 / 教师 / 圣诞 之外，补齐
 *      植树节、青年节、建党节、建军节、国家公祭日等）；
 *   ② 法定节假日与调休安排（哪几天放假、哪几天补班、哪几天属调休补休）；
 *   ③ 把「公历节日 + 农历节日 + 法定假期」合成黄历的「节日」一栏。
 *
 * 为什么单独一个内核：
 *   C01 底座（lunar-javascript）的农历节日很全（除夕/元宵/龙抬头/寒食/端午/七夕/中元/
 *   中秋/重阳/寒衣/下元/腊八等 30 余项），但**不含法定节假日的放假与调休安排**——
 *   那属于国务院逐年公告的行政安排，不是历法推算出来的。故本文件补这一层。
 *
 * 数据来源与版权声明（重要，改动前先读）：
 *   · 法定节假日安排：**国务院办公厅历年公告**（gov.cn 政府公开信息），逐条抄录
 *     放假区间、补班日、调休补休日，属事实性行政安排。国务院公告本身不受著作权
 *     保护（《中华人民共和国著作权法》第五条：法律、法规，国家机关的决议、决定、
 *     命令和其他具有立法、行政、司法性质的文件不适用本法）。
 *   · 整理格式与编排参照开源项目 **chinese-days**（https://github.com/Shonee/chinese-days，
 *     MIT License，Copyright (c) 2024 Yawei sun）的年份划分方式。本项目未复制其代码，
 *     仅按同一「年份 → 节日 → 区间/补班日」的编排思路重新组织数据；依 MIT 要求在此
 *     保留来源与版权声明。
 *   · 公历固定节日为公历日期常数（公版常识），无版权问题。
 *
 * 怎么扩年份：
 *   在 STATUTORY 里按同一格式加一年即可，数据从 gov.cn 当年度「部分节假日安排的通知」抄录。
 *   ⚠️ 千万别凭印象补：放假与补班日期每年不同，抄错会让用户按错日子出行。
 *
 * 校验收：modules/CoreModule/__tests__/festival.test.js
 * 加载：UMD —— require() 得 { solarFixed, statutory, all }；浏览器挂全局 NT.core.festival。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.festival = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  /**
   * 公历固定节日（月-日 → 名称）。
   * 只收「日期固定、无歧义」的；lunar 底座已返回的（元旦节/劳动节/国庆节/妇女节/
   * 儿童节/教师节/圣诞节）此处不重复，避免同一节日出现两次。
   */
  var SOLAR_FIXED = {
    '3-12': '植树节',
    '5-4': '青年节',
    '7-1': '建党节',
    '8-1': '建军节',
    '9-3': '抗战胜利纪念日',
    '12-13': '国家公祭日'
  };

  /**
   * 法定节假日与调休安排。
   * 每条：[节日名, 起始月, 起始日, 结束月, 结束日, 补班日列表, 调休补休日列表]
   *   · 补班日（班）= 本应休息却要上班的日子（周末调休上班）；
   *   · 补休日（补）= 假期中属于「调休挪过来」的日子（不是法定假日当天）。
   * 2024 / 2025 / 2026 三年，逐条抄自国务院办公厅公告（见各年注释里的链接）。
   * 2027 及以后：等国务院公告发布后按同格式追加。
   */
  var STATUTORY = {
    2024: [
      // 国办发明电〔2023〕8 号：https://www.gov.cn/zhengce/content/202310/content_6911527.htm
      ['元旦', 1, 1, 1, 1, [], []],
      ['春节', 2, 10, 2, 17, [[2, 4], [2, 18]], [[2, 15], [2, 16]]],
      ['清明节', 4, 4, 4, 6, [[4, 7]], [[4, 5]]],
      ['劳动节', 5, 1, 5, 5, [[4, 28], [5, 11]], [[5, 2], [5, 3]]],
      ['端午节', 6, 10, 6, 10, [], []],
      ['中秋节', 9, 15, 9, 17, [[9, 14]], [[9, 16]]],
      ['国庆节', 10, 1, 10, 7, [[9, 29], [10, 12]], [[10, 4], [10, 7]]]
    ],
    2025: [
      // 国办发明电〔2024〕12 号：https://www.gov.cn/zhengce/zhengceku/202411/content_6986383.htm
      ['元旦', 1, 1, 1, 1, [], []],
      ['春节', 1, 28, 2, 4, [[1, 26], [2, 8]], [[2, 3], [2, 4]]],
      ['清明节', 4, 4, 4, 6, [], []],
      ['劳动节', 5, 1, 5, 5, [[4, 27]], [[5, 5]]],
      ['端午节', 5, 31, 6, 2, [], []],
      ['国庆节·中秋节', 10, 1, 10, 8, [[9, 28], [10, 11]], [[10, 7], [10, 8]]]
    ],
    2026: [
      // https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm
      ['元旦', 1, 1, 1, 3, [[1, 4]], [[1, 2]]],
      ['春节', 2, 15, 2, 23, [[2, 14], [2, 28]], [[2, 20], [2, 23]]],
      ['清明节', 4, 4, 4, 6, [], []],
      ['劳动节', 5, 1, 5, 5, [[5, 9]], [[5, 5]]],
      ['端午节', 6, 19, 6, 21, [], []],
      ['中秋节', 9, 25, 9, 27, [], []],
      ['国庆节', 10, 1, 10, 7, [[9, 20], [10, 10]], [[10, 6], [10, 7]]]
    ]
  };

  /** 覆盖年份（升序），供 UI 判断「超出数据范围」时如实提示 */
  var YEARS = Object.keys(STATUTORY).map(Number).sort(function (a, b) { return a - b; });

  /** 把 [月,日] 转成可比较的整数（月*100+日） */
  function key(m, d) { return m * 100 + d; }

  /**
   * 查某公历日的公历固定节日。
   * @returns 名称数组（无则空数组）
   */
  function solarFixed(m, d) {
    var n = SOLAR_FIXED[m + '-' + d];
    return n ? [n] : [];
  }

  /**
   * 查某公历日的法定节假日安排。
   * @returns { 名, 类型, 调休 } 或 null
   *   类型：'假期'（放假）/ '上班'（调休补班）
   *   调休：true = 该日属调休补休（不是法定假日当天）
   */
  function statutory(y, m, d) {
    var list = STATUTORY[y];
    if (!list) return null;
    var k = key(m, d);
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      var name = it[0], sm = it[1], sd = it[2], em = it[3], ed = it[4], work = it[5], lieu = it[6];
      // 补班日
      for (var w = 0; w < work.length; w++) {
        if (key(work[w][0], work[w][1]) === k) {
          return { 名: name, 类型: '上班', 调休: true, 说明: '调休补班' };
        }
      }
      // 假期区间（跨月也能算：用「年内第几天」比较更稳）
      var cur = dayOfYear(y, m, d), s = dayOfYear(y, sm, sd), e = dayOfYear(y, em, ed);
      if (cur >= s && cur <= e) {
        var isLieu = false;
        for (var l = 0; l < lieu.length; l++) {
          if (key(lieu[l][0], lieu[l][1]) === k) { isLieu = true; break; }
        }
        return { 名: name, 类型: '假期', 调休: isLieu, 说明: isLieu ? '调休放假' : '法定假日' };
      }
    }
    return null;
  }

  /** 年内第几天（1-366），只用于同年区间比较，不涉历法口径 */
  function dayOfYear(y, m, d) {
    var days = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var n = d;
    for (var i = 0; i < m - 1; i++) n += days[i];
    return n;
  }

  /**
   * 合成某日的全部节日名（去重、保序）。
   * 「节日」只装节日名（农历 + 公历），**不装假期安排**——放假/补班/调休是行政安排，
   * 由单独的「法定假期」字段承载，两者混在一起会让「元旦节 · 元旦」这类同义名重复出现。
   * @param y,m,d 公历
   * @param lunarFestivals 底座给的农历+公历节日数组（可空）
   * @returns { 名: string[], 法定: object|null }
   */
  function all(y, m, d, lunarFestivals) {
    var names = [];
    function push(n) {
      if (!n) return;
      var s = String(n), base = s.replace(/节$/, '');
      for (var i = 0; i < names.length; i++) {
        // 同名、或仅差一个「节」字（元旦 / 元旦节）视为同一节日，只留先出现的
        if (names[i] === s || String(names[i]).replace(/节$/, '') === base) return;
      }
      names.push(s);
    }

    (lunarFestivals || []).forEach(push);
    solarFixed(m, d).forEach(push);

    return { 名: names, 法定: statutory(y, m, d) };
  }

  return { SOLAR_FIXED: SOLAR_FIXED, STATUTORY: STATUTORY, YEARS: YEARS, solarFixed: solarFixed, statutory: statutory, all: all };
});
