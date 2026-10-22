/**
 * tools/gen-refs-texts.js —— 从内核导出「参考文献原书」资料库（refs-texts/*.md）
 *
 * 为什么用脚本生成、不手抄：
 *   · 内核是原文的**单一真源**（refs.js 的 QUOTERS 就是运行时读内核）；
 *   · 手抄必然与内核漂移，漂移后「原书」反而成了错的第二来源；
 *   · 生成 = 每次内核改动后重跑一次，资料库与内核永远逐字一致。
 *
 * 产出 4 份（与 refs.js 的 4 个 quoter 一一对应）：
 *   refs-texts/yijing.md        周易 64 卦经文（《十三经》通行本）
 *   refs-texts/ziwei-benshu.md  紫微斗数全书断语库 168 格
 *   refs-texts/guanyin.md       观音灵签 100 签签文
 *   refs-texts/bifa.md          大六壬《毕法赋》一百法
 *
 * 版权边界：这 4 种都是公版古籍（见 refs.js 文件头）。非公版书不入本目录。
 *
 * 用法：node tools/gen-refs-texts.js [--check]
 *   --check 只比对不写盘（供 CI / 提交前校验用），退出码非 0 表示资料库与内核不一致。
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var OUT = path.join(ROOT, 'refs-texts');

// —— 加载内核（Node 直 require，与 refs.js 的 Node 分支同一批文件）——
var ICHING_T = require(path.join(ROOT, 'modules/CoreModule/iching-text.js'));
var ZIWEI_DY = require(path.join(ROOT, 'modules/CoreModule/ziwei-duanyu.js'));
var GUANYIN = require(path.join(ROOT, 'modules/CoreModule/guanyin-data.js'));
var BIFA = require(path.join(ROOT, 'modules/CoreModule/liuren-bifa.js'));

/** 每个生成器的统一返回：{ file, title, head, body } */
var GENS = {
  yijing: function () {
    var L = ['# 周易 · 64 卦经文（《十三经》通行本）', '',
      '- 朝代作者：《十三经》通行本（与维基文库互校）',
      '- 公版依据：先秦传本，作者不详，已过著作权保护期',
      '- 查证状态：✅已核（经文与维基文库互校，字句未改）',
      '- 单一真源：`modules/CoreModule/iching-text.js` 的 `GUA`',
      '',
      '> 「白话」字段为本应用的主旨概括，**非古籍原文**，仅供阅读参照。',
      '',
      '---', ''];
    Object.keys(ICHING_T.GUA).forEach(function (no) {
      var g = ICHING_T.GUA[no];
      L.push('## 第' + no + '卦 ' + g.名);
      L.push('');
      L.push('**卦辞**：' + g.辞);
      L.push('');
      (g.爻 || []).forEach(function (y) {
        L.push('**' + y[0] + '**：' + y[1]);
        L.push('');
      });
      L.push('**大象**：' + g.象);
      L.push('');
      L.push('> 白话：' + g.白);
      L.push('');
    });
    return { file: 'yijing.md', title: '周易 64 卦经文', lines: L };
  },

  ziwei: function () {
    var PAL_FULL = ZIWEI_DY.PAL_FULL || {};
    var L = ['# 紫微斗数全书 · 断语库原文（168 格）', '',
      '- 朝代作者：明·罗洪先辑（旧题宋·陈希夷）',
      '- 公版依据：明代传本，已过著作权保护期',
      '- 查证状态：✅已核（非黄金盘逐宫锁死层级）',
      '- 单一真源：`modules/CoreModule/ziwei-duanyu.js` 的 `STAR12`',
      '',
      '来源分层级：卷一「诸星问答论」为主源；卷二「诸宫问答」据 ziwei.pro / bzwai /',
      '古文岛三处独立转录交叉补齐 56 格；「七杀·财帛宫」据明清流传《星曜飞躔十二宫》',
      '（易德轩/六都命理/紫微府/壹风水 4 源逐字一致）补齐，附王亭之一系歌诀两源标「本派传」。',
      '',
      '---', ''];
    Object.keys(ZIWEI_DY.STAR12).forEach(function (star) {
      var d = ZIWEI_DY.STAR12[star];
      L.push('## ' + star);
      L.push('');
      (d.原文 || []).forEach(function (q) {
        L.push('### ' + star + '居' + (PAL_FULL[q.宫] || q.宫));
        L.push('');
        L.push(q.文);
        L.push('');
      });
    });
    return { file: 'ziwei-benshu.md', title: '紫微斗数全书断语库', lines: L };
  },

  guanyin: function () {
    var L = ['# 观音灵签 · 一百签签文', '',
      '- 朝代作者：民间传本（作者不详、流传数百年）',
      '- 公版依据：民俗文本，作者不详，已过著作权保护期',
      '- 查证状态：✅已核（异本逐条标注）',
      '- 单一真源：`modules/CoreModule/guanyin-data.js` 的 `LIST` / `byNo`',
      '',
      '主源天天灵签网（2026-10-17 逐签抓取），校一农历114、校二观音灵签解签；',
      '统一取「主源∩校一版本一」一系，不混本。',
      '',
      '---', ''];
    GUANYIN.LIST.forEach(function (r) {
      var q = GUANYIN.byNo(r[0]);
      if (!q) return;
      L.push('## 第' + q.号 + '签 ' + q.名 + '（' + q.宫 + ' · ' + q.吉凶 + '）');
      L.push('');
      L.push('**签诗**：' + (q.诗 || []).join('，') + '。');
      L.push('');
      L.push('**诗意**：' + q.意);
      L.push('');
      L.push('**解曰**：' + q.解);
      L.push('');
      L.push('**圣意**：' + q.圣);
      L.push('');
    });
    return { file: 'guanyin.md', title: '观音灵签一百签', lines: L };
  },

  bifa: function () {
    var L = ['# 大六壬 ·《毕法赋》一百法', '',
      '- 朝代作者：清·凌福之（四库《六壬大全》卷九/卷十一）',
      '- 公版依据：清代传本，已过著作权保护期',
      '- 查证状态：目录 ✅已核',
      '- 单一真源：`modules/CoreModule/liuren-bifa.js` 的 `BIFA`',
      '',
      '原书卷十一编号脱误（第 51 法后直跳 53 法）已按实际顺序重编 1–100 并标注；',
      '可机器判定 18 条逐条检出。',
      '',
      '---', ''];
    BIFA.BIFA.forEach(function (b) {
      L.push('### 第' + b[0] + '法 ' + b[1]);
      L.push('');
      L.push('《六壬大全》' + (b[0] <= 70 ? '卷九上' : '卷十一下') + '，档：' + b[2] + '。');
      L.push('');
    });
    return { file: 'bifa.md', title: '毕法赋一百法', lines: L };
  }
};

// —— 主流程 ——
var CHECK = process.argv.indexOf('--check') >= 0;
var changed = [];
var ok = [];

Object.keys(GENS).forEach(function (key) {
  var g = GENS[key]();
  var fp = path.join(OUT, g.file);
  var body = g.lines.join('\n') + '\n';
  var prev = '';
  try { prev = fs.readFileSync(fp, 'utf8'); } catch (e) { /* 首次生成 */ }
  if (prev === body) { ok.push(g.file); return; }
  changed.push(g.file);
  if (!CHECK) fs.writeFileSync(fp, body, 'utf8');
});

if (CHECK) {
  if (changed.length) {
    console.error('[gen-refs-texts] 资料库与内核不一致，需重跑 node tools/gen-refs-texts.js：');
    changed.forEach(function (f) { console.error('  · ' + f); });
    process.exit(1);
  }
  console.log('[gen-refs-texts] 一致 ✓（' + ok.length + ' 份，与内核逐字相同）');
} else {
  console.log('[gen-refs-texts] 已生成 ' + Object.keys(GENS).length + ' 份：' +
    Object.keys(GENS).map(function (k) { return GENS[k]().file; }).join(' / '));
  if (changed.length) console.log('  本次写入：' + changed.join(' / '));
  else console.log('  （内容无变化，均与内核逐字一致）');
}
