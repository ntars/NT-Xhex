/**
 * modules/CoreModule/taiyi-duanyu.js —— 太乙神数「断语库」（单一真源 · 解局层）
 *
 * 干什么：registry「太乙神数」功能块排盘确定性输出（积年/入局/元阴阳遁/十六神/文昌/计神/始击），
 *   落宫与主客算已标【待黄金盘验证】。本库补「解」层：
 *   ① 主客算断语 ② 太乙格局（掩/迫/关/囚/击/格/对）③ 十六神象意 ④ 阳九百六。
 *
 * 来源（多源核对）：《太乙金镜式经》（唐·王希明）、《太乙统宗宝鉴》（明·万民英）、《太乙紫庭》；
 *   通行断法。古籍无逐条明文处按式义推演并标「推演」。
 * ⚠ 太乙流派公式分歧大（尤其「每几年移一宫」3年/9年异说、主客算），本库为**单点断语**，
 *   输出须标「单点参考，流派分歧未锁」。
 *
 * 加载：UMD——require() 得 { ZHUKE, GEJU, SHEN, YANGJIU, zhuKeOf, gejuOf, shenOf, yangjiuOf, count }。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.taiyiDuanyu = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  // ① 主客算断语（主算/客算的多寡、长短、和）
  var ZHUKE = {
    主算多: '主算多——主方势盛，宜主不宜客，先发制人。',
    客算多: '客算多——客方势盛，宜客不宜主，后发制人。',
    主客和: '主客算和——两势相埒，宜静观待变、勿轻举。',
    算长: '算数长——事有延绵，宜从长计议、不可急求。',
    算短: '算数短——事在旦夕，宜速决、迟则生变。',
    算不和: '算数不和——内外相违，宜调和避争、防内耗。'
  };

  // ② 太乙格局（掩/迫/关/囚/击/格/对）
  var GEJU = {
    掩: '掩——太乙之宫被掩，主事被遮蔽，宜审情、防暗算。',
    迫: '迫——太乙被迫，主事受逼迫，宜避其锋、缓图之。',
    关: '关——太乙当关，主事有关碍，宜疏通、寻径而过。',
    囚: '囚——太乙被囚，主事受困，宜守正待时、不可强动。',
    击: '击——太乙被击，主有冲击，宜防不测、慎应战。',
    格: '格——太乙被格，主事相格，宜和解、化争为和。',
    对: '对——太乙相对，主两势对垒，宜权衡取舍、各守其分。'
  };

  // ③ 太乙十六神象意（简）
  var SHEN = {
    天神: '主天时、上位、尊神，宜顺天时。',
    地神: '主地利、土田、安固，宜因地利。',
    阴德: '主阴德庇佑，宜行善积德。',
    阳德: '主阳德昭明，宜正大光明。',
    大炅: '主大明光大，宜显扬作为。',
    大武: '主威武肃杀，宜用刚、忌躁。',
    民神: '主民生众庶，宜恤众安民。',
    主计: '主计度谋算，宜先谋后动。',
    主客: '主主客之分，宜审己量彼。',
    游都: '主巡游变动，宜因势而转。',
    天乙: '主贵人天佑，宜托贵求成。',
    太乙: '主太乙正位，宜执中守正。',
    文昌: '主文星贵显，宜文途、文书。',
    始击: '主始击之动，宜防突发、慎初动。',
    计神: '主计度推算，宜精算慎计。',
    五将: '主五将分司，宜各当其任。'
  };

  // ④ 阳九百六之灾
  var YANGJIU = {
    阳九: '阳九之灾——天旱饥馑之应，宜备粮储、谨守度。',
    百六: '百六之灾——地动兵戈之应，宜避争战、安分守常。'
  };

  function strip(s) { return String(s == null ? '' : s).replace(/^[\s　]+|[\s　]+$/g, ''); }
  function zhuKeOf(k) { var n = strip(k); return ZHUKE[n] || null; }
  function gejuOf(k) { var n = strip(k); return GEJU[n] || null; }
  function shenOf(k) { var n = strip(k); return SHEN[n] || null; }
  function yangjiuOf(k) { var n = strip(k); return YANGJIU[n] || null; }

  return {
    ZHUKE: ZHUKE, GEJU: GEJU, SHEN: SHEN, YANGJIU: YANGJIU,
    zhuKeOf: zhuKeOf, gejuOf: gejuOf, shenOf: shenOf, yangjiuOf: yangjiuOf,
    count: { 主客算: Object.keys(ZHUKE).length, 格局: Object.keys(GEJU).length, 十六神: Object.keys(SHEN).length, 阳九百六: Object.keys(YANGJIU).length }
  };
});
