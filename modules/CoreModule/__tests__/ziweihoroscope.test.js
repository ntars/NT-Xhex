/**
 * modules/CoreModule/__tests__/ziweihoroscope.test.js
 * 紫微四化 · 流年流月流日（C29）黄金盘断言
 *
 * 覆盖：十天干四化表 40 项 / 与 iztro 逐干反推对账 10 干 / 六层流运 / 流日干支=目标日干支 /
 *       生年四化落宫 / 三方四正 / 四化落宫合成断语 / 流年十二宫映射 / 随机压力
 *
 * 权威依据：中州派（陆斌兆）十天干四化 + 内嵌 iztro 2.6.2 计算的星曜与落宫
 */
var ZH = require('../ziwei-horoscope.js');
var ZW = require('../ziwei.js');
var LUNAR = require('../lunar.js');

var pass = 0, fail = 0, fails = [];
function ok(name, cond, got) {
  if (cond) pass++;
  else { fail++; fails.push(name + (got !== undefined ? '  →  实得：' + JSON.stringify(got) : '')); }
}

// ========== A. 十天干四化表（中州派，10 干 × 4 星 = 40 项）==========
var 期望 = {
  甲: ['廉贞', '破军', '武曲', '太阳'],
  乙: ['天机', '天梁', '紫微', '太阴'],
  丙: ['天同', '天机', '文昌', '廉贞'],
  丁: ['太阴', '天同', '天机', '巨门'],
  戊: ['贪狼', '太阴', '右弼', '天机'],
  己: ['武曲', '贪狼', '天梁', '文曲'],
  庚: ['太阳', '武曲', '太阴', '天同'],
  辛: ['巨门', '太阳', '文曲', '文昌'],
  壬: ['天梁', '紫微', '左辅', '武曲'],
  癸: ['破军', '巨门', '太阴', '贪狼']
};
var HUA = ZH.HUA;
ok('四化顺序为 禄权科忌', JSON.stringify(HUA) === '["禄","权","科","忌"]', HUA);
Object.keys(期望).forEach(function (g) {
  for (var i = 0; i < 4; i++) {
    ok(g + '干 ' + HUA[i] + '化' + 期望[g][i], ZH.SIHUA[g][i] === 期望[g][i], ZH.SIHUA[g][i]);
  }
});
ok('四化表恰 10 干', Object.keys(ZH.SIHUA).length === 10, Object.keys(ZH.SIHUA).length);

// ========== B. 与 iztro 逐干反推对账（生年干 × 盘上四化）==========
var 年列 = { 甲: 1984, 乙: 1985, 丙: 1986, 丁: 1987, 戊: 1988, 己: 1989, 庚: 1990, 辛: 1991, 壬: 1992, 癸: 1993 };
var 对账错 = [];
Object.keys(年列).forEach(function (g) {
  var c = ZW.chart({ y: 年列[g], m: 6, d: 10, h: 12, gender: '男' });
  if (c.err) { 对账错.push(g + ':排盘失败'); return; }
  var 盘 = {};
  (c.十二宫 || []).forEach(function (p) {
    (p.四化项 || []).forEach(function (x) { 盘[x.化] = x.星; });
  });
  for (var i = 0; i < 4; i++) {
    if (盘[HUA[i]] !== ZH.SIHUA[g][i]) 对账错.push(g + '干' + HUA[i] + '：表=' + ZH.SIHUA[g][i] + ' 盘=' + 盘[HUA[i]]);
  }
});
ok('十天干四化表与 iztro 逐干反推全等（10 干 40 项）', 对账错.length === 0, 对账错);

// ========== C. 六层流运结构 ==========
var R = ZH.analyze({ y: 1990, m: 8, d: 15, h: 14, gender: '男' }, '2026-10-20');
ok('analyze 无错', !R.err, R.err);
ok('六层流运齐全（大限/小限/流年/流月/流日/流时）',
  R.层.map(function (x) { return x.层; }).join(',') === '大限,小限,流年,流月,流日,流时',
  R.层.map(function (x) { return x.层; }));
ok('每层都有 4 项四化', R.层.every(function (x) { return x.项.length === 4; }));
ok('每层都有干支', R.层.every(function (x) { return /^[\u4e00-\u9fa5]{2}$/.test(x.干支); }),
  R.层.map(function (x) { return x.干支; }));
ok('大限有岁区间', R.层[0].岁区间 && R.层[0].岁区间.length === 2, R.层[0].岁区间);

// 流年干支 = 2026 年干支（丙午）
var 年GZ = LUNAR.fromSolar(2026, 10, 20, 12).ganzhi.年.干支;
ok('流年干支 = 目标年干支（' + 年GZ + '）', R.层[2].干支 === 年GZ, R.层[2].干支);
// 流日干支 = 目标日干支
var 日GZ = LUNAR.fromSolar(2026, 10, 20, 12).ganzhi.日.干支;
ok('流日干支 = 目标日干支（' + 日GZ + '）', R.层[4].干支 === 日GZ, R.层[4].干支);

// ========== D. 生年四化落宫（庚年生：太阳禄/武曲权/太阴科/天同忌）==========
ok('生年四化共 4 项', R.生年.length === 4, R.生年.length);
ok('生年四化按禄权科忌排序', R.生年.map(function (x) { return x.化; }).join('') === '禄权科忌',
  R.生年.map(function (x) { return x.化; }));
ok('太阳化禄落夫妻宫', R.生年[0].星 === '太阳' && R.生年[0].宫 === '夫妻', R.生年[0]);
ok('武曲化权落子女宫', R.生年[1].星 === '武曲' && R.生年[1].宫 === '子女', R.生年[1]);
ok('太阴化科落官禄宫', R.生年[2].星 === '太阴' && R.生年[2].宫 === '官禄', R.生年[2]);
ok('天同化忌落财帛宫', R.生年[3].星 === '天同' && R.生年[3].宫 === '财帛', R.生年[3]);

// ========== E. 三方四正 ==========
ok('三方四正含 4 个宫位', R.三方四正.length === 4, R.三方四正);
var 三正名 = R.三方四正.map(function (i) { return R.星表[i].宫; }).sort().join(',');
ok('三方四正 = 命宫/财帛/官禄/迁移', 三正名 === ['命宫', '财帛', '官禄', '迁移'].sort().join(','), 三正名);
ok('命宫在三方四正内', R.星表[R.三方四正[0]].宫 === '命宫', R.星表[R.三方四正[0]].宫);

// ========== F. 四化落宫与合成断语 ==========
var 流年 = R.层[2];
ok('流年四化四星全在本命十二宫找到', 流年.项.every(function (x) { return x.宫位 >= 0; }),
  流年.项.map(function (x) { return x.星 + '→' + x.宫; }));
ok('入三方四正标记正确', 流年.项.some(function (x) { return x.入三方; }), 流年.项.map(function (x) { return x.入三方; }));
ok('化忌断语含「阻滞亏欠」', ZH.合成断语('忌', '财帛').indexOf('阻滞亏欠') >= 0, ZH.合成断语('忌', '财帛'));
ok('化禄断语含「增益顺遂」', ZH.合成断语('禄', '命宫').indexOf('增益顺遂') >= 0, ZH.合成断语('禄', '命宫'));
ok('化权断语含「主导扩张」', ZH.合成断语('权', '官禄').indexOf('主导扩张') >= 0, ZH.合成断语('权', '官禄'));
ok('化科断语含「名声贵助」', ZH.合成断语('科', '命宫').indexOf('名声贵助') >= 0, ZH.合成断语('科', '命宫'));
ok('未知宫位返回空串', ZH.合成断语('禄', '不存在宫') === '', ZH.合成断语('禄', '不存在宫'));

// ========== G. 流年十二宫映射 ==========
ok('流年映射 12 条', R.流年映射.length === 12, R.流年映射.length);
ok('流年宫名互不重复且覆盖十二宫',
  R.流年映射.map(function (x) { return x.流年宫; }).sort().join(',') ===
  ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '仆役', '官禄', '田宅', '福德', '父母'].sort().join(','),
  R.流年映射.map(function (x) { return x.流年宫; }));
var 流命 = R.流年映射.filter(function (x) { return x.流年宫 === '命宫'; })[0];
ok('流年命宫落在该层命宫位', 流命 && 流命.位 === 流年.命宫位, 流命 && 流命.位);
ok('流年星表 12 宫', R.星表.length === 12, R.星表.length);

// ========== H. 单干速查表 ==========
var t庚 = ZH.sihuaTable('庚');
ok('sihuaTable(庚) 返回 4 项', t庚 && t庚.length === 4, t庚 && t庚.length);
ok('sihuaTable(庚) 首项为太阳化禄', t庚[0].化 === '禄' && t庚[0].星 === '太阳', t庚[0]);
ok('sihuaTable(无此干) 返回 null', ZH.sihuaTable('子') === null);
ok('sihuaTable() 返回 10 干全表', Object.keys(ZH.sihuaTable()).length === 10);

// ========== I. 标注与降级 ==========
ok('说明含中州派口径', R.说明.join('').indexOf('中州派') >= 0);
ok('说明含流派分歧（戊/壬干）', R.说明.join('').indexOf('右弼化科') >= 0 && R.说明.join('').indexOf('左辅化科') >= 0);
ok('说明标注断语为合成', R.说明.join('').indexOf('合成句') >= 0);
ok('缺目标日返回错误', !!ZH.analyze({ y: 1990, m: 8, d: 15, h: 14, gender: '男' }, '').err);
ok('缺生日返回错误', !!ZH.analyze({}, '2026-10-20').err);

// ========== J. 随机压力 20 组 ==========
var bad = 0;
for (var i = 0; i < 20; i++) {
  var by = 1955 + Math.floor(Math.random() * 55);
  var ty = 2020 + Math.floor(Math.random() * 20);
  var rr = ZH.analyze(
    { y: by, m: 1 + Math.floor(Math.random() * 12), d: 1 + Math.floor(Math.random() * 28), h: Math.floor(Math.random() * 24), gender: i % 2 ? '女' : '男' },
    ty + '-' + (1 + Math.floor(Math.random() * 12)) + '-' + (1 + Math.floor(Math.random() * 28))
  );
  if (rr.err) bad++;
  else {
    if (!rr.层 || rr.层.length !== 6) bad++;
    if (!rr.生年 || rr.生年.length !== 4) bad++;
    if (!rr.流年映射 || rr.流年映射.length !== 12) bad++;
  }
}
ok('随机 20 组流运无一异常', bad === 0, bad);

// ========== 汇总 ==========
console.log('\n紫微四化·流运 C29：' + pass + '/' + (pass + fail) + ' 通过');
if (fail) { console.log('失败项：'); fails.forEach(function (f) { console.log('  ✗ ' + f); }); process.exit(1); }
