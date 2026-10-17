/**
 * modules/CoreModule/liuyao.js —— 六爻纳甲筮法内核 C18【单一真源 · 适配层】
 *
 * 算什么：铜钱起卦（三枚记 6 次）→ 本卦/变卦 → 装卦（八宫纳甲 · 安世应 · 六亲 · 六神）→
 *         动爻/变卦 · 旬空/月破/日冲 · 用神选取（父母/官鬼/妻财/子孙/兄弟分测事）· 基本旺衰断。
 *
 * 算法来源（有权威用权威，零臆造；多源核对一致）：
 *   · 八宫卦序（京房八宫）：乾/坎/艮/震/巽/离/坤/兑 八纯卦各领 本·一世·二世·三世·四世·五世·游魂·归魂 七卦，
 *       八宫歌（zewei《納甲》、mykite《纳甲六爻法》逐字一致）：
 *       乾宫：乾·姤·遁·否·观·剥·晋·大有；坎宫：坎·节·屯·既济·革·丰·明夷·师；
 *       艮宫：艮·贲·大畜·损·睽·履·中孚·渐；震宫：震·豫·解·恒·升·井·大过·随；
 *       巽宫：巽·小畜·家人·益·无妄·噬嗑·颐·蛊；离宫：离·旅·鼎·未济·蒙·涣·讼·同人；
 *       坤宫：坤·复·临·泰·大壮·夬·需·比；兑宫：兑·困·萃·咸·蹇·谦·小过·归妹。
 *   · 纳甲（京房）：乾内甲子/甲寅/甲辰·外壬午/壬申/壬戌；坤内乙未/乙巳/乙卯·外壬子/壬寅/壬辰；
 *       坎内戊寅/戊辰/戊午·外戊申/戊戌/戊子；离内己卯/己丑/己亥·外己酉/己未/己巳；
 *       震内庚子/庚寅/庚辰·外庚午/庚申/庚戌；巽内辛丑/辛亥/辛酉·外辛未/辛巳/辛卯；
 *       艮内丙辰/丙午/丙申·外丙戌/丙子/丙寅；兑内丁巳/丁卯/丁丑·外丁亥/丁酉/丁未。（mykite 装干支诀逐字一致）
 *   · 世应（八宫世应）：本宫六世世6应3；一世世1应4；二世世2应5；三世世3应6；
 *       四世世4应1；五世世5应2；游魂世4应1；归魂世3应6。（"天同二世天变五…"口诀推得，多源一致）
 *   · 六亲：以卦宫五行(我) 定——生我=父母、我生=子孙、克我=官鬼、我克=妻财、同我=兄弟。（通用京房规则）
 *   · 六神：甲乙起青龙、丙丁起朱雀、戊起勾陈、己起螣蛇、庚辛起白虎、壬癸起玄武，自下爻起顺排六爻。（mykite 装六神诀）
 *   · 铜钱起卦爻象：三枚，以"背"数定——0背=老阴(×变)、1背=少阳(−静)、2背=少阴(−−静)、3背=老阳(○变)。
 *   · 旬空（空亡）= 日干支所属旬后两位；月破 = 月建地支冲爻地支；日辰生克定旺衰。（通用筮法规则）
 *
 * 加载：UMD —— require（注入 iching + lunar + ganzhi）；浏览器挂 NT.core.liuyao。
 * 校验：modules/CoreModule/__tests__/liuyao.test.js（八宫/纳甲/世应/六亲/六神确定性断言）。
 *
 * 交叉验证状态（守零臆造，如实标注）：
 *   ✅ 八宫序、纳甲干支、世应、六亲、六神、旬空、月破 均为经典定论，多源一致，无歧义。
 *   📌 流派差异（已采用主流京房法，标注待黄金盘验证）：① 纳甲有京房/虞翻两说（本内核用占筮最通行的京房纳甲）；
 *       ② 六神"螣蛇/勾陈"顺序、朱雀/玄武方位偶有流派异文，本内核取"甲乙青龙→朱雀→勾陈→螣蛇→白虎→玄武"主流顺；
 *       ③ 用神旺衰断为"通用旺相休囚死 + 日月生克"简化版，深入"暗动/墓绝/三合局/化进化退"等细则待黄金盘裁定。
 *   v3.1.5 补：④【飞伏】"本卦同位 = 飞神、本宫纯卦同位 = 伏神"为京房纳甲通用定论（多源一致，无歧义）；
 *       飞伏生克取自客观五行生克（生我/我生/克我/我克/比和），非流派臆断。
 *       ⑤【基础断语】六亲持世 / 六神持世 / 世爻空破冲 / 动爻 / 用神现·伏藏 取通用六爻常识（多源一致的持世歌），
 *       属"简化常识层"，深入细则待黄金盘裁定，已如实标注。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./iching.js'), require('./lunar.js'), require('./ganzhi.js'));
  } else {
    root.NT = root.NT || {}; root.NT.core = root.NT.core || {};
    root.NT.core.liuyao = factory(
      root.NT.core && root.NT.core.iching,
      root.NT.core && root.NT.core.lunar,
      root.NT.core && root.NT.core.ganzhi);
  }
})(typeof self !== 'undefined' ? self : this, function (ICE, LUNAR, GANZHI) {

  // ===== 基础表 =====
  // 八卦名（与 iching.BAGUA 一致）；先天数 1-8
  var GUA = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];
  // 地支序（用于纳甲五行、世应映射）
  var ZHI = '子丑寅卯辰巳午未申酉戌亥';
  function zIdx(z) { return ZHI.indexOf(z); }
  // 地支五行
  var Z_WX = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
  // 干五行（纳甲干支取地支五行即可，干仅作标注）
  var GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };

  // ===== 八宫纳甲（每卦的 内三爻/外三爻 干支；内=下卦、外=上卦）=====
  var NAJIA = {
    乾: { 内: ['甲子', '甲寅', '甲辰'], 外: ['壬午', '壬申', '壬戌'] },
    坤: { 内: ['乙未', '乙巳', '乙卯'], 外: ['壬子', '壬寅', '壬辰'] },
    坎: { 内: ['戊寅', '戊辰', '戊午'], 外: ['戊申', '戊戌', '戊子'] },
    离: { 内: ['己卯', '己丑', '己亥'], 外: ['己酉', '己未', '己巳'] },
    震: { 内: ['庚子', '庚寅', '庚辰'], 外: ['庚午', '庚申', '庚戌'] },
    巽: { 内: ['辛丑', '辛亥', '辛酉'], 外: ['辛未', '辛巳', '辛卯'] },
    艮: { 内: ['丙辰', '丙午', '丙申'], 外: ['丙戌', '丙子', '丙寅'] },
    兑: { 内: ['丁巳', '丁卯', '丁丑'], 外: ['丁亥', '丁酉', '丁未'] }
  };

  // ===== 八宫（宫名 → 五行；每宫 8 卦：本/一/二/三/四/五/游/归）=====
  // 每项：卦名、下卦、上卦。世应按下标自动推（见 SHI_YING）。
  var PALACE_WX = { 乾: '金', 坎: '水', 艮: '土', 震: '木', 巽: '木', 离: '火', 坤: '土', 兑: '金' };
  var PALACES = {
    乾: [['乾为天', '乾', '乾'], ['天风姤', '巽', '乾'], ['天山遁', '艮', '乾'], ['天地否', '坤', '乾'],
         ['风地观', '坤', '巽'], ['山地剥', '坤', '艮'], ['火地晋', '坤', '离'], ['火天大有', '乾', '离']],
    坎: [['坎为水', '坎', '坎'], ['水泽节', '兑', '坎'], ['水雷屯', '震', '坎'], ['水火既济', '离', '坎'],
         ['泽火革', '离', '兑'], ['雷火丰', '离', '震'], ['地火明夷', '离', '坤'], ['地水师', '坎', '坤']],
    艮: [['艮为山', '艮', '艮'], ['山火贲', '离', '艮'], ['山天大畜', '乾', '艮'], ['山泽损', '兑', '艮'],
         ['火泽睽', '兑', '离'], ['天泽履', '兑', '乾'], ['风泽中孚', '兑', '巽'], ['风山渐', '艮', '巽']],
    震: [['震为雷', '震', '震'], ['雷地豫', '坤', '震'], ['雷水解', '坎', '震'], ['雷风恒', '巽', '震'],
         ['地风升', '巽', '坤'], ['水风井', '巽', '坎'], ['泽风大过', '巽', '兑'], ['泽雷随', '震', '兑']],
    巽: [['巽为风', '巽', '巽'], ['风天小畜', '乾', '巽'], ['风火家人', '离', '巽'], ['风雷益', '震', '巽'],
         ['天雷无妄', '震', '乾'], ['火雷噬嗑', '震', '离'], ['山雷颐', '震', '艮'], ['山风蛊', '巽', '艮']],
    离: [['离为火', '离', '离'], ['火山旅', '艮', '离'], ['火风鼎', '巽', '离'], ['火水未济', '坎', '离'],
         ['山水蒙', '坎', '艮'], ['风水涣', '坎', '巽'], ['天水讼', '坎', '乾'], ['天火同人', '离', '乾']],
    坤: [['坤为地', '坤', '坤'], ['地雷复', '震', '坤'], ['地泽临', '兑', '坤'], ['地天泰', '乾', '坤'],
         ['雷天大壮', '乾', '震'], ['泽天夬', '乾', '兑'], ['水天需', '乾', '坎'], ['水地比', '坤', '坎']],
    兑: [['兑为泽', '兑', '兑'], ['泽水困', '坎', '兑'], ['泽地萃', '坤', '兑'], ['泽山咸', '艮', '兑'],
         ['水山蹇', '艮', '坎'], ['地山谦', '艮', '坤'], ['雷山小过', '艮', '震'], ['雷泽归妹', '兑', '震']]
  };
  // 八宫世代 → 世爻(1-6)、应爻(1-6)
  // 0本宫(六世)/1一世/2二世/3三世/4四世/5五世/6游魂/7归魂
  var SHI_YING = [
    { shi: 6, ying: 3 }, { shi: 1, ying: 4 }, { shi: 2, ying: 5 }, { shi: 3, ying: 6 },
    { shi: 4, ying: 1 }, { shi: 5, ying: 2 }, { shi: 4, ying: 1 }, { shi: 3, ying: 6 }
  ];

  // 预建 卦名 → 宫信息 字典（单一真源，避免重复推导）
  var GUA_INDEX = {};
  (function buildIndex() {
    for (var p in PALACES) {
      for (var g = 0; g < PALACES[p].length; g++) {
        var e = PALACES[p][g];
        GUA_INDEX[e[0]] = { 宫: p, 宫五行: PALACE_WX[p], 世: SHI_YING[g].shi, 应: SHI_YING[g].ying, 下: e[1], 上: e[2], 代: g };
      }
    }
  })();

  // 六神起例：日干 → 初爻六神
  var SHEN6 = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'];
  var SHEN_OF_GAN = {
    甲: '青龙', 乙: '青龙', 丙: '朱雀', 丁: '朱雀', 戊: '勾陈', 己: '螣蛇', 庚: '白虎', 辛: '白虎', 壬: '玄武', 癸: '玄武'
  };
  function shenOf(yao, dayGan) {
    var s0 = SHEN_OF_GAN[dayGan];
    var i0 = SHEN6.indexOf(s0);
    return SHEN6[(i0 + yao) % 6]; // 自下而上顺排
  }

  // 六亲（我=宫五行，地支五行）
  function qinOf(zhiWx, myWx) {
    if (zhiWx === myWx) return '兄弟';
    var SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
    var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
    if (SHENG[myWx] === zhiWx) return '子孙'; // 我生
    if (SHENG[zhiWx] === myWx) return '父母'; // 生我
    if (KE[myWx] === zhiWx) return '妻财';     // 我克
    if (KE[zhiWx] === myWx) return '官鬼';     // 克我
    return '兄弟';
  }

  // 旬首/旬空（日干支 → 空亡两字）
  function xunKongOf(日干支) {
    if (!GANZHI || !GANZHI.jiaziIndex) return [];
    var idx = GANZHI.jiaziIndex(日干支);
    for (var k = 0; k < 10; k++) {
      var cand = GANZHI.JIAZI[(idx - k + 600) % 60];
      if (cand.charAt(0) === '甲') {
        var i0 = GANZHI.jiaziIndex(cand);
        return [GANZHI.JIAZI[(i0 + 10) % 60].charAt(1), GANZHI.JIAZI[(i0 + 11) % 60].charAt(1)];
      }
    }
    return [];
  }

  // 用神表（测事 → 用神六亲）
  var YONG = {
    '自身': '兄弟', '财运': '妻财', '求财': '妻财', '生意': '妻财', '事业': '官鬼', '功名': '官鬼', '官司': '官鬼',
    '婚姻': '妻财', '感情': '妻财', '妻子': '妻财', '丈夫': '官鬼', '学业': '父母', '考试': '父母', '文书': '父母',
    '长辈': '父母', '父母': '父母', '子女': '子孙', '生育': '子孙', '疾病': '官鬼', '出行': '子孙', '朋友': '兄弟'
  };

  // 合成单爻干支：下卦内三爻 / 上卦外三爻
  function yaGanZhi(下, 上) {
    var nIn = NAJIA[下].内, nOut = NAJIA[上].外;
    return [nIn[0], nIn[1], nIn[2], nOut[0], nOut[1], nOut[2]]; // 初..上
  }

  // ===== v3.1.5 补：飞神/伏神（本宫八纯卦之爻为伏神，本卦同位之爻为飞神）=====
  // 权威口径（京房纳甲通用，多源一致）：用神不现于本卦时，到「本宫八纯卦」同位取其所藏之爻 = 伏神；
  // 本卦同位之爻 = 飞神（覆盖于其上）。飞神生/克伏神 决定是否"出伏可用"。纯卦自身时飞伏同位。
  function flyingHidden(info, curGz) {
    var p = info.宫;
    var pureGz = yaGanZhi(p, p); // 本宫纯卦六爻干支
    var out = [];
    for (var j = 0; j < 6; j++) {
      var fgz = pureGz[j], fz = fgz.charAt(1), fWx = Z_WX[fz];
      var cgz = curGz[j], cz = cgz.charAt(1), cWx = Z_WX[cz];
      var 生 = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
      var 克 = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
      var rel;
      if (生[cWx] === fWx) rel = '飞生伏（易出）';
      else if (克[cWx] === fWx) rel = '飞克伏（受压难出）';
      else if (生[fWx] === cWx) rel = '伏生飞（泄气）';
      else if (克[fWx] === cWx) rel = '伏克飞（可出）';
      else rel = '比和';
      out.push({
        爻: j + 1,
        飞神: { 干支: cgz, 五行: cWx, 六亲: qinOf(cWx, info.宫五行) },
        伏神: { 干支: fgz, 五行: fWx, 六亲: qinOf(fWx, info.宫五行) },
        飞伏关系: rel,
        同位: (info.代 === 0 ? '本宫纯卦，飞伏同位' : '')
      });
    }
    return out;
  }

  // 六亲持世断（通用六爻常识，多源一致的持世歌）
  var SHI_QIN = {
    兄弟: '兄弟持世：克财耗财，求财交易不利，防口舌破耗。',
    子孙: '子孙持世：无忧无虑，消灾解厄；求官求名反而不利（子孙克官鬼）。',
    父母: '父母持世：辛劳奔波，主文书学业有成，但克子孙、不利求嗣享乐。',
    官鬼: '官鬼持世：忧疑多阻，主疾病官非口舌，然求官求名有利。',
    妻财: '妻财持世：利求财、求妻，财物可成；然父母文书受克。'
  };
  // 六神持世断（通用六爻常识）
  var SHI_SHEN = {
    青龙: '青龙持世：喜庆吉祥，主喜庆财禄、进人口。',
    朱雀: '朱雀持世：主口舌是非、文书词讼。',
    勾陈: '勾陈持世：纠缠迟滞，主田土争执、旧事未了。',
    螣蛇: '螣蛇持世：虚惊怪疑，主事多纠缠、难以定夺。',
    白虎: '白虎持世：凶丧伤病，主血光孝服、急灾。',
    玄武: '玄武持世：暧昧不明，主盗贼失脱、虚花暗昧。'
  };

  /**
   * 基础断语（通用六爻常识层）：六亲持世 / 六神持世 / 世爻空破冲 / 动爻 / 用神（现 vs 伏藏）。
   * ⚠️ 属"通用常识+简化旺衰"，深入细则（暗动/墓绝/三合局/化进化退）待黄金盘裁定，不假报。
   */
  function judge(info, lines, yongKey, fh, dongYao) {
    var out = [];
    var shi = lines[info.世 - 1];
    if (shi) {
      if (SHI_QIN[shi.六亲]) out.push({ 类: '持世', 爻: info.世, 项: shi.六亲 + '持世', 断: SHI_QIN[shi.六亲] });
      if (shi.六神 && SHI_SHEN[shi.六神]) out.push({ 类: '六神', 爻: info.世, 项: shi.六神 + '持世', 断: SHI_SHEN[shi.六神] });
      if (shi.标记 && shi.标记.trim()) out.push({ 类: '世爻状态', 爻: info.世, 项: '世爻' + shi.标记.trim(), 断: '（世爻空/破/冲：主自身虚弱或事难落实）' });
    }
    (dongYao || []).forEach(function (n) {
      var l = lines[n - 1];
      if (l) out.push({ 类: '动爻', 爻: n, 项: '第' + n + '爻动（' + l.六亲 + '·' + (l.六神 || '—') + '）', 断: '动则为变机，宜看变卦同位之爻与其化出的六亲。' });
    });
    if (yongKey && fh) {
      var visible = lines.filter(function (l) { return l.六亲 === yongKey; });
      if (visible.length) {
        var marks = visible.filter(function (l) { return l.标记 && l.标记.trim(); });
        out.push({
          类: '用神', 爻: visible.map(function (l) { return l.爻; }),
          项: yongKey + '现于第' + visible.map(function (l) { return l.爻; }).join('/') + '爻',
          断: marks.length ? '用神虽现但临' + marks.map(function (l) { return l.标记.trim(); }).join('、') + '，其力受损，事成中有阻。'
            : '用神现于卦中，可直接据其旺衰（月建日辰生克）判断。'
        });
      } else {
        var hid = fh.filter(function (f) { return f.伏神.六亲 === yongKey; });
        if (hid.length) {
          hid.forEach(function (f) {
            out.push({
              类: '用神', 爻: f.爻,
              项: yongKey + '不现，伏于第' + f.爻 + '爻（伏神 ' + f.伏神.干支 + '·' + f.伏神.五行 + '）',
              断: '飞神 ' + f.飞神.干支 + '（' + f.飞神.六亲 + '）' + f.飞伏关系 + '；须待伏神出伏透出方可论吉凶（简化判断）。'
            });
          });
        } else {
          out.push({ 类: '用神', 项: yongKey + '本卦与本宫纯卦皆无', 断: '此事无缘或难成之象（属简化判断，深入细则待黄金盘）。' });
        }
      }
    }
    return out;
  }

  /**
   * 铜钱起卦：六次投掷，每次记"背"数(0-3)。
   * @param {Array} backs 长度为 6 的数组，每项为 0-3（背数）；缺省随即模拟。
   * @returns 6 爻：{ yin:bool, bian:bool, val:0/1 }
   */
  function tossToYao(backs) {
    var res = [];
    for (var i = 0; i < 6; i++) {
      var b = backs ? backs[i] : Math.floor(Math.random() * 4); // 0..3
      // 0背=老阴(阴变)、1背=少阳(阳静)、2背=少阴(阴静)、3背=老阳(阳变)
      var yin, bian;
      if (b === 0) { yin = true; bian = true; }
      else if (b === 3) { yin = false; bian = true; }
      else if (b === 1) { yin = false; bian = false; }
      else { yin = true; bian = false; }
      res.push({ yin: yin, bian: bian, val: yin ? 0 : 1 });
    }
    return res;
  }

  /**
   * 装卦主函数。
   * @param {Object} inp { y, m, d, h?, backs?:[6], 事?:'财运'... }
   *   backs 给定则按给定起卦；否则按 date 起"随机"卦（test/演示用）。
   * @returns 完整装卦结果。
   */
  function cast(inp) {
    inp = inp || {};
    if (!ICE || !ICE.fromYao) return { err: '六爻需 iching 内核' };
    var backs = inp.backs;
    var yao = tossToYao(backs);
    // 本卦爻值（初..上）
    var benVals = yao.map(function (x) { return x.val; });
    var ben = ICE.fromYao(benVals);
    var benName = ben.卦名;
    var info = GUA_INDEX[benName];
    if (!info) return { err: '未能定位本卦所属八宫：' + benName };

    // 变卦：动爻反之
    var bianVals = benVals.slice();
    var 动爻 = [];
    for (var i = 0; i < 6; i++) if (yao[i].bian) { 动爻.push(i + 1); bianVals[i] = yao[i].val ? 0 : 1; }
    var bianName = (动爻.length ? ICE.fromYao(bianVals).卦名 : null);

    // 纳甲干支
    var gz = yaGanZhi(info.下, info.上);
    // v3.1.8 补：变卦纳甲（化进化退 / 化回头生克 / 化墓化绝 / 伏吟反吟 均需此数据）
    var bianInfo = bianName ? GUA_INDEX[bianName] : null;
    var bianGz = bianInfo ? yaGanZhi(bianInfo.下, bianInfo.上) : null;

    // 日干（六神）/ 月建·日辰（旺衰/旬空/月破）
    var dayGan = null, 月支 = null, 日支 = null, 日干支 = null;
    if (LUNAR && inp.y) {
      var p = LUNAR.fromSolar(inp.y, inp.m || 1, inp.d || 1, inp.h || 12);
      if (p && p.ganzhi) { dayGan = p.ganzhi.日.干; 月支 = p.ganzhi.月.支; 日支 = p.ganzhi.日.支; 日干支 = p.ganzhi.日.干支; }
    }

    // 六亲 / 六神 / 空破 逐爻
    var lines = [];
    var 空亡 = 日干支 ? xunKongOf(日干支) : [];
    for (var j = 0; j < 6; j++) {
      var g = gz[j];
      var zhi = g.charAt(1), zWx = Z_WX[zhi];
      var shen = dayGan ? shenOf(j, dayGan) : null;
      var qin = qinOf(zWx, info.宫五行);
      var flags = [];
      if (空亡.indexOf(zhi) >= 0) flags.push('空亡');
      if (月支 && zhi === ZHI[(zIdx(月支) + 6) % 12]) flags.push('月破'); // 月建冲
      if (日支 && zhi === ZHI[(zIdx(日支) + 6) % 12]) flags.push('日冲');
      lines.push({
        爻: j + 1, 阴阳: yao[j].yin ? '阴' : '阳', 动静: yao[j].bian ? (yao[j].yin ? '老阴(×→阳)' : '老阳(○→阴)') : '静',
        干支: g, 五行: zWx, 六亲: qin, 六神: shen, 世应: (info.世 === j + 1 ? '世' : (info.应 === j + 1 ? '应' : '')),
        标记: flags.join(' ')
      });
    }

    var 用神Key = inp.事 ? YONG[inp.事] : null;
    // v3.1.5：飞伏关系 + 基础断语
    var fh = flyingHidden(info, gz);
    var 断语 = judge(info, lines, 用神Key, fh, 动爻);

    return {
      本卦: benName, 变卦: bianName, 动爻: 动爻,
      宫: info.宫 + '宫(' + info.宫五行 + ')', 世: info.世, 应: info.应,
      上下卦: '下' + info.下 + ' 上' + info.上,
      本卦纳甲: gz, 变卦纳甲: bianGz,
      变卦宫: bianInfo ? (bianInfo.宫 + '宫(' + bianInfo.宫五行 + ')') : null,
      爻线: lines,
      伏飞神: fh,
      断语: 断语,
      用神: 用神Key ? (用神Key + '（依测事"' + inp.事 + '"）') : null,
      日干: dayGan, 月建: 月支, 日辰: 日支, 旬空: 空亡,
      缺料: (!inp.y ? '未给占卦日期，六神/旬空/月破/旺衰未定（仅装卦+飞伏）。可补"年/月/日"以定六神与旺衰。' : (dayGan ? '' : '日干未定'))
    };
  }

  return {
    cast: cast, tossToYao: tossToYao, qinOf: qinOf, shenOf: shenOf,
    // v3.1.5：飞伏 + 基础断语
    flyingHidden: flyingHidden, judge: judge, SHI_QIN: SHI_QIN, SHI_SHEN: SHI_SHEN,
    GUA_INDEX: GUA_INDEX, PALACES: PALACES, NAJIA: NAJIA, PALACE_WX: PALACE_WX, SHI_YING: SHI_YING,
    YONG: YONG, xunKongOf: xunKongOf
  };
});
