/**
 * modules/CoreModule/synastry-duanyu.js —— 双人合盘（Synastry）解读库 · 单一真源
 *
 * 口径说明：
 *   · 合盘属**西方通行占星学**（无单一古籍真源），断语标「通行」，输出侧明说
 *     「自我认知工具，不作命运定论」——与项目「以准为第一」并列的诚实线。
 *   · 结构：PAIR21 = 21 对行星组合的**互动主题**（无序对）；ASPECT_NATURE = 相位性质修饰。
 *     实际断语 = 行星对主题 + 相位性质（软相显和谐面、硬相显张力面），由调用方组合。
 *   · 行星只用 7 实际行星（日月光金木水火土）；罗计孛归七政侧，不混入占星合盘。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.synastryDuanyu = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  // 21 对行星组合的互动主题（无序对：键按「日月水金火木土」顺序两两组合）
  var PAIR21 = {
    '太阳-月亮': '核心自我与情感需求的呼应：彼此是否「给得了对方想要的身份与安全感」。',
    '太阳-水星': '心智与自我表达的互动：聊得来、思路互相激发或话不投机。',
    '太阳-金星': '欣赏与喜欢的流动：审美、价值观与情感示意的投合度。',
    '太阳-火星': '意志与行动的碰撞：互相激励进取，也易争强摩擦。',
    '太阳-木星': '格局与信念的共鸣：彼此拓展视野、带好运与成长。',
    '太阳-土星': '责任与结构的互动：一方教另一方成熟，也易感压抑或审视。',
    '月亮-水星': '情绪与思维的对话：能否顺畅谈感受、互相理解心事。',
    '月亮-金星': '情感与柔情的和鸣：相处舒服度、彼此疼惜的程度。',
    '月亮-火星': '情绪与行动的摩擦：关心则乱，也易急躁伤情。',
    '月亮-木星': '情感与胸怀的包容：彼此滋养、乐观共处。',
    '月亮-土星': '情感与责任的拉扯：渴望亲近又怕受伤，需时间建立信任。',
    '水星-金星': '言语与好感的配合：谈情说爱的方式是否对频。',
    '水星-火星': '思维与行动的速度：争论激烈、也互相点燃干劲。',
    '水星-木星': '智慧与格局的交流：爱聊大事、互相启发。',
    '水星-土星': '务实与谨慎的沟通：一起规划正事，也易把天聊「严肃」。',
    '金星-火星': '吸引与欲望的张力：化学反应强弱，浪漫与激情指数。',
    '金星-木星': '和乐与慷慨的叠加：相处愉悦、互相大方成全。',
    '金星-土星': '爱与承诺的考验：认真对待关系，也易拘谨或怕受伤。',
    '火星-木星': '行动与信念的合伙：一起打拼扩张，也易过度冒险。',
    '火星-土星': '冲劲与规矩的摩擦：一方催一方拦，需磨合节奏。',
    '木星-土星': '乐观与现实的平衡：一个做梦一个筑基，互补也常拉扯。'
  };

  // 相位性质修饰（与 astro.js ASPECTS 对齐：合/六合/刑/拱/冲 为主相位）
  var ASPECT_NATURE = {
    合: '融合（软相向）：两人此领域高度重叠，不分彼此。',
    六合: '机会（软相向）：相处有空间与助力，宜共谋。',
    拱: '顺畅（软相向）：天赋般的默契，合作省力。',
    刑: '张力（硬相向）：摩擦出课题，磨合即成长。',
    冲: '对立（硬相向）：两极吸引，需学会差异共处。'
  };

  /** 查「行星对」互动主题（无序：pairOf('太阳','月亮') === pairOf('月亮','太阳')） */
  function pairOf(a, b) {
    var x = String(a || '').replace(/^[\s　]+|[\s　]+$/g, '');
    var y = String(b || '').replace(/^[\s　]+|[\s　]+$/g, '');
    var k = [x, y].sort().join('-');
    if (PAIR21[k]) return PAIR21[k];
    // 月亮异名兼容
    var AL = { 月亮: '太阴', 月: '太阴' };
    var k2 = [AL[x] || x, AL[y] || y].sort().join('-');
    return PAIR21[k2] || null;
  }
  /** 查相位性质修饰 */
  function aspectNatureOf(aspectType) {
    return ASPECT_NATURE[String(aspectType || '').replace(/^[\s　]+|[\s　]+$/g, '')] || null;
  }
  /** 组合一条合盘断语：A 星 与 B 星 成 相位 */
  function lineOf(a, b, aspectType) {
    var p = pairOf(a, b), n = aspectNatureOf(aspectType);
    if (!p) return null;
    return String(a) + '与' + String(b) + '成' + String(aspectType) + '：' + p
      + (n ? ' ' + n : '');
  }

  return {
    PAIR21: PAIR21, ASPECT_NATURE: ASPECT_NATURE,
    pairOf: pairOf, aspectNatureOf: aspectNatureOf, lineOf: lineOf,
    count: { 行星对: Object.keys(PAIR21).length, 相位性质: Object.keys(ASPECT_NATURE).length }
  };
});
