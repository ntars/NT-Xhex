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
 * 壳只做各自平台的"取 canvas / 出文件"（仓库根 app.js、dist/mp-weixin/pages/index/index.js、
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

  // 设计稿小程序码（构建期由 tools/extract-minicode.py 从 sketch 提取，内嵌 base64 全离线三端通用）
  var MINI_CODE_PNG = 'data:image/png;base64,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';

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
    // 小程序码：**直接用设计稿那张码图**（清单第 3 项：主人指示「小程序码直接按照设计稿来就行，
    //   无需考虑是否能离线扫出来」）。码图 = static/icons/export-minicode.png，由
    //   tools/extract-minicode.py 从《玄玖灵犀 NT-Xhex.sketch》的「玄玖灵犀小程序码」矢量层提取
    //   （169 条路径 → 光栅化成 256×256 PNG，构建期产物），故与设计稿逐笔一致。
    //   ⚠ 它是**位图**：小程序 canvas 画位图须等 onload，故走 items 的 t:'image'（壳负责 loadImage 后 drawImage）；
    //     画布按 dpr 放大，PNG 256 足够 64pt 码在任何倍率下清晰。
    items.push({ t: 'image', x: CODE_X_MINI, y: footerTop, w: CODE, h: CODE, src: MINI_CODE_PNG });

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

  /**
   * 画位图（设计稿小程序码）。
   * ⚠ 位图是**异步**加载的（小程序 createImage / 浏览器 new Image），若不等它 onload 就出图，
   //   首次导出会「右下角两个码都缺」。故 paint() 统一把这类项收集起来，返回 Promise，
   *   等全部 onload 后再让壳去 toDataURL / canvasToTempFilePath —— 三端行为一致。
   */
  var imgCache = {};   // src → HTMLImageElement（同一会话只加载一次）

  function loadImage(src) {
    if (imgCache[src]) return imgCache[src];
    var img;
    if (typeof wx !== 'undefined' && wx.createImage) img = wx.createImage();
    else if (typeof Image !== 'undefined') img = new Image();
    else return null;
    imgCache[src] = img;
    return img;
  }

  function preloadImages(plan) {
    var jobs = [];
    (plan.items || []).forEach(function (it) {
      if (it.t !== 'image' || !it.src) return;
      var img = loadImage(it.src);
      if (!img) return;
      var p;
      if (img.complete && img.width) { p = Promise.resolve(img); }
      else {
        p = new Promise(function (res) {
          img.onload = function () { res(img); };
          img.onerror = function () { res(null); };
        });
        img.src = it.src;
      }
      jobs.push(p);
    });
    return Promise.all(jobs);
  }

  /** 同步把位图画上去（须已 preload 过；画不上静默跳过，不崩导出） */
  function drawImage(ctx, it) {
    var img = imgCache[it.src];
    if (!img || !img.width) return;
    try { ctx.drawImage(img, it.x, it.y, it.w, it.h); } catch (e) { /* 跳过 */ }
  }

  /**
   * 绘制整个计划。**返回 Promise**：等所有位图就绪后才 resolve，
   *   壳必须 `ExportImage.paint(ctx, plan).then(...)` 再出图，否则码会缺。
   *   （v3.1.34 起；旧壳若不 await 也能工作，只是首次可能少码——故下面同步先画一遍能画的。）
   */
  function paint(ctx, plan) {
    var self = this;
    paintSync(ctx, plan);
    return preloadImages(plan).then(function () { paintSync(ctx, plan); });
  }

  function paintSync(ctx, plan) {
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
      } else if (it.t === 'image') {
        drawImage(ctx, it);
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

  /* 注：paint / paintSync 已在上方「画位图」一节定义（paint 返回 Promise，壳应 await 后再出图）。 */

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

  return { build: build, paint: paint, wrap: wrap, optsFrom: optsFrom, preloadImages: preloadImages, TOKENS: T };
});
