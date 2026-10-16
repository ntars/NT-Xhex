/**
 * modules/UIModule/export-image.js —— 「导出图片」共享实现【单一真源】
 *
 * 结果页「导出图片」按钮（设计稿：搜索结果页 24,726 153×48 描边 1pt）背后的能力，三端共用一份：
 *   · build(result, meta)  → 版式计划（纯数据：规则线 / 文本 / 二维码，含换行后的行数组）
 *   · paint(ctx, plan)     → 用标准 2D Canvas API 把计划画出来（PWA 与小程序 2d canvas API 同源）
 *   · wrap(ctx, text, max) → 中英混排换行（中文逐字断行，英文/数字按词断行）
 *
 * 壳只做各自平台的"取 canvas / 出文件"（见 public/pwa/app.js 与 dist/mp-weixin/pages/index/index.js），
 * 版式与绘制一律走本模块 —— 不在壳里各画一遍。
 *
 * 版式参考 NT-List（玄玖测试库）的导出卡形式，并套用本应用的「全黑白灰」语言（#6 例外：仅宜忌/五行彩色，
 * 导出图里不出现）：
 *   · 顶部一条 3px 暗色规则线（替代 NT-List 的彩色渐变条 —— 守黑白灰）
 *   · 品牌头「玄玖灵犀 NT-Xhex」+「演乾坤 · 知天命」
 *   · 正文：你的提问 + 答案（标题 / 导语 / 各 block）
 *   · 页脚：本地生成声明 + 版本 + 导出时间 + 右下角二维码（扫码开网页版，纯数据不联网）
 * 版式常量沿用设计稿 token（theme.css 同名变量）：边距 24 / 标题 22 / 卡内 17 / 正文 15 / 页脚 12。
 *
 * 二维码：用本地 qrcode-generator（modules/UIModule/qrcode.js，MIT，纯 JS、无 DOM 依赖，构建期内嵌）。
 *   浏览器经 <script> 挂全局 `qrcode`；小程序/Node 经 require 走 UMD 的 module.exports。
 *   全程离线（URL 是写死的数据，不发起任何网络请求）—— 符合「该软件禁止联网获取信息」。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NT = root.NT || {}; root.NT.exportImage = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  // —— 版式常量：白卡 + 黑白灰（导出图不出现任何彩色，守 #6 的例外色规则）——
  var T = {
    W: 402,             // 画面宽（= 设计稿画板宽，导出保持同一版心；壳按 dpr 放大成物理像素）
    PAD: 24,            // 页面左右留白 = --gutter
    INK: '#000000',     // 主文字
    INK_55: 'rgba(0,0,0,0.55)',  // 次级（提问文本）
    INK_40: 'rgba(0,0,0,0.4)',   // 正文段落
    INK_25: 'rgba(0,0,0,0.25)',  // 页脚小字 / 分隔线
    BG: '#ffffff',
    // 字号 / 行高（与设计稿 token 对齐）
    FS_BRAND: 20, LH_BRAND: 24,
    FS_NOTE: 12,  LH_NOTE: 18,
    FS_15: 15,    LH_15: 22,    // 长正文行高（与 theme.css --lh-long 一致）
    FS_H: 17,      LH_H: 22,
    FAMILY: 'sans-serif'
  };
  var GAP = 16;
  var FONT = function (w, s) { return w + ' ' + s + 'px ' + T.FAMILY; };

  // 二维码库的防御式取用（浏览器全局 / CommonJS 两种形态都要通）
  function qrLib() {
    if (typeof qrcode !== 'undefined') return qrcode;                 // PWA：<script> 挂全局
    try { return require('./qrcode.js'); } catch (e) { /* 未随包带走就降级 */ }
    return null;
  }

  /**
   * 中英混排换行：中文（含全角标点）逐字断行；连续的 ASCII 视作一个"词"整体断行；
   * '\n' 强制换行。返回行文本数组。
   */
  function wrap(ctx, text, maxWidth, weight, size) {
    ctx.font = FONT(weight, size);
    var out = [];
    (text == null ? '' : String(text)).split('\n').forEach(function (para) {
      if (para === '') { out.push(''); return; }
      var line = '';
      var units = para.match(/[A-Za-z0-9@._:/?#%+\-]+|[\s\S]/g) || [];
      units.forEach(function (u) {
        var next = line + u;
        if (line !== '' && ctx.measureText(next).width > maxWidth) { out.push(line.replace(/\s+$/, '')); line = u === ' ' ? '' : u; }
        else line = next;
      });
      out.push(line.replace(/\s+$/, ''));
    });
    return out;
  }

  // 导出时间（本地时区，"YYYY/M/D HH:mm"）—— 纯 Date，不联网
  function exportStamp() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '/' + p(d.getMonth() + 1) + '/' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /**
   * 生成版式计划（NT-List 形式：顶规则线 + 品牌头 + 提问/答案 + 页脚(声明/版本/时间/二维码)）。
   * @param {Object} result 结果对象：{ title, question, lead, blocks:[{label,text}] }
   * @param {Object} meta   文案：{ brand, slogan, en, version, questionLabel, notice, qrUrl }
   * @param {Object} ctx    一个可用的 2D 上下文（只用于 measureText，不落笔）
   */
  function build(result, meta, ctx) {
    result = result || {}; meta = meta || {};
    var items = [];
    var innerW = T.W - T.PAD * 2;
    var QR = 64;                       // 二维码边长（W=402 下的合适尺寸；NT-List 750 宽用 92，按版心等比收到 64）
    var FOOTER_H = 96;                // 页脚预留（声明/版本/时间 3 行 + 二维码 64）

    // ① 顶部 3px 暗色规则线（替代 NT-List 的彩色渐变条，守黑白灰）
    items.push({ t: 'rect', x: 0, y: 0, w: T.W, h: 3, fill: T.INK });

    var y = 40;
    // ② 品牌头（居中）：玄玖灵犀 NT-Xhex → 演乾坤 · 知天命
    items.push({ t: 'text', x: T.W / 2, y: y, text: (meta.brand || '玄玖灵犀') + (meta.en ? ' ' + meta.en : ''), size: T.FS_BRAND, lh: T.LH_BRAND, weight: 700, color: T.INK, align: 'center' });
    y += T.LH_BRAND + 4;
    items.push({ t: 'text', x: T.W / 2, y: y, text: meta.slogan || '', size: T.FS_NOTE, lh: T.LH_NOTE, weight: 400, color: T.INK_40, align: 'center' });
    y += T.LH_NOTE + 12;
    // ② 品牌与正文间的发丝线
    items.push({ t: 'line', x: T.PAD, y: y, x2: T.W - T.PAD, color: T.INK_25, width: 1 });
    y += 16;

    // ③ 正文（NT-List 左对齐：标签 + 文本；提问浅、答案略深）
    var heading = function (text, color, weight) {
      items.push({ t: 'text', x: T.PAD, y: y, text: text, size: T.FS_H, lh: T.LH_H, weight: weight || 600, color: color || T.INK, align: 'left' });
      y += T.LH_H + 6;
    };
    var paragraph = function (text, color, weight) {
      var lines = wrap(ctx, text, innerW, weight || 400, T.FS_15);
      lines.forEach(function (ln) {
        items.push({ t: 'text', x: T.PAD, y: y, text: ln, size: T.FS_15, lh: T.LH_15, weight: weight || 400, color: color, align: 'left' });
        y += T.LH_15;
      });
    };

    heading(meta.questionLabel || '你的提问', T.INK_55, 600);
    paragraph(result.question || '', T.INK_55, 400);

    if (result.lead) { y += GAP * 0.5; paragraph(result.lead, T.INK, 600); y += 6; }
    (result.blocks || []).forEach(function (b) {
      if (b.label) { y += GAP * 0.5; paragraph(b.label, T.INK_55, 600); }
      paragraph(b.text || '', T.INK_40, 400);
    });

    // ④ 页脚：分隔线 + 三行小字（左）+ 二维码（右）
    y += 20;
    items.push({ t: 'line', x: T.PAD, y: y, x2: T.W - T.PAD, color: T.INK_25, width: 1 });
    y += 22;
    (meta.noticeLines || [
      '本页仅本地生成 · 未经任何网络存储',
      (meta.brand || '玄玖灵犀') + (meta.version ? ' ' + meta.version : '')
    ]).forEach(function (ln, i) {
      items.push({ t: 'text', x: T.PAD, y: y, text: ln, size: T.FS_NOTE, lh: T.LH_NOTE, weight: 400, color: T.INK_25, align: 'left' });
      y += T.LH_NOTE;
    });
    items.push({ t: 'text', x: T.PAD, y: y, text: '导出时间 ' + exportStamp(), size: T.FS_NOTE, lh: T.LH_NOTE, weight: 400, color: T.INK_25, align: 'left' });
    y += T.LH_NOTE;

    // 二维码（右下角，与页脚小字并排；meta.qrUrl 为空则不画）
    if (meta.qrUrl) {
      items.push({ t: 'qr', x: T.W - T.PAD - QR, y: y - QR - FOOTER_H + 16, size: QR, url: meta.qrUrl, dark: T.INK, light: T.BG });
    }

    var totalH = y + T.PAD;
    return { width: T.W, height: Math.max(360, Math.round(totalH)), bg: T.BG, items: items };
  }

  /** 圆角矩形路径（Canvas 2D 原生 roundRect 在微信 2d canvas 上不保证可用，故手写） */
  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w - r, y + h, x + w, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  /** 画二维码：用本地 qrcode-generator 出矩阵，逐格落笔（全离线）。库缺失则画占位框，绝不崩导出。 */
  function drawQR(ctx, it) {
    var lib = qrLib();
    var s = it.size;
    if (!lib) {
      ctx.strokeStyle = it.dark; ctx.lineWidth = 1;
      ctx.strokeRect(it.x, it.y, s, s);
      return;
    }
    var q = lib(0, 'M');      // 类型 0 = 自动，纠错 M
    q.addData(it.url); q.make();
    var n = q.getModuleCount();
    var cell = Math.max(1, Math.floor(s / (n + 4)));   // +4 留边距（quiet zone，扫枪要留白）
    var box = n * cell;
    var offX = it.x + Math.floor((s - box) / 2), offY = it.y + Math.floor((s - box) / 2);
    ctx.fillStyle = it.light;
    ctx.fillRect(offX - 2, offY - 2, box + 4, box + 4);   // 白底（quiet zone）
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (q.isDark(r, c)) {
          ctx.fillStyle = it.dark;
          ctx.fillRect(offX + c * cell, offY + r * cell, cell, cell);
        }
      }
    }
  }

  /** 把计划画到 ctx 上（调用前请自行设好画布尺寸与 dpr 缩放） */
  function paint(ctx, plan) {
    ctx.fillStyle = plan.bg;
    ctx.fillRect(0, 0, plan.width, plan.height);
    plan.items.forEach(function (it) {
      if (it.t === 'rect') {
        if (it.fill) {
          ctx.fillStyle = it.fill;
          ctx.fillRect(it.x, it.y, it.w, it.h);
        } else {
          roundRectPath(ctx, it.x, it.y, it.w, it.h, it.r || 0);
          if (it.stroke) { ctx.strokeStyle = it.stroke; ctx.lineWidth = it.lineWidth || 1; ctx.stroke(); }
        }
      } else if (it.t === 'line') {
        ctx.strokeStyle = it.color || T.INK_25;
        ctx.lineWidth = it.width || 1;
        ctx.beginPath();
        ctx.moveTo(it.x, it.y);
        ctx.lineTo(it.x2, it.y);
        ctx.stroke();
      } else if (it.t === 'qr') {
        drawQR(ctx, it);
      } else if (it.t === 'text') {
        ctx.font = FONT(it.weight || 400, it.size);
        ctx.fillStyle = it.color;
        ctx.textAlign = it.align || 'left';
        ctx.textBaseline = 'alphabetic';
        // 行基线：把"行框"换算成基线位置（框底 - 下行留白 ≈ (lh - size) 的 1/4）
        ctx.fillText(it.text, it.x, it.y - (it.lh - it.size) * 0.25);
      }
    });
  }

  /**
   * 由 about（settings.js 的 about()，单一真源）装配 build() 的 meta 参数。
   * 三端「导出图片」都调这一份，不各自拼参数 —— 加/改页脚字段只改 settings.js + 这里，
   * 不会再出现「改了 PWA、漏了小程序」的漂移（v3.0.7 起 PWA 已走 about.exportMeta，
   * 小程序旧壳漏接，此函数把两端拉平）。
   */
  function optsFrom(about) {
    about = about || {};
    var em = about.exportMeta || {};
    return {
      brand: about.name,
      en: about.en,
      slogan: about.slogan,
      version: about.version,
      questionLabel: em.questionLabel || about.questionLabel,
      noticeLines: em.footLines || about.aboutFoot || [],
      qrUrl: em.qrUrl
    };
  }

  return { build: build, paint: paint, wrap: wrap, optsFrom: optsFrom, TOKENS: T };
});
