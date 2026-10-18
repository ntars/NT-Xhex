/**
 * modules/HomeModule/result-format.js —— 共享「结果排版」（平台无关，纯 JS）
 *
 * 作用：把分析引擎输出的**纯文本**加工成结构化段落（标题 / 标签 / 正文），
 * 供各壳（小程序 WXML / uni-app Vue / 浏览器 PWA DOM）用同一套规则渲染，
 * 避免每个壳各写一份解析逻辑而「改一处漏一处」。
 *
 * 不做聊天区：一问一答，结果独立成页展示，可返回。
 *
 * 加载：UMD —— 小程序被 require；浏览器挂全局 NT.resultFormat。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NT = root.NT || {}; root.NT.resultFormat = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  /**
   * 把引擎文本加工成结构化结果
   * @param {string} text 引擎输出的纯文本
   * @returns {{title:string, lead:string, blocks:Array<{label:string,text:string}>}}
   *   title  首行【…】里的标题（无则为空串）
   *   lead   标题后的首句导语（无则为空串）
   *   blocks 段落数组；label 为段内「标签：」前缀（无则为空串）
   */
  function format(text) {
    var raw = (text || '').replace(/\r/g, '').trim();
    var title = '', lead = '';

    // 1) 提取【标题】
    var tm = raw.match(/^【([^】]+)】\s*/);
    if (tm) {
      title = tm[1];
      raw = raw.slice(tm[0].length);
    }

    // 2) 标点归一：一律按「句号 / 换行」断段，行内分号与冗余标点先降级
    //    为什么：切段用 [。\n]，而不少内核在**行内**用「；」分隔并列项（如「甲 10 乙 8；丙 6 丁 4」），
    //    原样切会把一句话从中间劈开；另有一种写法是「子项自带句尾『。』+ 外层用『；』拼接」，
    //    会产出「。；」这种双标点。两者都在**渲染层一处兜底**，不为 28 个功能块逐个改文案。
    //    行首的分号式分节不受影响（本正则只替换「前一字符不是标点」的行内分号）。
    var normalized = raw
      .replace(/[；;]+(?=[。\n])/g, '，')      // 分号紧跟句号/换行 → 逗号（消「。；」）
      .replace(/[。]{2,}/g, '。')                 // 连续句号压成一个
      .split('\n')
      .map(function (line) { return line.replace(/([^\n：:；;。!！?？])；(?=[^；;])/g, '$1，'); })
      .join('\n');

    // 3) 按句号/换行切段（保留语义完整），过滤空段
    var segs = normalized
      .split(/[。\n]+/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });

    // 4) 首句作为导语，其余进 blocks
    if (segs.length) {
      lead = segs.shift();
    }

    // 5) 识别「标签：内容」形式（2-6 字中文标签 + 冒号），作为小节标签
    var blocks = segs.map(function (s) {
      var lm = s.match(/^([\u4e00-\u9fa5]{2,6})[：:]\s*(.+)$/);
      if (lm) return { label: lm[1], text: lm[2] };
      return { label: '', text: s };
    });

    return { title: title, lead: lead, blocks: blocks };
  }

  return { format: format };
});
