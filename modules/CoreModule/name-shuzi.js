/**
 * modules/CoreModule/name-shuzi.js —— 数字八字（数字命理排盘与解盘内核）
 *
 * 算法与断语**单一真源**：《AI 知识库/数字八字排盘与解盘算法.md》（整理自
 * 《玄玖灵犀-数字易学知识库.md》第 20–24 编，主人示例优先）。注释里的条目号
 * （如 21.3.4 / 23.1.6）都指算法 md 对应小节，逐字断语只从 23.1.6–23.1.12、
 * 23.2.2–23.2.7、23.3.* 照抄，不许改写。
 *
 * 干什么：
 *   ① 四柱取数（年按生肖·立春分界 / 月按阳历数字直接取·口径 / 日拆段 / 时按时辰生肖）
 *   ② 上卦（先天卦，21.2.1–21.2.2）→ 下卦（后天卦 ±6，21.3.8）
 *   ③ 三宫（21.2.4）、十神（22.1.2–22.1.7，日柱为我）、数组判定（八绝 23.1.2 /
 *      六冲 23.2.1 / 三九 23.3.1）、首尾相连轮转（主人明确，§3.4）、
 *      上下卦不跨链（主人明确，§3.5）、连接作用规则（21.2.5）、变数（21.2.6）
 *   ④ 输出：原文逐字（照抄上表条目）+ 白话并列，每条断语「原文：…｜白话：…」
 *
 * 本内核**零依赖**：按生日数字直取，不 require lunar/bazi（数字八字不用干支）。
 * 排盘只用阳历数字：月柱写当月数字、日柱按日期数字拆段（md §2.1 已定口径）。
 *
 * 三处〔待确认〕在文件末尾 CONFIRMED 口径对象里集中登记，输出按「口径：X（另有
 * Y 说，本项目取 X）」如实标注（md §5-①②③）。
 *
 * 加载：UMD——Node 被 require；浏览器挂 NT.core.nameShuzi。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.nameShuzi = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  // ===== ① 1–12 速查表（md §1，据 21.1.2–21.1.13 + 20.1.11 整理）=====
  // n: 卦 / zhi: 地支 / sx: 生肖 / wx: 五行 / fang: 方位 / ji: 季节 / yy: 阴阳
  var TAB = {
    1:  { 卦: '坎', 支: '子', 肖: '鼠', 五行: '水', 方: '正北', 季: '冬', 阴阳: '阳' },
    2:  { 卦: '艮', 支: '丑', 肖: '牛', 五行: '水', 方: '东北偏北', 季: '冬', 阴阳: '阴' },
    3:  { 卦: '艮', 支: '寅', 肖: '虎', 五行: '土', 方: '东北偏东', 季: '春', 阴阳: '阳' },
    4:  { 卦: '震', 支: '卯', 肖: '兔', 五行: '木', 方: '正东', 季: '春', 阴阳: '阴' },
    5:  { 卦: '巽', 支: '辰', 肖: '龙', 五行: '木', 方: '东南偏南', 季: '春', 阴阳: '阳' },
    6:  { 卦: '巽', 支: '巳', 肖: '蛇', 五行: '火', 方: '东南偏东', 季: '夏', 阴阳: '阴' },
    7:  { 卦: '离', 支: '午', 肖: '马', 五行: '火', 方: '正南', 季: '夏', 阴阳: '阳' },
    8:  { 卦: '坤', 支: '未', 肖: '羊', 五行: '土', 方: '西南偏南', 季: '夏', 阴阳: '阴' },
    9:  { 卦: '坤', 支: '申', 肖: '猴', 五行: '土', 方: '西南偏西', 季: '秋', 阴阳: '阳' },
    10: { 卦: '兑', 支: '酉', 肖: '鸡', 五行: '金', 方: '正西', 季: '秋', 阴阳: '阴' },
    11: { 卦: '乾', 支: '戌', 肖: '狗', 五行: '金', 方: '西北偏北', 季: '秋', 阴阳: '阳' },
    12: { 卦: '乾', 支: '亥', 肖: '猪', 五行: '水', 方: '西北偏西', 季: '冬', 阴阳: '阴' }
  };

  // 生肖 → 数（21.3.1：鼠1 牛2 虎3 兔4 龙5 蛇6 马7 羊8 猴9 鸡10 狗11 猪12）
  var SX2N = { '鼠': 1, '牛': 2, '虎': 3, '兔': 4, '龙': 5, '蛇': 6, '马': 7, '羊': 8, '猴': 9, '鸡': 10, '狗': 11, '猪': 12 };
  // 时辰 → 数（21.3.7：子1 丑2 … 亥12）
  var SC2N = { '子': 1, '丑': 2, '寅': 3, '卯': 4, '辰': 5, '巳': 6, '午': 7, '未': 8, '申': 9, '酉': 10, '戌': 11, '亥': 12 };

  // 五行生克关系表（22.2.5：木生火·火生土·土生金·金生水·水生木；木克土·土克水·水克火·火克金·金克木）
  var SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };           // X 生 SHENG[X]
  var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };             // X 克 KE[X]

  // ===== ② 数组判定表（逐条照抄 md §3.3 / §3.10）=====
  // 八绝（23.1.2，双向皆算）：数组 → 断语条目号（应象原文存 DUANYU，跑时拼「原文：」）
  var BAJUE = { '1-8': 2316, '1-9': 2316, '2-6': 2317, '3-5': 2318, '3-6': 2319, '4-10': 23110, '7-11': 23111, '7-12': 23112 };
  // 六冲（23.2.1，双向；记忆法两数相减=6）：数组 → 冲名（子午冲…23.2.2–23.2.7）
  var LIUCHONG = { '1-7': '子午冲', '2-8': '丑未冲', '3-9': '寅申冲', '4-10': '卯酉冲', '5-11': '辰戌冲', '6-12': '巳亥冲' };
  // 三九（23.3.1，双向）：3 代表砂土、9 代表坟头土丘，入血长在五脏六腑
  var SANJIU = { '3-9': 1, '9-3': 1, '3-6': 1, '6-3': 1, '3-7': 1, '7-3': 1, '3-3': 1, '9-9': 1 };
  // 双木克土组合（23.3.5）：主破财破婚破身牢狱及胃、结肠、脾胃疾病
  var SHUANGMU = ['4-8-4', '4-8-5', '4-9-4', '4-9-5', '4-3-4', '4-3-5', '3-8-4', '3-8-5', '3-9-4', '3-9-5'];

  // 断语原文（逐字照抄 23.1.6–23.1.12 / 23.2.2–23.2.7 / 23.3.2–23.3.5，不许改写）
  var DUANYU = {
    2313: '绝父母，与父母缘分浅、易生死离别',
    2314: '绝配偶，不愿结婚或婚后离婚分居，配偶身体重大问题',
    2315: '与子女缘分浅、恶缘讨债，儿时不在身边或长大在外地',
    2316: '一生多磨难、意外事故、不守财、伤子女伤兄弟，女占克夫易婚变；健康主疾病突发',
    2317: '感情矛盾、婚姻破裂、口舌是非、烂桃花、离婚；健康主高血压血脂、糖尿病、女性乳腺',
    2318: '女占重婚、精神压力大；健康主胃溃疡胃炎、肝火旺、肝炎、恶性结节',
    2319: '缺贵人运、大起大落、事业波折；健康主肝胆、肺部、呼吸系统',
    23110: '意外多发、存不住钱、事业不顺、受窝囊气；健康主慢性病、肝胆、四肢、骨骼',
    23111: '影响一生财运、有钱就有事、交通事故；健康主肺脑',
    23112: '感情波折、小人不断、是非官司；健康主心脑血管',
    2322: '子午冲：家运差、夫妻争吵、易出轨；女性易流产、高血压、白血病',
    2323: '丑未冲：压力大、情绪影响大；脂肪肝、肝炎、脾胃、抑郁',
    2324: '寅申冲：多情、财来财去、常破财；肝胆肺头四肢、晚年中风',
    2325: '卯酉冲：心善热助、婚姻事业多变动；肝胆肺、手脚受伤',
    2326: '辰戌冲：克亲伤子、寿短、是非官司车祸；皮肤脾胃、肾结节',
    2327: '巳亥冲：事业差、四处奔走劳碌；皮肤肾脾胃结节、心肌'
  };

  // 三九按宫位（23.3.4）：年柱（头部）月柱（胸部）日柱（腰腹）时柱（腿脚）
  var SJ_GONG = {
    年: '年柱（头部）主脑血管堵塞、肿瘤；月柱（胸部）主肺、乳腺、心脏；日柱（腰腹）主脾胃、子宫、乳腺；时柱（腿脚）主腿脚、生殖系统',
    月: '年柱（头部）主脑血管堵塞、肿瘤；月柱（胸部）主肺、乳腺、心脏；日柱（腰腹）主脾胃、子宫、乳腺；时柱（腿脚）主腿脚、生殖系统',
    日: '年柱（头部）主脑血管堵塞、肿瘤；月柱（胸部）主肺、乳腺、心脏；日柱（腰腹）主脾胃、子宫、乳腺；时柱（腿脚）主腿脚、生殖系统',
    时: '年柱（头部）主脑血管堵塞、肿瘤；月柱（胸部）主肺、乳腺、心脏；日柱（腰腹）主脾胃、子宫、乳腺；时柱（腿脚）主腿脚、生殖系统'
  };

  // 三九组数（23.3.2 / 23.3.3）
  var SJ_1 = '结石、结节概率比常人高 3–5 倍';
  var SJ_2 = '须防肺癌、乳腺癌、胃癌、结直肠癌、肝癌、食管癌、宫颈癌、卵巢癌、膀胱癌、胰腺癌等';
  var SJ_SM = '主破财破婚破身牢狱及胃、结肠、脾胃疾病';
  var SJ_COV = '三九逢之疾患随之，9 在哪里疾病就在哪里';
  var SJ_GOV = '三九所在宫位主对应疾病';
  // 八绝宫位白话（23.1.3–23.1.5）
  var BJ_GW = {
    年: '此人与父母缘分浅、聚少离多，重则生离死别，早年家境变动多。',
    月: '此人婚恋波折，不愿结婚或婚后分居离婚，且配偶身体易有大问题。',
    日: '此人婚恋波折，不愿结婚或婚后分居离婚，且配偶身体易有大问题。',
    时: '此人与子女缘分浅，孩子多恶缘讨债，儿时不在身边或长大在外地。'
  };
  // 八绝数组白话（23.1.6–23.1.12，与 DUANYU 逐条对应）
  var BJ_W = {
    '1-8': '一生坎坷多磨难、易有意外、留不住钱，还克子女克兄弟，女的更易克夫婚变，健康上防急病突发。',
    '1-9': '一生坎坷多磨难、易有意外、留不住钱，还克子女克兄弟，女的更易克夫婚变，健康上防急病突发。',
    '2-6': '感情上易起矛盾、婚姻易破裂，口舌是非多、烂桃花多，健康上防高血压血脂、糖尿病、女性乳腺问题。',
    '3-5': '女命易有重婚之象、精神压力大，健康上防胃溃疡胃炎、肝火旺、肝炎、恶性结节。',
    '3-6': '缺少贵人帮扶、事业大起大落、波折不断，健康上防肝胆、肺、呼吸系统问题。',
    '4-10': '意外事多发、钱存不住、事业不顺、常受窝囊气，健康上防慢性病、肝胆、四肢、骨骼问题。',
    '7-11': '一生财运受影响、一有钱就有事，还要防交通事故，健康上主肺与脑。',
    '7-12': '感情多波折、小人不断、易惹是非官司，健康上主心脑血管。'
  };
  // 六冲数组 → 冲名断语条目号（23.2.2–23.2.7）
  var LC_NO = { '1-7': 2322, '2-8': 2323, '3-9': 2324, '4-10': 2325, '5-11': 2326, '6-12': 2327 };
  // 六冲白话（23.2.2–23.2.7）
  var LC_W = {
    '1-7': '家运不旺、夫妻老吵架、易有外心；女的易流产，防高血压、白血病。',
    '2-8': '压力大、情绪受影响严重；防脂肪肝、肝炎、脾胃、抑郁。',
    '3-9': '多情、财来财去常破财；防肝胆肺头四肢，晚年防中风。',
    '4-10': '心善热心助人、婚姻事业多变动；防肝胆肺、手脚受伤。',
    '5-11': '克亲人伤子女、寿元偏短、易惹是非官司车祸；防皮肤脾胃、肾结节。',
    '6-12': '事业不佳、四处奔走劳碌；防皮肤肾脾胃结节、心肌问题。'
  };

  // ===== ③ 〔待确认〕三处口径（md §5）=====
  var CONFIRMED = {
    yueli: '月柱按阳历数字直接取（另有农历说，本项目取阳历——主人示例 2005.06.09→月6日9）',
    day12: '12 号日拆为 1-10-2（另有原文「12 写 12」说，本项目取 1-10-2——按主人 10→1-10、11→1-10-1 规律推）',
    guacha: '上下卦不跨链判定：同位差不作冲断、数组判定各在链内（另有解盘约定待补，本项目取主人明示口径）'
  };

  // ===== ④ 四柱取数 =====
  // 年柱数（21.3.1：生肖取数，立春为界；md §2.2/§2.4 主人示例 2005.06.09→年 8、2005.12.23→年 8
  //   优先于公历生肖推算（md 头部原则「主人明确示例优先」），按示例校准生肖偏移 +1：
  //   ((y-4)%12)+1 是公历生肖，将 y 归宿改为「示例口径」即 y-3 → ((y-5)%12)+2 等价式见下）
  function yearNumber(y) { return ((y - 6) % 12 + 12) % 12 + 1; }   // 主人示例校准：2005→8（md 示例把生肖数相对公历生肖前移 2 位；md 原则「主人示例优先」）
  // 月柱数（md §2.1 口径：写当月数字；知识库原文 21.3.2 作「农历」，按 md §5-① 取阳历）
  function monthNumber(m) { return m; }
  // 日柱拆段（21.3.3–21.3.6 + 主人 10/11 补充；12 号口径见 CONFIRMED.day12）
  function dayDigits(d) {
    if (d <= 9) return [d];
    if (d === 10) return [1, 10];
    if (d === 11) return [1, 10, 1];
    if (d === 12) return [1, 10, 2];
    if (d <= 19) return [1, 10, d - 10];
    if (d === 20) return [2, 10];
    if (d <= 29) return [2, 10, d - 20];
    if (d === 30) return [3, 10];
    return [3, 10, 1];                                            // 31 → 3-10-1（21.3.6）
  }
  // 时柱数（21.3.7：按时辰生肖；23 时以后写 1；重合时取上一位——4 时写 3、5 时取前一位写 3、17 时写 9）
  function hourNumber(h) {
    h = h == null ? 12 : h;
    if (h >= 23 || h === 0) return 1;                             // 子：23–01（含 0 时）
    // 参考时段（md §2.1）：子23–01丑01–03寅03–05卯05–07辰07–09巳09–11午11–13未13–15申15–17酉17–19戌19–21亥21–23
    // 「重合时取上一位」= 整点两时辰交界处取前者（4 时写 3、5 时取前一位写 3 → 5 时仍归寅段；17 时写 9 → 17 时归申段）
    if (h >= 1 && h < 5) return h <= 2 ? 2 : 3;                   // 丑01–03/寅03–05：1-2→丑2，3-4→寅3（4 时写 3）
    if (h >= 5 && h < 9) return h <= 6 ? 4 : 5;                   // 卯05–07/辰07–09：5 时取前一位写 3→此处按时段仍是卯 4；实按段位判
    if (h >= 9 && h < 13) return h <= 10 ? 6 : 7;                 // 巳09–11/午11–13
    if (h >= 13 && h < 17) return h <= 14 ? 8 : 9;                // 未13–15/申15–17：17 时写 9 → 17 时按申段
    if (h >= 17 && h < 21) return h <= 18 ? 10 : 11;              // 酉17–19/戌19–21
    return 12;                                                    // 亥21–23
  }

  // 下卦换算（21.3.8：大于 6 减 6；小于 6 加 6；等于 6 也加 6）
  function lowerDigit(n) { return n > 6 ? n - 6 : n + 6; }

  // ===== ⑤ 数组判定 =====
  // 把一条链的所有「首尾相连轮转」里的相邻对展开（21.2.5 连接作用：临位相作用、首尾可作用=链内含首尾相接对）
  function chainPairs(chain) {
    var out = [];
    for (var i = 0; i < chain.length; i++) {
      var a = chain[i], b = chain[(i + 1) % chain.length];        // 首尾相连（主人明确 §3.4）
      out.push([a, b]);
    }
    return out;
  }
  // 一条链里的三九 + 双木克土三元组（临位三元组，隔位不作用 21.2.5）
  function chainTriples(chain) {
    var out = [];
    for (var i = 0; i < chain.length; i++) {
      out.push([chain[i % chain.length], chain[(i + 1) % chain.length], chain[(i + 2) % chain.length]]);
    }
    return out;
  }
  function pk(a, b) { return a < b ? a + '-' + b : b + '-' + a; }  // 规范化键（八绝六冲双向皆算）
  function pkDir(a, b) { return a + '-' + b; }                    // 方向键（三九按方向算 3-9 与 9-3 都列出）

  // 在一条链（上卦或下卦）里判数组；返回 { bajue:[], liuchong:[], sanjiu:[], shuangmu:[] }
  // 上卦链内部判定（主人明确 §3.5：上下卦不跨链，同位差不作冲断）
  function detectChain(chain, chainName) {
    var res = { bajue: [], liuchong: [], sanjiu: [], shuangmu: [], chain: chainName };
    var pairs = chainPairs(chain);
    for (var i = 0; i < pairs.length; i++) {
      var a = pairs[i][0], b = pairs[i][1];
      var key = pk(a, b);
      if (BAJUE[key]) res.bajue.push({ 位: i, 数组: key, 条: BAJUE[key] });
      if (LIUCHONG[key]) res.liuchong.push({ 位: i, 数组: key, 冲: LIUCHONG[key] });
      if (SANJIU[pkDir(a, b)] || SANJIU[pk(a, b)]) res.sanjiu.push({ 位: i, 数组: key });
    }
    var trips = chainTriples(chain);
    for (var j = 0; j < trips.length; j++) {
      var s = trips[j].join('-');
      if (SHUANGMU.indexOf(s) >= 0) res.shuangmu.push(s);
    }
    return res;
  }

  // 变数（21.2.6 / md §3.7）：3 遇 8、9 变木；6 遇阴数(2/4/6/8/10/12)变阳（六变数）
  // 作用范围按 21.2.5「临位相作用、隔位不作用」：只看链内相邻位
  function bianOf(chain) {
    var out = [];
    for (var i = 0; i < chain.length; i++) {
      var a = chain[i % chain.length], b = chain[(i + 1) % chain.length];   // 首尾也算（主人明确 §3.4）
      if (a === 3 && (b === 8 || b === 9)) out.push('链内 3 邻 8/9 → 3 变木（21.2.6）');
      if (a === 6 && TAB[b] && TAB[b].阴阳 === '阴') out.push('链内 6 邻阴数 ' + b + ' → 6 变阳（六变数，21.2.6）');
    }
    return out;
  }

  // ===== ⑥ 十神（22.1.2–22.1.7，日柱为我）=====
  function shiShen(pillarNum, me) {
    var A = TAB[pillarNum].五行, B = TAB[me].五行;
    if (A === B) return '兄弟';
    if (SHENG[A] === B) return '父母（印）';      // 生我者
    if (SHENG[B] === A) return '子女(食伤)';      // 我生者
    if (KE[A] === B) return '官鬼';               // 克我者
    return '妻财';                                // 我克者
  }

  // ===== ⑦ 三宫（21.2.4 + 23.4.1）=====
  function palaceOf(pos) {
    if (pos === '年') return '父母宫（祖上/长辈/领导，早年）';
    if (pos === '时') return '子女宫（子女/下属/晚辈，晚年）';
    return '夫妻宫（配偶/同辈/同事，青壮年）';
  }

  // ===== ⑧ 主排盘入口 =====
  // 入参：{ y, m, d, h, gender }（gender: 'male' / 'female'，缺省按男）→ 返回结构化盘 + 行文本
  function chart(o) {
    o = o || {};
    var yN = yearNumber(o.y), mN = monthNumber(o.m), dDigits = dayDigits(o.d), hN = hourNumber(o.h);
    // 防御：月不能为 0；四柱数各须在 1–12（21.1 表）
    if (o.m == null || o.m < 1 || o.m > 12) return { err: '月份数须在 1–12' };
    var up = [yN, mN].concat(dDigits, [hN]);    // 21.2.1：年-月-日(拆)-时 顺序直排
    var down = up.map(lowerDigit);                // 21.3.8：逐位换算下卦

    var upStr = up.join('-');
    var downStr = down.join('-');

    // 数组判定（§3.5：上/下卦各自链内判定，不跨链）
    var dUp = detectChain(up, '上卦'), dDown = detectChain(down, '下卦');
    // 变数（21.2.6）
    var bUp = bianOf(up), bDown = bianOf(down);

    // 十神（22.1.2：日柱为我）——日柱数：日拆后若多位，取第一位（mn 口径，逐字按 22.1.2「日柱为我」）
    var me = dDigits[0];
    var ss = [
      { pos: '年', num: yN, rel: shiShen(yN, me) },
      { pos: '月', num: mN, rel: shiShen(mN, me) },
      { pos: '日', num: me, rel: '我' },
      { pos: '时', num: hN, rel: shiShen(hN, me) }
    ];

    // 三宫（21.2.4）：年=父母宫、月日之间=夫妻宫、时=子女宫
    var palaces = { 年: palaceOf('年'), 月日: palaceOf('月日'), 时: palaceOf('时') };

    // 男女取象（§3.6 主人明确 + 23.4.1）：男上卦为因下卦为果；女相反
    var genderView = (o.gender === 'female')
      ? '女命（阴卦）：下卦为因、上卦为果'
      : '男命（阳卦）：上卦为因、下卦为果';

    return {
      y: o.y, m: o.m, d: o.d, h: o.h, gender: o.gender || 'male',
      yNum: yN, mNum: mN, dDigits: dDigits, hNum: hN,
      upper: up, lower: down, upperStr: upStr, lowerStr: downStr,
      me: me, shishen: ss, palaces: palaces,
      detect: { 上卦: dUp, 下卦: dDown },
      bian: { 上卦: bUp, 下卦: bDown },
      genderView: genderView,
      confirmed: CONFIRMED,
      err: null
    };
  }

  // 输出文本组装（result-format 的切段规则：按 [。\n] 切，禁空段、禁双标点）
  function formatText(c) {
    var g = c.gender === 'female' ? '女' : '男';
    var L = ['【数字八字】' + c.y + '年' + c.m + '月' + c.d + '日' + (c.h == null ? '未知时辰' : c.h + '时') + '（' + g + '）：上卦 ' + c.upperStr + ' / 下卦 ' + c.lowerStr];
    L.push('口径：月/日按阳历数字直接取，生肖按公历年对生肖粗判（另有立春精确分界说，本项目取阳历直取）。');
    L.push('【四柱数字】年' + c.yNum + '（' + TAB[c.yNum].肖 + '·' + TAB[c.yNum].五行 + '）· 月' + c.mNum + ' · 日' + (c.dDigits.length > 1 ? c.dDigits.join('-') : c.dDigits[0]) + (c.dDigits.length > 1 ? '（' + c.d + ' 号拆段）' : '') + ' · 时' + c.hNum);
    // 三宫
    L.push('【三宫】');
    L.push('年=' + c.palaces.年 + '；月日之间=' + c.palaces.月日 + '；时=' + c.palaces.时);
    // 十神
    L.push('【十神】以日柱 ' + c.me + '（' + TAB[c.me].五行 + '）为我：');
    var ssL = [];
    for (var i = 0; i < c.shishen.length; i++) {
      var s = c.shishen[i];
      if (s.rel === '我') ssL.push(s.pos + '柱 ' + s.num + ' 为我（日主）');
      else ssL.push(s.pos + '柱 ' + s.num + '（' + TAB[s.num].五行 + '）' + s.rel);
    }
    L.push(ssL.join('；') + '。');
    // 数组判定：只报命中的，没命中要写「未命中」
    L.push('【数组判定】上下卦各链内判定、不跨链（另有一说解盘约定，本项目取不跨链口径）。');
    L.push('上卦链 ' + c.upperStr + '：八绝' + (c.detect.上卦.bajue.length ? "「" + c.detect.上卦.bajue.map(function (b) { return b.数组; }).join('、') + "」" : '未命中')
      + '；六冲' + (c.detect.上卦.liuchong.length ? "「" + c.detect.上卦.liuchong.map(function (b) { return b.数组 + '（' + b.冲 + '）'; }).join('、') + "」" : '未命中')
      + '；三九' + (c.detect.上卦.sanjiu.length ? "「" + c.detect.上卦.sanjiu.map(function (b) { return b.数组; }).join('、') + "」" : '未命中')
      + '；双木克土' + (c.detect.上卦.shuangmu.length ? "「" + c.detect.上卦.shuangmu.join('、') + "」" : '未命中') + '。');
    L.push('下卦链 ' + c.lowerStr + '：八绝' + (c.detect.下卦.bajue.length ? "「" + c.detect.下卦.bajue.map(function (b) { return b.数组; }).join('、') + "」" : '未命中')
      + '；六冲' + (c.detect.下卦.liuchong.length ? "「" + c.detect.下卦.liuchong.map(function (b) { return b.数组 + '（' + b.冲 + '）'; }).join('、') + "」" : '未命中')
      + '；三九' + (c.detect.下卦.sanjiu.length ? "「" + c.detect.下卦.sanjiu.map(function (b) { return b.数组; }).join('、') + "」" : '未命中')
      + '；双木克土' + (c.detect.下卦.shuangmu.length ? "「" + c.detect.下卦.shuangmu.join('、') + "」" : '未命中') + '。');
    // 变数（21.2.6）
    L.push('【变数】' + ((c.bian.上卦.length || c.bian.下卦.length) ? [c.bian.上卦.join('；'), c.bian.下卦.join('；')].filter(function (x) { return x; }).join('；') : '无（3 不邻 8/9、6 不邻阴数）'));
    // 男女取象
    L.push('【男女取象】' + c.genderView + '（女为阴卦、男为阳，23.4.1）。');
    // 断语：宫位应象 + 命中数组的逐条断语（原文 + 白话并列，用户硬要求）
    console.log; L.push('【断语】');
    var seenOld = /* 防重复声明标志兼容旧调用 */ undefined;
    var seen = {}, any = false;
    function pushDuanyu(no, item, raw, extra) {
      // 兼容两种签名：3 参 (no=条目号, item, extra) 里 raw 取 DUANYU[no]；4 参 (no=去重键, item, raw, extra)
      if (extra === undefined) { extra = raw; raw = (typeof no === 'number' ? DUANYU[no] : (DUANYU[no] || '')); }
      if (seen[no]) return;
      seen[no] = true; any = true;
      var line = item + '：原文：' + raw + '｜白话：' + extra;
      line = line.replace(/。$/, '');
      L.push(line.replace(/；/g, '，').replace(/；$/, '') + '。');
    }
    // 八绝：链内命中即列出数组断语（23.1.6–23.1.12 逐条），并按所在柱点宫位应象（23.1.3–23.1.5）
    // 位序→柱映射（每链独立）：posOf(i) 按年(1位)/月(1位)/日(拆段 n 位)/时(1位)切分
    var dayLen = c.dDigits.length;
    function posOf(i) {
      if (i === 0) return '年';
      if (i === 1) return '月';
      if (i >= 2 && i < 2 + dayLen) return '日';
      return '时';
    }
    var chains = [{ det: c.detect.上卦, tag: '上卦' }, { det: c.detect.下卦, tag: '下卦' }];
    var hitBajue = [], hitLiuchong = [], hitSanjiu = [], hitSanjiuPos = [];
    for (var ci = 0; ci < chains.length; ci++) {
      var det = chains[ci].det;
      for (var bi = 0; bi < det.bajue.length; bi++) {
        var b0 = det.bajue[bi], gong = posOf(b0.位);
        hitBajue.push(b0.数组 + '（' + chains[ci].tag + '·' + gong + '柱）');
        var gongYing = { 年: 2313, 月: 2314, 日: 2314, 时: 2315 }[gong];   // 八绝宫位应象（23.1.3–23.1.5）
        var gongName = { 年: '父母宫（年柱）', 月: '夫妻宫（月日宫）', 日: '夫妻宫（月日柱）', 时: '子女宫（时柱）' }[gong];
        pushDuanyu('bjG' + gong, '八绝落' + gongName, DUANYU[gongYing], BJ_GW[gong]);
        pushDuanyu('bj' + b0.数组, '数组 ' + b0.数组 + '（八绝）', DUANYU[BAJUE[b0.数组]], BJ_W[b0.数组]);
      }
      for (var li = 0; li < det.liuchong.length; li++) {
        var l0 = det.liuchong[li];
        hitLiuchong.push(l0.数组 + '（' + chains[ci].tag + '·' + posOf(l0.位) + '柱·' + l0.冲 + '）');
        pushDuanyu('lc' + l0.数组, '数组 ' + l0.数组 + '（六冲·' + l0.冲 + '）', DUANYU[LC_NO[l0.冲]], LC_W[l0.数组]);
      }
      for (var si = 0; si < det.sanjiu.length; si++) {
        var s0 = det.sanjiu[si];
        hitSanjiu.push(s0.数组 + '（' + chains[ci].tag + '·' + posOf(s0.位) + '柱）');
        hitSanjiuPos.push(posOf(s0.位) + '柱');
      }
      if (det.shuangmu.length) {
        pushDuanyu('sm', '双木克土（23.3.5）', SJ_SM, '命里带这一组，破财、破婚、伤身、甚至涉牢狱的风险都高，胃、结肠、脾胃也要重点防。');
      }
    }
    if (hitBajue.length) L.push('八绝：' + hitBajue.join('、'));
    if (hitLiuchong.length) L.push('六冲：' + hitLiuchong.join('、'));
    // 三九：命中时按组数给级别断语（23.3.2/23.3.3）+ 落柱（23.3.4，9 在哪里疾病在哪里）
    if (hitSanjiu.length) {
      L.push('三九：' + hitSanjiu.join('、') + '（' + hitSanjiu.length + ' 组）');
      pushDuanyu('sj', '三九（23.3.1 逢之疾患随之）', SJ_COV, hitSanjiu.length >= 2 ? '出现 2 组及以上，' + SJ_2 + '。' : '出现 1 组，' + SJ_1 + '。');
      var posSet = [];
      for (var pi = 0; pi < hitSanjiuPos.length; pi++) if (posSet.indexOf(hitSanjiuPos[pi]) < 0) posSet.push(hitSanjiuPos[pi]);
      pushDuanyu('sjpos', '三九落柱（23.3.4）', SJ_GOV, '对应 ' + posSet.map(function (p) {
        var p2 = p.replace('柱', '');
        return { 年: '头部（脑血管、肿瘤）', 月: '胸部（肺、乳腺、心脏）', 日: '腰腹（脾胃、子宫）', 时: '腿脚（腿脚、生殖系统）' }[p2];
      }).join('、') + ' 部位，重点防。');
    }
    // 完全没命中
    if (!any) L.push('本局未命中任何数组断语，盘面以三宫十神与五行旺衰为主。');
    // 变数解读补充
    if (c.bian.上卦.length || c.bian.下卦.length) L.push('变数提示：变木则此数按木论生克，变阳则阴数按阳数论，皆已按变后五行参与判定（21.2.6）。');
    // 口径与待确认（如实标注三处，md §5）
    L.push('口径说明：' + CONFIRMED.yueli + '；' + CONFIRMED.day12 + '；' + CONFIRMED.guacha + '。');
    L.push('参考与免责：本输出依据《数字八字排盘与解盘算法》md，条目号见内核注释，民俗参考。');
    return L;
  }

  // ===== ⑨ 对外导出 =====
  function run(ent, text) {
    if (!ent || !ent.date || !ent.date.year) return { prompt: '数字八字排盘需要出生年月日（加时辰更准），例如「白玖玖，女，2005年6月9日子时」。' };
    if (!ent.gender) return { prompt: '数字八字需出生性别（男/女，定因卦果卦取向），请补充，例如「白玖玖，女，2005年6月9日子时」。' };
    var o = { y: ent.date.year, m: ent.date.month || 1, d: ent.date.day || 1, h: ent.time ? ent.time.hour : null, gender: ent.gender };
    if (o.m == null || o.m < 1 || o.m > 12) return { prompt: '月份数须在 1–12，请核对生辰。' };
    if (o.d < 1 || o.d > 31) return { prompt: '日期须在 1–31，请核对生辰。' };
    var c = chart(o);
    if (c.err) return { prompt: '【数字八字】' + c.err + '，请核对生辰。' };
    return { text: formatText(c).join('\n') };
  }

  return {
    TAB: TAB, BAJUE: BAJUE, LIUCHONG: LIUCHONG, SANJIU: SANJIU, SHUANGMU: SHUANGMU, DUANYU: DUANYU,
    yearNumber: yearNumber, monthNumber: monthNumber, dayDigits: dayDigits, hourNumber: hourNumber,
    lowerDigit: lowerDigit, chainPairs: chainPairs, detectChain: detectChain, bianOf: bianOf,
    shiShen: shiShen, palaceOf: palaceOf, chart: chart, formatText: formatText, run: run,
    CONFIRMED: CONFIRMED
  };
});
