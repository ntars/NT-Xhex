/**
 * modules/CoreModule/config.js —— 算法口径开关【单一真源】
 *
 * 玄学排盘的很多"算法差异"其实不是对错，而是**流派不同**（年界用正月初一还是立春、
 * 早晚子时归哪天、月建用节当日还是交节时刻……）。圣经（离线功能总清单）1.2/1.6 明确
 * 要求这些"多种口径可切换"。本文件把它们集中成一份配置，**所有内核只读这里**，
 * 功能层不自己写死口径 —— 改一次全站生效。
 *
 * 加载：UMD —— 小程序/uni-app 被 require；浏览器挂到全局 NT.config。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NT = root.NT || {}; root.NT.config = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  // 默认口径 = 主流排盘口径（与「问真八字在线排盘」等主流工具一致，便于逆向校验）
  var DEFAULTS = {
    // 年柱换年点：'lichun' 立春当日（主流/默认） | 'lichunTime' 立春交接时刻 | 'chunjie' 正月初一
    yearBoundary: 'lichun',
    // 月柱换月点：'jieDay' 节当日（主流/默认） | 'jieTime' 交节精确时刻
    monthBoundary: 'jieDay',
    // 时柱早晚子时：'earlyZiNext' 早子时归次日（主流/默认） | 'lateZiSame' 夜子时归当天
    ziHour: 'earlyZiNext',
    // 性别/顺逆运：'auto' 按阳男阴女顺排自动判 | 手动覆写
    luckDirection: 'auto',
    // 真太阳时：是否默认启用（八字/紫微等需精确时辰的排盘用）
    trueSolarTime: false,
    // 生肖边界：'lichun' 立春当日属新一年（与 doc6 一致/默认）
    zodiacBoundary: 'lichun'
  };

  var current = {};
  for (var k in DEFAULTS) current[k] = DEFAULTS[k];

  /** 取当前口径（返回副本，防外部误改） */
  function get() { var o = {}; for (var k in current) o[k] = current[k]; return o; }

  /** 取单项 */
  function getOne(key) { return current[key]; }

  /** 覆盖口径（传入的对象里有的键才覆盖）；返回覆盖后的全量 */
  function set(overrides) {
    if (overrides) for (var k in overrides) { if (k in DEFAULTS) current[k] = overrides[k]; }
    return get();
  }

  /** 恢复默认 */
  function reset() { current = {}; for (var k in DEFAULTS) current[k] = DEFAULTS[k]; return get(); }

  return { DEFAULTS: DEFAULTS, get: get, getOne: getOne, set: set, reset: reset };
});
