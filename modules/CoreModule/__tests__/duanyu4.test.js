/** 六壬/太乙/梅花/黄历 四个断语库自测（v3.1.49 合并） */
var LR = require('../liuren-duanyu.js'), TY = require('../taiyi-duanyu.js'),
    MH = require('../meihua-duanyu.js'), HL = require('../huangli-duanyu.js');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (e ? '  → ' + e : '')); } }
console.log('=== 四库自测 ===\n');
console.log('A. 六壬');
ok('九宗门 9', LR.count.九宗门 === 9);
ok('课体 12', LR.count.课体 === 12);
ok('天将 12', LR.count.天将 === 12);
ok('分类 8', LR.count.分类 === 8);
ok('fayongOf 吃复合名（伏吟·自任）', !!LR.fayongOf('伏吟·自任(阳日干上)'));
ok('fayongOf 未知返回 null', LR.fayongOf('不存在的门') === null);
ok('tianjiangOf(青龙) 有', !!LR.tianjiangOf('青龙'));
ok('duanshiOf(求财) 有', !!LR.duanshiOf('求财'));
console.log('\nB. 太乙');
ok('主客算 6', TY.count.主客算 === 6);
ok('格局 7', TY.count.格局 === 7);
ok('十六神 16', TY.count.十六神 === 16);
ok('阳九百六 2', TY.count.阳九百六 === 2);
ok('shenOf(文昌) 有', !!TY.shenOf('文昌'));
ok('gejuOf(掩) 有', !!TY.gejuOf('掩'));
ok('未知返回 null', TY.shenOf('不存在') === null);
console.log('\nC. 梅花');
ok('体用 8', MH.count.体用 === 8);
ok('64 卦全', MH.count.卦 === 64);
ok('类象 8', MH.count.类象 === 8);
ok('tiYongOf 吃「用克体（体水 / 用土）」', !!MH.tiYongOf('用克体（体水 / 用土）'));
ok('guaOf(水山蹇) 经去前缀命中', !!MH.guaOf('水山蹇'.replace(/^../, '')));
ok('xiangOf(坎) 有', !!MH.xiangOf('坎'));
ok('zhanDuanOf(婚姻) 有', !!MH.zhanDuanOf('婚姻'));
console.log('\nD. 黄历神煞');
ok('建除 12', HL.count.建除 === 12);
ok('黄道 6', HL.count.黄道 === 6);
ok('黑道 6', HL.count.黑道 === 6);
ok('神煞 34', HL.count.神煞 === 34);
ok('jianchuOf(定) 有', !!HL.jianchuOf('定'));
ok('zhIShenOf(司命) 走黄道', HL.zhIShenOf('司命').indexOf('黄道') >= 0);
ok('zhIShenOf(白虎) 走黑道', HL.zhIShenOf('白虎').indexOf('黑道') >= 0);
ok('shenshaOf(天德) 有', !!HL.shenshaOf('天德'));
ok('shenshaOf 未知返回 null', HL.shenshaOf('不存在的神煞') === null);
console.log('\n=== 四库自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
if (fail) process.exit(1);

// v3.1.50 追加：占星落宫 + 七政曜入宫
console.log('\nE. 占星落宫（v3.1.50）');
var AD = require('../astro-duanyu.js');
ok('落宫断语 84', AD.count.落宫断语 === 84);
var miss2 = [];
Object.keys(AD.PLANET_HOUSE).forEach(function (pl) {
  for (var i = 1; i <= 12; i++) if (!AD.PLANET_HOUSE[pl][i]) miss2.push(pl + '·' + i);
});
ok('84 格全（7行星×12宫）', miss2.length === 0, miss2.slice(0, 5).join(','));
ok('HOUSE12 含档位', AD.HOUSE12[10].档.indexOf('角宫') >= 0);
ok('planHouseOf(太阳,10) 有', !!AD.planHouseOf('太阳', 10));
ok('planHouseOf 吃异名（太阴→月亮）', AD.planHouseOf('太阴', 4) === AD.planHouseOf('月亮', 4));
ok('planHouseOf 未知返回 null', AD.planHouseOf('太阳', 99) === null);
ok('planHouseOf 未知行星返回 null', AD.planHouseOf('天王', 1) === null);

console.log('\nF. 七政曜入十二宫映射（v3.1.50）');
var QZ = require('../qizheng-duanyu.js');
var GL = { 1: '命', 2: '财帛', 3: '兄弟', 4: '田宅', 5: '男女', 6: '奴仆', 7: '夫妻', 8: '疾厄', 9: '迁移', 10: '官禄', 11: '福德', 12: '相貌' };
var miss3 = [];
Object.keys(GL).forEach(function (no) {
  ['太阳', '太阴', '金星', '木星', '水星', '火星', '土星'].forEach(function (y) {
    if (!QZ.gongDuanOf(y, GL[no])) miss3.push(y + '·' + GL[no]);
  });
});
ok('7 政 × 12 果老宫全部有断语（84 格）', miss3.length === 0, miss3.slice(0, 5).join(','));
