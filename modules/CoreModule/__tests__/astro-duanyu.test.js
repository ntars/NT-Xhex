/**
 * modules/CoreModule/__tests__/astro-duanyu.test.js —— 占星解读库自测
 *
 * 护栏目标（v3.1.48 新增）：
 *   ① 7 行星 × 12 星座 = 84 组落座断语齐全；
 *   ② 12 星座均带「元素/模式/守护星」，且元素/模式取值合法；
 *   ③ 相位五类齐全（合/六合/刑/拱/冲）；
 *   ④ 查询安全：未知行星/未知星座返回 null/空，不抛。
 */
var D = require('../astro-duanyu.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

console.log('=== 占星解读库自测 ===\n');

console.log('A. 规格');
ok('7 行星', D.count.行星 === 7, String(D.count.行星));
ok('12 星座', D.count.星座 === 12, String(D.count.星座));
ok('落座断语 84', D.count.落座断语 === 84, String(D.count.落座断语));
ok('相位 5 类', D.count.相位 === 5, String(D.count.相位));

console.log('\nB. 行星×星座 84 组无缺');
var PAL = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'];
var miss = [];
Object.keys(D.PLANET_SIGN).forEach(function (pl) {
  PAL.forEach(function (sg) { if (!D.PLANET_SIGN[pl][sg]) miss.push(pl + '·' + sg); });
});
ok('84 格全部有断语', miss.length === 0, miss.slice(0, 6).join(','));

console.log('\nC. 12 星座字段合法');
var badSign = PAL.filter(function (sg) {
  var s = D.SIGN[sg];
  return !(s && s.元素 && s.模式 && s.守护 && s.核);
});
ok('12 星座字段完整（元素/模式/守护/核）', badSign.length === 0, badSign.join(','));
ok('元素取值合法（火土风水）', PAL.every(function (sg) {
  return ['火', '土', '风', '水'].indexOf(D.SIGN[sg].元素) >= 0;
}));
ok('模式取值合法（基本/固定/变动）', PAL.every(function (sg) {
  return ['基本', '固定', '变动'].indexOf(D.SIGN[sg].模式) >= 0;
}));

console.log('\nD. 相位五类');
ok('合/六合/刑/拱/对冲齐全', ['合相', '六合', '刑', '拱', '对冲'].every(function (k) { return D.ASPECT_TXT[k]; }));

console.log('\nE. 查询行为');
ok('planSignOf(太阳,摩羯) 有值', !!D.planSignOf('太阳', '摩羯'));
ok('planSignOf 吃异名：月亮→太阴', D.planSignOf('月亮', '巨蟹') === D.planSignOf('太阴', '巨蟹'));
ok('planSignOf 星座不带「座」也能查（狮子=狮子座）', !!D.planSignOf('太阳', '狮子'));
ok('planSignOf 未知行星返回 null', D.planSignOf('天王', '白羊') === null);
ok('planSignOf 未知星座返回 null', D.planSignOf('太阳', '不存在的座') === null);
ok('elementOf(双鱼) 含「水」', D.elementOf('双鱼').indexOf('水') >= 0);
ok('modalOf(摩羯) 含「基本」', D.modalOf('摩羯').indexOf('基本') >= 0);
ok('vitalOf(上升) 含「上升」', D.vitalOf('上升', '白羊').indexOf('上升') === 0);

console.log('\n=== 占星解读库自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
if (fail) process.exit(1);
