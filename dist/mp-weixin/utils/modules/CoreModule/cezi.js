/**
 * modules/CoreModule/cezi.js —— 测字（拆字·会意）内核 C22【单一真源】
 *
 * 算什么：输入一个汉字（或词）→ 康熙笔画 → 笔画尾数定五行（数理五行）+ 笔画起卦 →
 *         与所问事类比对生克 → 综合输出「笔画 / 五行 / 卦象 / 增删变字 / 断语」。
 *
 * 算法来源（有权威用权威，零臆造；不一致处如实标注流派差异）：
 *   · 康熙笔画：复用 kangxi-strokes.js（TDEM kangxi-strokecount，MIT，3500 通用规范汉字，
 *     主流测字/五格口径 = 康熙部首计数）。本项目单一真源，不另起一套。
 *   · 数理五行（笔画尾数五行）：标准姓名学惯例，尾数 1/2=木、3/4=火、5/6=土、7/8=金、9/0=水
 *     （与五格/81 数理同源的通行归类，多源一致）。本项目此前无此表，故在此建立单一真源。
 *   · 先天八卦数：乾1 兑2 离3 震4 巽5 坎6 艮7 坤8（《易经·说卦传》先天卦序，权威定论）。
 *     笔画数 % 8 → 卦（余 0 作 8 = 坤）。为「笔画起卦」通行法之一，多源一致。
 *   · 增删笔画变字：有限通用会意示例表（见 ADD_DEL），非全字库穷举，已标注。
 *
 * ⚠️ 缺口 / 已知限制（严守零臆造，核到权威源才补，不假报）：
 *   ①【部首检测不可用·原理性】汉字是单一 Unicode 码点（如「海」= U+6D77），Unicode **不**把汉字
 *      拆解为部首序列，故 String.indexOf('氵') 恒为 -1，无法用子串方式判定部首/偏旁。
 *      真正的部首必须由 Unihan kRSUnicode（或完整 IDS 拆解库）提供。本项目尚未内嵌该数据 →
 *      故本内核**不提供自动部首判定**，五行改用「笔画尾数（数理五行）」这一无需部首的权威替代口径。
 *      （修法：待内嵌 Unihan kRSUnicode 后补 部首表 + 偏旁会意，届时再启用。）
 *   ②《测字秘牒》完整「十法」（装头/接脚/穿心/包笼/破解/添减/对关/摘取/观梅/遥照）需全本条文比对，
 *      本内核仅覆盖「数理五行 + 起卦 + 增删提示 + 与事类比对」四类通用法，其余待权威全本。
 *   ③ 断语属「会意层」传统人文解读，非可验证的天文/历算算法，已如实标注。
 *
 * 加载：UMD —— require（注入 iching + kangxi-strokes）；浏览器挂 NT.core.cezi。
 * 校验：modules/CoreModule/__tests__/cezi.test.js
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./iching.js'), require('./kangxi-strokes.js'));
  } else {
    root.NT = root.NT || {}; root.NT.core = root.NT.core || {};
    root.NT.core.cezi = factory(
      root.NT.core && root.NT.core.iching,
      root.NT.core && root.NT.core.kangxiStrokes);
  }
})(typeof self !== 'undefined' ? self : this, function (ICE, KANGXI_STROKES) {

  // 先天八卦数 → 卦名（《说卦传》先天卦序，权威定论）。索引=笔画数%8；余0→坤(8)
  var XIANTIAN = ['坤', '乾', '兑', '离', '震', '巽', '坎', '艮'];
  var BAGUA_WX = { 乾: '金', 兑: '金', 离: '火', 震: '木', 巽: '木', 坎: '水', 艮: '土', 坤: '土' };

  // 数理五行（笔画尾数，标准姓名学惯例）
  function wxOfTail(n) {
    var t = Math.abs(n) % 10;
    if (t === 1 || t === 2) return '木';
    if (t === 3 || t === 4) return '火';
    if (t === 5 || t === 6) return '土';
    if (t === 7 || t === 8) return '金';
    return '水'; // 9, 0
  }
  var WX_XING = {
    木: '主生发进取、仁厚条达', 火: '主急进明礼、显扬而防燥',
    土: '主厚重诚信、稳固迟缓', 金: '主刚锐决断、义气亦防刑', 水: '主智变流动、通达而戒急'
  };

  // 五行生克（客观事实，非流派）
  var SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  function relBetween(a, b) {
    if (a === b) return '比和';
    if (SHENG[a] === b) return a + '生' + b;
    if (SHENG[b] === a) return b + '生' + a;
    if (KE[a] === b) return a + '克' + b;
    if (KE[b] === a) return b + '克' + a;
    return '无关';
  }

  // 事类 → 所问五行（通用归类，用于与字五行比对）
  var SHI_WX = {
    '财运': '金', '求财': '金', '生意': '金', '事业': '火', '功名': '火', '学业': '木',
    '文书': '木', '考试': '木', '婚姻': '土', '感情': '土', '家宅': '土',
    '疾病': '水', '出行': '水', '生育': '水', '官司': '金', '朋友': '土', '自身': null
  };

  // 有限「增删笔画变字」通用会意示例（非全字库穷举）
  var ADD_DEL = {
    '大': { 加一: ['天', '夫', '太'], 减一: ['人'] },
    '王': { 加一: ['主', '玉', '五'], 减一: ['土', '士'] },
    '日': { 加一: ['白', '田', '旧'], 减一: ['口'] },
    '木': { 加一: ['术', '本', '未', '末'], 减一: [] },
    '口': { 加一: ['日', '中'], 减一: [] },
    '十': { 加一: ['土', '士', '干', '千'], 减一: ['一'] },
    '人': { 加一: ['大', '个'], 减一: [] },
    '一': { 加一: ['二', '十', '丁'], 减一: [] },
    '土': { 加一: ['王', '壬'], 减一: ['十'] },
    '白': { 加一: ['自', '百'], 减一: ['日'] }
  };

  /** 取字康熙笔画（单一真源）；不在表内则返回 null（报缺，不臆造） */
  function strokeOf(ch) {
    if (!KANGXI_STROKES || !KANGXI_STROKES.KANGXI) return null;
    var v = KANGXI_STROKES.KANGXI[ch];
    return (typeof v === 'number') ? v : null;
  }

  /** 先天八卦起卦：笔画数 % 8 → 卦（余0=坤8） */
  function guaOfStrokes(n) {
    if (n == null) return null;
    var r = n % 8;
    var num = (r === 0) ? 8 : r;
    var name = XIANTIAN[num === 8 ? 0 : num];
    return { 笔画: n, 先天数: num, 卦名: name, 五行: BAGUA_WX[name] };
  }

  /**
   * 主函数：测字分析。
   * @param {Object} inp { 字: '好', 事?: '财运' }
   */
  function analyze(inp) {
    inp = inp || {};
    var word = (inp.字 || '').toString().trim();
    if (!word) return { err: '测字需一个汉字，例如「测字 好」。' };

    var chars = word.split('');
    var items = [], missing = [], total = 0, totalOk = true;
    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i];
      var n = strokeOf(ch);
      if (n == null) { missing.push(ch); totalOk = false; }
      else total += n;
      items.push({ 字: ch, 康熙笔画: n, 数理五行: (n == null ? null : wxOfTail(n)) });
    }

    var gua = totalOk ? guaOfStrokes(total) : null;
    var totalWx = totalOk ? wxOfTail(total) : null;

    // 各字数理五行去重汇总
    var perWx = [];
    items.forEach(function (it) { if (it.数理五行 && perWx.indexOf(it.数理五行) < 0) perWx.push(it.数理五行); });

    // 与所问事类比对（以总画数理五行为准，兼容各字）
    var shiWx = inp.事 ? SHI_WX[inp.事] : null;
    var shiRel = (shiWx && totalWx) ? [totalWx + ' ↔ ' + shiWx + '：' + relBetween(totalWx, shiWx)] : null;

    // 断语（会意层，已标注为人文推断）
    var duan = [];
    duan.push('【字之本体】「' + word + '」' + (totalOk ? '共 ' + total + ' 画（康熙口径）' : '笔画未全，见缺字提示'));
    duan.push('【字逐字】' + items.map(function (it) {
      return it.字 + (it.康熙笔画 != null ? (it.康熙笔画 + '画·' + it.数理五行) : '（无笔画数据）');
    }).join('，'));
    if (totalOk) {
      duan.push('【数理五行】总画 ' + total + ' → 尾数五行「' + totalWx + '」：' + WX_XING[totalWx] + '。');
      duan.push('【起卦】总画 ' + total + ' ÷ 8 ' + (gua.先天数 === 8 ? '整除' : '余 ' + gua.先天数)
        + ' → 先天卦「' + gua.卦名 + '」（五行属' + gua.五行 + '）。');
    }
    if (shiRel) duan.push('【与所问「' + inp.事 + '」比对】' + shiRel.join('；'));

    var adTips = [];
    items.forEach(function (it) {
      var ad = ADD_DEL[it.字];
      if (ad) {
        if (ad.加一.length) adTips.push(it.字 + ' 加一笔可作「' + ad.加一.join('、') + '」');
        if (ad.减一.length) adTips.push(it.字 + ' 减一笔可作「' + ad.减一.join('、') + '」');
      }
    });
    if (adTips.length) duan.push('【增删法（有限示例）】' + adTips.join('；'));

    return {
      字: word,
      逐字: items,
      总康熙笔画: totalOk ? total : null,
      总数理五行: totalWx,
      各字数理五行: perWx,
      缺字: missing,
      卦: gua,
      所问: inp.事 || null,
      所问五行: shiWx,
      五行比对: shiRel,
      断语: duan,
      说明: '测字属「会意层」传统人文解读（非可验证的天文/历算算法）。笔画取 Kangxi 康熙口径（单一真源）；'
        + '五行用「笔画尾数数理五行」无需部首即可判定；起卦用先天八卦数（笔画%8）。'
        + '⚠️ 部首/偏旁自动判定不可行（汉字为单一 Unicode 码点，不含部首子串），需 Unihan kRSUnicode 数据，'
        + '本项目尚未内嵌 → 未做自动取部首，故亦未提供偏旁会意；《测字秘牒》十法待权威全本比对。',
      缺料: missing.length ? ('字「' + missing.join('') + '」不在康熙笔画表（3500 通用规范汉字）内，无法取准笔画，不臆造。') : ''
    };
  }

  return {
    analyze: analyze, strokeOf: strokeOf, guaOfStrokes: guaOfStrokes,
    wxOfTail: wxOfTail, relBetween: relBetween,
    XIANTIAN: XIANTIAN, BAGUA_WX: BAGUA_WX, SHI_WX: SHI_WX, ADD_DEL: ADD_DEL, WX_XING: WX_XING
  };
});
