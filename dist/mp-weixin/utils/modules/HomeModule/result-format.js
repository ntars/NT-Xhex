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
   * 三种返回形态：
   *   · 单算法（默认）：{title, lead, blocks} —— 与原行为完全一致
   *   · 多算法并列（old）：{multi:true, sections:[{title, lead, blocks}], title, lead, blocks}
   *     每个【标题】一小节，各节内部仍按「首句 lead + 段落 blocks」排版，由壳层循环渲染；
   *   · 全套排盘（new，groups）：{multi:true, grouped:true, groups:[{名, blocks:[{短名, title, lead, blocks}], 项数}], ...}
   *     八大类分组来自 analyzer.lastSections()，由调用方传入；渲染层按「类 → 块」两级循环。
   *     这是用户要求的展示口径：万年历黄历 / 八字命理 / 紫微斗数 / 六爻占卜 /
   *     奇门遁甲 / 梅花易数 / 风水堪舆 / 解梦，顺序不可调换。
   *
   * @param {string} text 引擎输出的纯文本
   * @param {boolean} [multi] 是否按【标题】切小节（多命中 / 全套排盘场景由调用方置 true）
   * @param {Array}  [sections] analyzer.lastSections() 的八大类分组（全套排盘时传，否则省略）
   * @returns {object} 结构化结果
   */
  function format(text, multi, sections) {
    if (multi) {
      // —— 全套排盘：按八大类分组 ——
      // ⚠️ 不能直接用 splitSections()：块**内部**也自带【】小标题
      //    （huangli 的【宜】【忌】【神煞断语·建除】、name-shuzi 的【三宫】【十神】…），
      //    那些不是小节边界，按【】一刀切会把块剁碎并错归到「其他」类。
      //
      // 块边界怎么认：full-chart.js 的 retitle() 把每个块的标题统一写成
      //    「大类 · 短名」（如「万年历黄历 · 查黄历」），中间的「 · 」是块标题的专属特征，
      //    块内部的【】小标题不含它。故按「标题里含 · 且两侧都是中文」判定块边界。
      //    → 恢复路径（刷新/重进）也能只凭文本重建分组，不必把 sections 存进本地存储。
      //
      // 顺序怎么定：sections 传了就按 sections 的顺序（用户规定顺序的权威来源）；
      //    没传（恢复路径）则按**首次出现顺序** —— full-chart 本就是按用户顺序输出的，
      //    所以文本里的出现顺序天然等于规定顺序。
      var doGroup = false, known = {};
      if (sections && sections.length) {
        doGroup = true;
        sections.forEach(function (sec) {
          sec.blocks.forEach(function (blk) { known[sec.名 + ' · ' + blk.短名] = 1; });
        });
      } else {
        // 无 sections：探测文本里是否存在「A · B」式块标题
        var probe = (text || '').split('\n');
        for (var pi = 0; pi < probe.length; pi++) {
          // ⚠️ 必须是「中点两侧都有空白」才算全套排盘的块标题（`【类名 · 短名】`）。
          //   不能写成 `\s*·\s*`：块自带的紧凑标题如【择日·黄道吉日】【神煞断语·建除】
          //   中点两侧无空格，放宽了会被误判成全套排盘，单跑一个择日就多出一个「择日」类。
          var pm = probe[pi].match(/^\s*【[^】]*?\s+·\s+[^】]+】/);
          if (pm) { doGroup = true; break; }
        }
      }
      if (doGroup) {
        // 全套排盘末尾的「需补充信息」提示行是一条**类外尾巴**（full-chart 拼在最后的说明，
        // 不是任何一个算法块），单独摘成 note 交给渲染层放在最末，不参与八大类归组 ——
        // 否则它会被切成第 8 个「其他」类，看着像多了一个算法类别。
        var tailNote = '';
        var isBlockHead = function (title) {
          if (known[title]) return true;
          // 无 sections 时的形态判定：full-chart.retitle() 生成的是「类名 + 空格 + · + 空格 + 短名」，
          // 而块内部的小标题写法是紧凑的（如【神煞断语·建除】【神煞断语·值神】，中点两侧无空格）。
          // 故要求**中点两侧必须有空格**才能判为块边界 —— 这一个空格就是块与外层小标题的分水岭。
          if (sections && sections.length) return false;
          var m = String(title || '').match(/^([^·]+?)\s+·\s+(.+)$/);
          if (!m) return false;
          return /[\u4e00-\u9fa5]/.test(m[1]) && /[\u4e00-\u9fa5]/.test(m[2]);
        };
        var rawTxt = (text || '').replace(/\r/g, '');
        var chunks = [];      // [{title, body}]
        var curChunk = null;
        rawTxt.split('\n').forEach(function (line) {
          var hm = line.match(/^\s*【([^】]+)】\s*(.*)$/);
          if (hm && String(hm[1]).indexOf('需补充信息') === 0) {
            tailNote = (hm[2] || '').trim();
            return;
          }
          if (hm && isBlockHead(hm[1])) {
            curChunk = { title: hm[1], body: hm[2] ? [hm[2]] : [] };
            chunks.push(curChunk);
          } else if (curChunk) {
            curChunk.body.push(line);
          } else if (line.trim()) {
            // 第一个块标题出现前的散行（缺料提示等）：先拢到一个无标题块，最后并入「其他」
            curChunk = { title: '', body: [line] };
            chunks.push(curChunk);
          }
        });
        var parsed = chunks.map(function (c) {
          var inner = format(c.body.join('\n'));
          inner.title = c.title || inner.title;
          return inner;
        });
        // 归组：有 sections 按声明顺序；否则按首次出现顺序
        var rest = parsed.slice();
        var groups = [];
        // ⚠️ 分组对象的键**必须全是 ASCII**（name / short / count / blocks）。
        //   踩过的坑：当初写成 { 名, 简称, 项数, blocks }，模板里 `{{item.名}}` 让微信
        //   开发者工具直接编译失败 ——「Bad value with message: unexpected `\ufffd` at pos5」，
        //   因为 WXML 表达式解析器不认中文属性名（`名` 的 UTF-8 三字节首个字节被判非法），
        //   uni-app 的 vue 模板最终也编译成 wxml，同样的坑。全站模板一律只用 ASCII 键。
        var pushBlock = function (groupName, groupShort, item) {
          for (var gi = 0; gi < groups.length; gi++) {
            if (groups[gi].name === groupName) {
              groups[gi].blocks.push(item); groups[gi].count = groups[gi].blocks.length; return;
            }
          }
          groups.push({ name: groupName, short: groupShort, count: 1, blocks: [item] });
        };
        if (sections && sections.length) {
          sections.forEach(function (sec) {
            sec.blocks.forEach(function (blk) {
              var want = sec.名 + ' · ' + blk.短名;
              for (var i = 0; i < rest.length; i++) {
                if (rest[i].title === want) { pushBlock(sec.名, sec.简称, rest[i]); rest.splice(i, 1); break; }
              }
            });
          });
        } else {
          rest.forEach(function (item) {
            var m = String(item.title || '').match(/^([^·]+?)\s*·\s*(.+)$/);
            if (m) pushBlock(m[1].trim(), m[1].trim(), item);
            else pushBlock('其他', '其他', item);
          });
          rest.length = 0;
        }
        // 兜底：没归进任何类的散节（理论上不会发生，防止内容丢失）
        if (rest.length) {
          rest.forEach(function (item) { pushBlock('其他', '其他', item); });
        }
        if (groups.length) {
          var flat2 = [];
          groups.forEach(function (g) {
            g.blocks.forEach(function (s, i) {
              if (i === 0) flat2.push({ label: '', text: '【' + g.name + '】' });
              flat2.push({ label: '', text: '【' + s.title + '】' });
              if (s.lead) flat2.push({ label: '', text: s.lead });
              (s.blocks || []).forEach(function (b) { flat2.push(b); });
            });
          });
          // tailNote 也要进摊平视图（导出图片吃 flat，不能丢这句）；渲染层单独放最末
          if (tailNote) flat2.push({ label: '', text: '【需补充信息】' + tailNote });
          return {
            multi: true, grouped: true, groups: groups,
            note: tailNote,
            title: groups[0].blocks[0].title || '',
            lead: groups[0].blocks[0].lead || '',
            blocks: flat2
          };
        }
      }
      // —— 普通多命中：按【标题】平铺切小节 ——
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
