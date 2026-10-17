#!/usr/bin/env node
/**
 * tools/gen-kangxi.js —— 生成 modules/CoreModule/kangxi-strokes.js【康熙笔画 3500 字表】
 *
 * 为什么有生成器：kangxi-strokes.js 是「单一真源」数据文件（三端共用的 3500 字康熙笔画）。
 * 它不是手抄，而是一条**可复现管道**的产物——重跑本脚本即可整体重生成，杜绝逐字臆造。
 *
 * 数据源（按「有权威用权威」排序，全部可复现、非臆造）：
 *   ① TDEM kangxi-strokecount（Kawai Lo / breezyreeds，MIT；63696 字，**按康熙部首计数**，
 *      即主流五格姓名学口径：萬=15、陳=16、遠=17、華=14…）。存于 ~/.workbuddy/kangxi-strokecount.csv。
 *   ② opencc-js（MIT + Apache-2.0）简→繁字形映射；姓名学按**繁体康熙**计数，故先转繁再查 ①。
 *   ③ Unihan（The Unicode Consortium）kTotalStrokes / kAlternateTotalStrokes 作**兜底**（TDEM 缺时）。
 *   ④ 字表 = 通用规范汉字 3500（jinghu-moon 名单，仅 CJK 基本区）；无名单文件时从现有 DATA 回提取。
 *
 * 口径说明（零臆造）：本表为「康熙部首计数」的姓名学康熙笔画（主流五格软件口径，TDEM 定标）。
 *   个别极罕用字 TDEM/Unihan 都缺时回 0（KANGXI 缺字报缺、不臆造）。
 *
 * 运行（一次性；生成后无需常驻）：
 *   cd <repo> && 确认 ~/.workbuddy/kangxi-strokecount.csv 存在（TDEM，见 README 下载步骤）
 *   （可选）npm i opencc-js；把 3500 名单放 tools/3500_chars.txt（缺则自动回提取）
 *   node tools/gen-kangxi.js [--out modules/CoreModule/kangxi-strokes.js] [--chars tools/3500_chars.txt]
 *   重生成后请人工抽检高频姓/部首旧制字（張=11 陳=16 遠=17 華=14 萬=15），确认与主流五格软件一致再提交。
 */
(function () {
  'use strict';
  const fs = require('fs');
  const path = require('path');

  const ROOT = path.join(__dirname, '..');
  const OUT = process.argv.indexOf('--out') >= 0 ? process.argv[process.argv.indexOf('--out') + 1] : path.join(ROOT, 'modules/CoreModule/kangxi-strokes.js');
  const CHARS_FILE = process.argv.indexOf('--chars') >= 0 ? process.argv[process.argv.indexOf('--chars') + 1] : path.join(ROOT, 'tools/3500_chars.txt');
  const UNIHAN_DIR = process.env.UNIHAN_DIR || (process.env.HOME + '/.workbuddy/unihan');
  const TDEM_CSV = process.env.KANGXI_TDEM_CSV || (process.env.HOME + '/.workbuddy/kangxi-strokecount.csv');

  // ---- ① TDEM kangxi-strokecount（康熙部首计数，MIT；主流五格定标源）----
  // 格式：U+CODE, DECIMAL, CHAR, STROKES（UTF-8 BOM + CRLF，含 license 头几行 → 用行首 U+ 判定数据行）
  const tdem = {};
  if (fs.existsSync(TDEM_CSV)) {
    for (const line of fs.readFileSync(TDEM_CSV, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^U\+([0-9A-Fa-f]+),\s*\d+,([^\u0000-\u0020]),(\d+)\s*$/);
      if (m && m[2].length === 1) tdem[m[2]] = +m[3];
    }
    console.log('[gen-kangxi] TDEM 收录：' + Object.keys(tdem).length + ' 字');
  } else {
    console.warn('[gen-kangxi] 未找到 TDEM CSV（' + TDEM_CSV + '），回退 Unihan 总笔画（非主流五格口径）');
  }
  const CP = c => c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');

  // ---- ② Unihan 笔画表（兜底）----
  function loadCP(file, field, target) {
    if (!fs.existsSync(file)) return;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(new RegExp('^U\\+([0-9A-F]{4})\\s+' + field + '\\s+(\\d+)'));
      if (m) target[m[1]] = +m[2];
    }
  }
  const total = {}, alt = {};
  loadCP(path.join(UNIHAN_DIR, 'Unihan_IRGSources.txt'), 'kTotalStrokes', total);
  loadCP(path.join(UNIHAN_DIR, 'Unihan_DictionaryLikeData.txt'), 'kAlternateTotalStrokes', alt);

  // ---- ③ opencc 简→繁（缺则回简体字形，不臆造）----
  let toTrad = c => c;
  try {
    const OpenCC = require('opencc-js');
    let conv;
    try { conv = new OpenCC.Converter({ from: 'cn', to: 'tw' }); }
    catch (e) { conv = OpenCC.Converter.createInstance ? OpenCC.Converter.createInstance({ from: 'cn', to: 'tw' }) : null; }
    if (conv) {
      const probe = conv('陈');
      const val = (probe && typeof probe === 'object' && probe.traditional !== undefined) ? probe.traditional : (typeof probe === 'string' ? probe : '陈');
      if (val === '陳') toTrad = c => { const r = conv(c); return (r && typeof r === 'object' && r.traditional !== undefined) ? r.traditional : (typeof r === 'string' ? r : c); };
      console.log('[gen-kangxi] opencc 简→繁 正常（陈→陳）');
    } else console.warn('[gen-kangxi] opencc Converter 不可用，按字形查');
  } catch (e) {
    console.warn('[gen-kangxi] 未装 opencc-js，按简体字形查（繁体会缺失，建议 npm i opencc-js）');
  }

  // 康熙笔画查表：TDEM(繁/简) → Unihan(繁/简)；命中即止
  function kangxiOf(ch) {
    const t = toTrad(ch);
    if (tdem[t] != null) return tdem[t];
    if (tdem[ch] != null) return tdem[ch];
    if (total[CP(t)] != null) return total[CP(t)];
    if (total[CP(ch)] != null) return total[CP(ch)];
    if (alt[CP(t)] != null) return alt[CP(t)];
    if (alt[CP(ch)] != null) return alt[CP(ch)];
    return undefined;
  }

  // ---- ④ 3500 字名单（有文件用文件；否则从现有 DATA 回提取简体字）----
  let list = [];
  if (fs.existsSync(CHARS_FILE)) {
    const raw = fs.readFileSync(CHARS_FILE, 'utf8');
    const seen = new Set();
    for (const ch of raw) {
      const c = ch.codePointAt(0);
      if (c >= 0x4E00 && c <= 0x9FFF && !seen.has(ch)) { seen.add(ch); list.push(ch); }
    }
    console.log('[gen-kangxi] 名单来源：' + path.basename(CHARS_FILE) + '（清洗后 ' + list.length + '）');
  } else {
    const cur = fs.readFileSync(OUT, 'utf8');
    list = [...cur.matchAll(/\["([^\"]+)",\d+\]/g)].map(m => m[1]).filter(c => c.length === 1);
    console.log('[gen-kangxi] 无 3500_chars.txt，从现有 DATA 回提取 ' + list.length + ' 字（保覆盖不缩水）');
  }

  const table = {}, unresolved = [];
  for (const ch of list) {
    const g = kangxiOf(ch);
    if (g != null && g > 0) table[ch] = g; else unresolved.push(ch);
  }
  console.log('[gen-kangxi] 覆盖：' + (list.length - unresolved.length) + '/' + list.length + '  未覆盖：' + unresolved.join(''));

  // ---- 生成 UMD 数据文件 ----
  const pairs = Object.entries(table);
  const L = [];
  L.push('/**');
  L.push(' * modules/CoreModule/kangxi-strokes.js —— 姓名学·康熙笔画数据【单一真源】');
  L.push(' *');
  L.push(' * 覆盖：通用规范汉字 3500 字（jinghu-moon/Simplified-Chinese-Characters 名单，仅 CJK 基本区汉字）。');
  L.push(' * 来源（可复现，非臆造）：TDEM kangxi-strokecount（Kawai Lo，MIT，按康熙部首计数=主流五格口径）');
  L.push(' *   + opencc-js 简→繁 + Unihan kTotalStrokes 兜底。生成器：tools/gen-kangxi.js。');
  L.push(' * 口径说明：本表为「康熙部首计数」姓名学笔画（與主流五格软件一致：張11 陳16 遠17 華14 萬15）。');
  L.push(' * 加载：UMD——require() 得 { KANGXI, RADICAL_OVERRIDE, COUNT, source }；浏览器挂 NT.core.kangxiStrokes。');
  L.push(' */');
  L.push('(function (root, factory) {');
  L.push('  if (typeof module === \'object\' && module.exports) module.exports = factory();');
  L.push('  else { root.NT = root.NT || {}; root.NT.core = root.NT.core || {}; root.NT.core.kangxiStrokes = factory(); }');
  L.push('})(typeof self !== \'undefined\' ? self : this, function () {');
  L.push('  // 逐条 [字, 康熙笔画]（按 3500 名单顺序；数组比对象键序更稳、无歧义）');
  L.push('  var DATA = [');
  for (let i = 0; i < pairs.length; i += 20) {
    const chunk = pairs.slice(i, i + 20).map(p => '[' + JSON.stringify(p[0]) + ',' + p[1] + ']');
    L.push('    ' + chunk.join(', ') + (i + 20 < pairs.length ? ',' : ''));
  }
  L.push('  ];');
  L.push('  var KANGXI = {};');
  L.push('  for (var i = 0; i < DATA.length; i++) { KANGXI[DATA[i][0]] = DATA[i][1]; }');
  L.push('  // 康熙部首特殊笔画修正表（可选叠层，单一真源；默认空=全按 TDEM 康熙部首计数，零臆造）');
  L.push('  var RADICAL_OVERRIDE = { /* 例： 阝: 8, 艹: 6, 纟: 6, 犭: 7, 饣: 9 */ };');
  L.push('  return {');
  L.push('    KANGXI: KANGXI,');
  L.push('    RADICAL_OVERRIDE: RADICAL_OVERRIDE,');
  L.push('    COUNT: DATA.length,');
  L.push('    source: "TDEM kangxi-strokecount(康熙部首, MIT) + opencc-js(简繁) + Unihan(兜底) · 通用规范汉字 3500",');
  L.push('  };');
  L.push('});');
  fs.writeFileSync(OUT, L.join('\n') + '\n');
  console.log('[gen-kangxi] 已写：' + OUT + '（' + pairs.length + ' 条）');
  // 抽检高频姓/部首旧制字（主流五格口径）
  const spot = ['張', '陳', '遠', '華', '萬', '张', '陈', '远', '花', '万'];
  console.log('[gen-kangxi] 抽检：' + spot.map(c => c + '=' + (kangxiOf(c) != null ? kangxiOf(c) : (table[c] != null ? table[c] : '?'))).join(' '));
})();
