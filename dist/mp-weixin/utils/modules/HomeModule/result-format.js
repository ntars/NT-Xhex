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
   * 把引擎文本按「【标题】」切成若干算法小节
   *
   * 为什么需要它：一次提问命中多个功能块时（如「… 奇门 六爻」），analyzer 的输出是
   * 各算法文本用换行直接拼接，每段自带一个【标题】。原 format() 只认第一个标题，
   * 第二个会被当普通段落吞进第一个算法的正文里。设计稿要求「结果页文本范围内
   * 可显示多个算法」，因此在渲染前先按标题边界切段，每段各自 format。
   *
   * ⚠️ 单算法输出的内核自身也可能带多个【】行（如 huangli 有 16 个【】行、
   *    name-shuzi 有 13 个）。那些行**不是**小节标题，若按此函数切会把一个算法
   *    剁碎。因此本函数只在 analyzer 的**多命中**场景启用（见 format 的 multi 分支），
   *    由调用方决定是否使用，单算法输出一律走原路径。
   *
   * @param {string} text 引擎输出的纯文本
   * @returns {Array<{title:string, body:string}>} 按【标题】切出的小节（至少 1 段）
   */
  function splitSections(text) {
    var raw = (text || '').replace(/\r/g, '');
    var lines = raw.split('\n');
    var sections = [];
    var cur = null;
    lines.forEach(function (line) {
      var hm = line.match(/^\s*【([^】]+)】\s*(.*)$/);
      if (hm) {
        // 新标题 → 开新段（标题行自身的内容也并入 body）
        cur = { title: hm[1], body: hm[2] ? [hm[2]] : [] };
        sections.push(cur);
      } else if (cur) {
        cur.body.push(line);
      } else {
        // 第一个标题出现之前的散行（如追问提示、引导语）：归入无标题段
        cur = { title: '', body: [line] };
        sections.push(cur);
      }
    });
    if (!sections.length) sections.push({ title: '', body: [''] });
    // 段内空行由各段自己的 format 负责过滤，这里只把行拼回去
    return sections.map(function (s) {
      return { title: s.title, body: s.body.join('\n') };
    });
  }

  /**
   * 把引擎文本加工成结构化结果
   *
   * 两种返回形态：
   *   · 单算法（默认）：{title, lead, blocks} —— 与原行为完全一致
   *   · 多算法并列：{multi:true, sections:[{title, lead, blocks}], title, lead, blocks}
   *     每个【标题】一小节，各节内部仍按「首句 lead + 段落 blocks」排版，由壳层循环渲染；
   *     末尾三个字段是 sections 的**摊平视图**，专供 export-image.js 的 build() 使用
   *     （它只吃单流 {title, lead, blocks}），渲染层只读 multi/sections。
   *
   * @param {string} text 引擎输出的纯文本
   * @param {boolean} [multi] 是否按【标题】切小节（多命中场景由调用方置 true）
   * @returns {object} 结构化结果
   */
  function format(text, multi) {
    if (multi) {
      var secs = splitSections(text).map(function (s) {
        var inner = format(s.body);
        inner.title = s.title || inner.title;
        return inner;
      });
      // 全部小节都既无标题又无内容 → 退回单算法形态，避免壳层渲染出空壳
      var hasAny = secs.some(function (s) { return s.title || s.lead || (s.blocks && s.blocks.length); });
      if (secs.length > 1 && hasAny) {
        // 摊平视图：节标题以独立段落插入，保持「先小节标题、后该节正文」的阅读顺序
        var flat = [];
        secs.forEach(function (s, i) {
          if (i > 0 && s.title) flat.push({ label: '', text: '【' + s.title + '】' });
          if (i > 0 && s.lead) flat.push({ label: '', text: s.lead });
          (s.blocks || []).forEach(function (b) { flat.push(b); });
        });
        var head = secs[0];
        return { multi: true, sections: secs, title: head.title, lead: head.lead, blocks: flat };
      }
    }
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

  return { format: format, splitSections: splitSections };
});
