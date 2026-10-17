/**
 * modules/ExportModule/export-image.js —— 「导出图片」共享实现【单一真源】
 *
 * 独立模块：与 UIModule（视觉规范）分开，导出图片自成一体（版式 + 绘制 + 二维码），
 * 一个模块出问题不连累其余；专属依赖 qrcode.js 同在本目录（唯一消费者就是本文件）。
 *
 * 结果页「导出图片」按钮背后的能力，三端共用一份：
 *   · build(result, meta, ctx) → 版式计划（纯数据：线条 / 文本 / 二维码，含换行后的行数组）
 *   · paint(ctx, plan)         → 用标准 2D Canvas API 把计划画出来（PWA 与小程序 2d canvas API 同源）
 *   · wrap(ctx, text, max, w, s) → 中英混排换行（中文逐字断行，英文/数字按词断行）
 *   · optsFrom(about)          → 由 settings.js 的 about() 装配 meta（三端同一份）
 *
 * 壳只做各自平台的"取 canvas / 出文件"（public/pwa/app.js、dist/mp-weixin/pages/index/index.js、
 * HomeModule/result.vue），版式与绘制一律走本模块 —— 不在壳里各画一遍。
 *
 * 版式（v3.1.1，严格照设计稿「导出图片格式」画板 · 坐标相对 402pt 宽画板，可变高度长图）：
 *   · 品牌头两行，**右对齐**（右缘 = 402−24 = 378）：玄玖灵犀 NT-Xhex 22/26 黑100% → 演乾坤·知天命 14/17 黑50%
 *   · **路径1**：1px 黑实线（全宽 − 左右各 24）；其上距品牌头、下距文本区**均为 18px**
 *   · **文本区**（设计稿的浅灰「文本范围」是标注框，**不绘制**；真正画的是两条黑线夹住的区）：
 *       「推演信息：」18/21 黑100% → 用户输入 14/17 黑70%
 *       「玄玖灵犀推演结果：」18/21 黑100% → 正文分块（label 14/17 黑100% + 正文 14/17 黑70%）
 *   · **路径2**：1px 黑实线（同上）；其上距文本区、下距页脚**均为 18px**
 *   · **页脚**（左对齐 12/14 黑50%，4 行）+ **右下角两个 64×64 码并排**（网页二维码 + 小程序码：
 *       网页二维码 x=250、小程序码 x=314，右缘 378，与左边距对称）
 *
 * 全矢量、不用 PNG：两个码都由 Canvas 逐格/逐图元绘制。
 *   · 网页二维码：本地 qrcode-generator（qrcode.js，MIT，纯 JS、无 DOM 依赖，构建期内嵌）出矩阵，逐格落笔；
 *     浏览器经 <script> 挂全局 `qrcode`，小程序/Node 经 require 走 UMD 的 module.exports。**可扫，指向网页版**。
 *   · 小程序码：全离线、appid 未配置，无法生成可扫真码 → 画「圆角方框 + N·T 品牌字标 + 小程序」矢量占位。
 *     日后 settings.js 的 exportMeta.miniQrUrl 填了可扫入口 URL，本文件自动改画成真实二维码。
 *   全程离线（URL 是写死的数据，不发起任何网络请求）—— 符合「该软件禁止联网获取信息」。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NT = root.NT || {}; root.NT.exportImage = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  // —— 版式常量：白卡 + 黑白灰（导出图不出现任何彩色，守「全黑白灰」色规则）——
  // 数值全部取自设计稿「导出图片格式」画板实测值。
  var T = {
    W: 402,             // 画面宽（= 设计稿画板宽，导出保持同一版心；壳按 dpr 放大成物理像素）
    PAD: 24,            // 页面左右留白 = --gutter
    LINE_W: 1,          // 两条分隔线线宽（设计稿 354×1）
    GAP: 18,            // 「文本区离上下两条线」的间距（设计稿实测，固定 18px）
    QUIET: 16,          // 品牌头到页首、页脚到页尾的呼吸（非设计稿固定值，取 16 的节奏）
    INK: '#000000',     // 主文字 / 线（黑 100%）
    INK_70: 'rgba(0,0,0,0.7)',   // 正文段落 / 用户输入（设计稿 黑 70%）
    INK_50: 'rgba(0,0,0,0.5)',   // 品牌副标 / 页脚（设计稿 黑 50%）
    BG: '#ffffff',
    // 字号 / 行高（设计稿「导出图片格式」实测：22/26、18/21、14/17、12/14）
    FS_BRAND: 22, LH_BRAND: 26,   // 玄玖灵犀 NT-Xhex（黑 100%）
    FS_SUB: 14,   LH_SUB: 17,     // 品牌副标「演乾坤 · 知天命」（黑 50%）
    FS_H: 18,     LH_H: 21,       // 区标题「推演信息：」「玄玖灵犀推演结果：」（黑 100%）
    FS_BODY: 14,  LH_BODY: 17,    // 正文 / 用户输入（黑 70% / 100%）
    FS_NOTE: 12,  LH_NOTE: 14,    // 页脚 4 行（黑 50%）
    FAMILY: 'sans-serif'
  };
  var FONT = function (w, s) { return w + ' ' + s + 'px ' + T.FAMILY; };

  // 码：两个 64×64，横排；网页二维码在左、小程序码在右，右缘对齐右边距。
  var CODE = 64;
  // 右缘 = W − PAD = 378；小程序码 x = 378−64 = 314；网页二维码 x = 314−64 = 250
  var CODE_X_MINI = T.W - T.PAD - CODE;
  var CODE_X_WEB = CODE_X_MINI - CODE;

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
   * 生成版式计划（严格照设计稿「导出图片格式」）。
   * @param {Object} result 结果对象：{ title, question, lead, blocks:[{label,text}] }
   * @param {Object} meta   文案：{ brand, en, slogan, infoLabel, resultLabel, footLines, miniCodeLabel, qrUrl, miniQrUrl }
   * @param {Object} ctx    一个可用的 2D 上下文（只用于 measureText，不落笔）
   */
  function build(result, meta, ctx) {
    result = result || {}; meta = meta || {};
    var items = [];
    var innerW = T.W - T.PAD * 2;
    var rightEdge = T.W - T.PAD;

    // 右对齐文本（品牌头），返回新的 y
    var textRight = function (text, y, size, lh, weight, color) {
      items.push({ t: 'text', x: rightEdge, y: y, text: text, size: size, lh: lh, weight: weight, color: color, align: 'right' });
      return y + lh;
    };
    // 左对齐正文块（可多行），返回新的 y
    var para = function (text, y, color, weight) {
      var lines = wrap(ctx, text, innerW, weight || 400, T.FS_BODY);
      lines.forEach(function (ln) {
        items.push({ t: 'text', x: T.PAD, y: y, text: ln, size: T.FS_BODY, lh: T.LH_BODY, weight: weight || 400, color: color, align: 'left' });
        y += T.LH_BODY;
      });
      return y;
    };
    // 区标题：18/21 黑 100%
    var heading = function (text, y) {
      items.push({ t: 'text', x: T.PAD, y: y, text: text, size: T.FS_H, lh: T.LH_H, weight: 400, color: T.INK, align: 'left' });
      return y + T.LH_H;
    };
    var line = function (y) {
      items.push({ t: 'line', x: T.PAD, y: y, x2: rightEdge, color: T.INK, width: T.LINE_W });
    };

    // ① 品牌头（右对齐两行）
    var y = T.QUIET;
    y = textRight((meta.brand || '玄玖灵犀') + (meta.en ? ' ' + meta.en : ''), y, T.FS_BRAND, T.LH_BRAND, 700, T.INK);
    y = textRight(meta.slogan || '', y, T.FS_SUB, T.LH_SUB, 400, T.INK_50);

    // ② 品牌头 → 18px → 路径1
    y += T.GAP;
    line(y);
    y += T.GAP;   // 路径1 → 18px → 文本区

    // ③ 文本区：推演信息（区标题 + 用户输入）+ 玄玖灵犀推演结果（区标题 + 正文分块）
    y = heading(meta.infoLabel || '推演信息：', y);
    y = para(result.question || '', y, T.INK_70, 400);

    y += T.GAP;   // 两段之间留一档间距（与 18 节奏一致）
    y = heading(meta.resultLabel || '玄玖灵犀推演结果：', y);
    if (result.lead) { y = para(result.lead, y, T.INK, 400); }
    (result.blocks || []).forEach(function (b) {
      if (b.label) { y = para(b.label, y, T.INK, 400); }
      y = para(b.text || '', y, T.INK_70, 400);
    });

    // ④ 文本区 → 18px → 路径2
    y += T.GAP;
    line(y);
    var footerTop = y + T.GAP;   // 路径2 → 18px → 页脚

    // ⑤ 页脚 4 行（左） + 两个码（右下）并排
    var footLines = (meta.footLines && meta.footLines.length ? meta.footLines : [
      '仅本地生成 · 未经任何上传与存储',
      '小程序：玄玖灵犀（公众号同名）',
      '网页版：https://yi.ntars.cn/'
    ]);
    var fy = footerTop;
    footLines.forEach(function (ln) {
      items.push({ t: 'text', x: T.PAD, y: fy, text: ln, size: T.FS_NOTE, lh: T.LH_NOTE, weight: 400, color: T.INK_50, align: 'left' });
      fy += T.LH_NOTE;
    });
    items.push({ t: 'text', x: T.PAD, y: fy, text: '导出时间：' + exportStamp(), size: T.FS_NOTE, lh: T.LH_NOTE, weight: 400, color: T.INK_50, align: 'left' });
    var footTextBottom = fy + T.LH_NOTE;

    // 码的纵向：与页脚同顶对齐（footerTop），64 高
    if (meta.qrUrl) {
      items.push({ t: 'qr', x: CODE_X_WEB, y: footerTop, size: CODE, url: meta.qrUrl, dark: T.INK, light: T.BG });
    }
    // 小程序码：有可扫 URL 就画真二维码，否则画矢量占位（圆角框 + N·T 字标），**绝不贴 PNG**
    items.push({ t: 'minicode', x: CODE_X_MINI, y: footerTop, size: CODE, url: meta.miniQrUrl || '', dark: T.INK, light: T.BG, label: meta.miniCodeLabel || '小程序' });

    var totalH = Math.max(footTextBottom, footerTop + CODE) + T.QUIET;
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
    ctx.arcTo(x + w - r, y + h, x + w, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  /** 画二维码：用本地 qrcode-generator 出矩阵，逐格落笔（全离线、纯矢量）。库缺失则画占位框，绝不崩导出。 */
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

  /**
   * 小程序码：全矢量绘制（不用 PNG）。
   *   · 有 url → 走 drawQR 画真实可扫二维码；
   *   · 无 url（默认，appid 未配置、全离线）→ 画「圆角方框 + 居中 N·T 品牌字标 + 小程序」，是矢量占位不是假码。
   */
  function drawMiniCode(ctx, it) {
    if (it.url) { drawQR(ctx, { x: it.x, y: it.y, size: it.size, url: it.url, dark: it.dark, light: it.light }); return; }
    var s = it.size;
    roundRectPath(ctx, it.x + 0.5, it.y + 0.5, s - 1, s - 1, 10);   // 圆角占位框（1px 黑描边）
    ctx.strokeStyle = it.dark; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = it.dark;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = FONT(700, 20);
    ctx.fillText('N·T', it.x + s / 2, it.y + s / 2 - 2);            // 居中品牌字标（纯矢量）
    ctx.font = FONT(400, 9);
    ctx.fillText(it.label || '小程序', it.x + s / 2, it.y + s / 2 + 15);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
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
        ctx.strokeStyle = it.color || T.INK;
        ctx.lineWidth = it.width || 1;
        ctx.beginPath();
        ctx.moveTo(it.x, it.y);
        ctx.lineTo(it.x2, it.y);
        ctx.stroke();
      } else if (it.t === 'qr') {
        drawQR(ctx, it);
      } else if (it.t === 'minicode') {
        drawMiniCode(ctx, it);
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
   * 三端「导出图片」都调这一份，不各自拼参数 —— 加/改字段只改 settings.js + 这里，
   * 不会再出现「改了 PWA、漏了小程序」的漂移。
   */
  function optsFrom(about) {
    about = about || {};
    var em = about.exportMeta || {};
    return {
      brand: about.name,
      en: about.en,
      slogan: about.slogan,
      version: about.version,
      infoLabel: em.infoLabel || '推演信息：',
      resultLabel: em.resultLabel || '玄玖灵犀推演结果：',
      footLines: em.footLines || about.aboutFoot || [],
      miniCodeLabel: em.miniCodeLabel || '小程序',
      qrUrl: em.qrUrl,
      miniQrUrl: em.miniQrUrl || ''
    };
  }

  return { build: build, paint: paint, wrap: wrap, optsFrom: optsFrom, TOKENS: T };
});
