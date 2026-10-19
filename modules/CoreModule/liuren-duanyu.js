/**
 * modules/CoreModule/liuren-duanyu.js —— 大六壬「断语库」（单一真源 · 解课层）
 *
 * 干什么：registry「大六壬」功能块排盘极完整（四课/三传/九宗门/天将/空亡/驿马/细分），
 *   但**零断事断语**——排完课不知道主何吉凶。本库补：
 *   ① 九宗门发用断语 ② 课体格局断语 ③ 十二天将入课断语 ④ 三传吉凶 ⑤ 分类断事模板。
 *
 * 来源（多源核对）：《大六壬指南》（明·陈公献）、《六壬大全》（明·郭载騫）、《六壬心印赋》、
 *   《六壬探源》、《壬学琐记》——通行断法；古籍无逐条明文处按课体义理推演并标「推演」。
 * ⚠ 六壬断语须结合「日辰/用神/年命」综合，本库为**单点断语**，输出须标「单点参考」。
 *
 * 加载：UMD——require() 得 { FAYONG, KETI, TIANJIANG, CHUAN, DUANSHI, fayongOf, tianjiangOf,
 *       duanshiOf, lineChuan, count }；浏览器挂 NT.core.liurenDuanyu。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.liurenDuanyu = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  // ① 九宗门发用断语
  var FAYONG = {
    贼克: '贼克发用：上克下或下克上而取用，主事有由、非无端起，事体分明而可断。',
    比用: '比用发用：多克择其类同/最近者，主事有两歧、须择一而行，取正者为是。',
    涉害: '涉害发用：克多人同位则择受克深者，主事经反复权衡、迟而后定。',
    遥克: '遥克发用：日辰不克而遥克四课，主事在远方、间接而起，非眼前之事。',
    昴星: '昴星发用：无克无遥取昴星（酉上神），主事暗昧难明、宜静待其露。',
    别责: '别责发用：无克取干支同位之别责，主事有变例、另寻蹊径，非正途。',
    八专: '八专发用：干支同位无克，主事归一、内外不分，宜守正防混。',
    伏吟: '伏吟发用：天地盘同位、取刑冲为传，主事反复、迟滞不动，宜守待动。',
    返吟: '返吟发用：天地盘对冲、取相冲为传，主事往返、变迁不定，宜速断勿拖。'
  };

  // ② 课体格局断语
  var KETI = {
    元首: '元首课：一上克下、主从分明，事由尊长/上位主导，顺而可成。',
    重审: '重审课：多上克下、事经复议，宜再三审慎而后行。',
    知一: '知一课：择一比用、事当专一，宜从一路而入，不可两歧。',
    涉害深: '涉害深课：克害既多、事经周折，宜耐心历久方定。',
    蒿矢: '蒿矢课：遥克有力如箭发，主事自远而至、发而中的。',
    弹射: '弹射课：遥克无力如弹丸，主事似及而不及、劳而无功。',
    虎视: '虎视课：一上克下而威严，主有上司/长辈压事，宜顺受。',
    自任: '自任课：干支同位、事由自取，咎在一己，宜自省。',
    杜传: '杜传课：传不入于三传正路，主事被阻隔、不通，宜另开门。',
    连茹: '连茹课：三传相连如茹，主事连续相因、进退相继。',
    进退: '进退课：传有进退之神，主事可进可退、宜因时择之。',
    孤虚: '孤虚课：空亡孤虚之地，主事虚而不实、宜勿恃。'
  };

  // ③ 十二天将入课断语（简）
  var TIANJIANG = {
    贵人: '天乙贵人入课：主贵人扶助、逢凶化吉，宜求贵、托人。',
    螣蛇: '螣蛇入课：主虚惊怪异、缠绕反复，宜防惊疑、戒躁。',
    朱雀: '朱雀入课：主口舌文书、信息传言，宜谨言、防词讼。',
    六合: '六合入课：主和合婚姻、交易中介，宜谋合、结亲。',
    勾陈: '勾陈入课：主迟滞田土、牵绊阻隔，宜耐守、忌妄动。',
    青龙: '青龙入课：主财喜喜庆、生气通达，宜求财、谋吉。',
    天空: '天空入课：主虚诈不实、事多假象，宜察实、防欺。',
    白虎: '白虎入课：主凶险疾病、血光伤损，宜避危、慎出行。',
    太常: '太常入课：主衣食赐赏、平稳安常，宜守常、得禄。',
    玄武: '玄武入课：主盗贼暗昧、阴私欺诈，宜防盗、慎交。',
    太阴: '太阴入课：主阴私暗助、隐匿得庇，宜暗谋、静中求。',
    天后: '天后入课：主阴私女事、柔顺荫助，宜和柔、借女贵。'
  };

  // ④ 三传吉凶
  var CHUAN = {
    初: '初传主事之始：事情的开端、起因与最初动向。',
    中: '中传事之中：事情的发展、变化与中间过程。',
    末: '末传事之终：事情的结果、归宿与最终定局。'
  };

  // ⑤ 分类断事模板（8 类，每类给「看何 + 主何」）
  var DUANSHI = {
    求财: '求财看财爻（财星/财神）与青龙、太常：财爻生旺、见青龙太常主得；逢空亡玄武防虚脱。',
    官讼: '官讼看官鬼爻与朱雀、白虎：官鬼有气、见朱雀主词讼；见白虎主刑伤，宜和解。',
    疾病: '疾病看用神与白虎、螣蛇：用神病、见白虎主凶疾；螣蛇主惊怪之症，宜速医。',
    婚姻: '婚姻看六合与青龙：六合入课主婚合可成；见天空玄武主虚情诈婚。',
    行人: '行人看天马与传之进退：马动主将至；传退主迟归，宜待。',
    失物: '失物看玄武与空亡：玄武主盗、空亡主遗失不见，宜细察暗处。',
    兵占: '兵占看白虎与贵人：白虎主兵戈、贵人生扶主得胜，宜避其锐。',
    天时: '天时看玄武与父母爻：玄武主雨、父母主覆荫，晴雨可据此推。'
  };

  function strip(s) { return String(s == null ? '' : s).replace(/^[\s　]+|[\s　]+$/g, ''); }

  /** 九宗门发用断语（吃「伏吟·自任」这类复合名，取主门） */
  function fayongOf(name) {
    var n = strip(name);
    if (FAYONG[n]) return FAYONG[n];
    for (var k in FAYONG) if (n.indexOf(k) >= 0) return FAYONG[k];
    return null;
  }
  function tianjiangOf(name) { var n = strip(name); return TIANJIANG[n] || null; }
  function duanshiOf(topic) { var t = strip(topic); return DUANSHI[t] || null; }
  /** 三传一行：初/中/末 各配一句 */
  function lineChuan(role, gan) {
    var r = strip(role), g = strip(gan);
    return CHUAN[r] ? (g ? g + '（' + r + '）：' + CHUAN[r] : r + '：' + CHUAN[r]) : '';
  }

  return {
    FAYONG: FAYONG, KETI: KETI, TIANJIANG: TIANJIANG, CHUAN: CHUAN, DUANSHI: DUANSHI,
    fayongOf: fayongOf, tianjiangOf: tianjiangOf, duanshiOf: duanshiOf, lineChuan: lineChuan,
    count: { 九宗门: Object.keys(FAYONG).length, 课体: Object.keys(KETI).length, 天将: Object.keys(TIANJIANG).length, 分类: Object.keys(DUANSHI).length }
  };
});
