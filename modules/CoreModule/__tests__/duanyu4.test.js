/**
 * modules/CoreModule/__tests__/duanyu4.test.js —— 断语库自测（v3.2.0 裁剪后）
 *
 * v3.2.0 起：太乙断语库（taiyi-duanyu.js）、黄历神煞库（huangli-duanyu.js）、
 * 占星落宫（astro-duanyu.js）、七政曜入宫（qizheng-duanyu.js）随对应算法一并归档，
 * 本文件只保留仍在项目内的两库：六壬断语（liuren-duanyu.js）、梅花断语（meihua-duanyu.js）。
 *
 * 跑法：node modules/CoreModule/__tests__/duanyu4.test.js
 */
var LR = require('../liuren-duanyu.js'), MH = require('../meihua-duanyu.js');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (e ? '  → ' + e : '')); } }
console.log('=== 断语库自测（v3.2.0）===\n');
console.log('A. 六壬');
ok('九宗门 9', LR.count.九宗门 === 9);
ok('课体 12', LR.count.课体 === 12);
ok('天将 12', LR.count.天将 === 12);
ok('分类 8', LR.count.分类 === 8);
ok('fayongOf 吃复合名（伏吟·自任）', !!LR.fayongOf('伏吟·自任(阳日干上)'));
ok('fayongOf 未知返回 null', LR.fayongOf('不存在的门') === null);
ok('tianjiangOf(青龙) 有', !!LR.tianjiangOf('青龙'));
ok('duanshiOf(求财) 有', !!LR.duanshiOf('求财'));
console.log('\nB. 梅花');
ok('体用 8', MH.count.体用 === 8);
ok('64 卦全', MH.count.卦 === 64);
ok('类象 8', MH.count.类象 === 8);
ok('tiYongOf 吃「用克体（体水 / 用土）」', !!MH.tiYongOf('用克体（体水 / 用土）'));
ok('guaOf(水山蹇) 经去前缀命中', !!MH.guaOf('水山蹇'.replace(/^../, '')));
ok('xiangOf(坎) 有', !!MH.xiangOf('坎'));
ok('zhanDuanOf(婚姻) 有', !!MH.zhanDuanOf('婚姻'));
console.log('\n=== 断语库自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
if (fail) process.exit(1);
