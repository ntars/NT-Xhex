/**
 * modules/features/registry.js —— 扩展功能注册表【单一真源】
 *
 * 职责：把 CoreModule 各内核（八字/紫微/六爻/梅花/奇门/大六壬/八宅/九宫飞星/阳宅/黄历/签文解梦）
 *        包成「搜索框单一入口」可路由到的功能。搜索框输入 → 命中某功能的触发词 → 调对应内核 →
 *        输出自然语言结果。各功能触发词集中在此表（改触发词只改这里）。
 *
 * 路由约定：intent.js 先把核心意图（bazi/calendar/selection/almanac）识别掉；
 *        识别不到（intent='unknown'）时，analyzer.js 再调本表 match() 兜底 → 命中的功能才跑。
 *        所以本表 trigger 不与核心意图抢词，只补「核心词之外」的长尾玄学诉求。
 *
 * v3.2.0 裁剪：按用户白名单只保留 8 大类（八字命理/紫微斗数/六爻纳甲/奇门遁甲/大六壬/梅花易数/
 *        风水堪舆/解梦灵签），占星天文、太乙金口诀、数字命理、号码八星、姓名五格、测字相术、
 *        黄历择日、小术等算法与功能块已移除，本表不再收录。
 * v3.3.0 再裁：按用户「只留白名单这几类」要求，再移除 5 个非白名单功能块 —— 易经起卦（iching）、
 *        周易 64 卦查卦辞（zhouyi）、小成图（xiaocheng）、择日查吉日（zeri）、数字八字（name-shuzi），
 *        连同 zeri.js / xiaocheng.js / name-shuzi.js / iching-text.js 四个内核一并删除；
 *        **iching.js 保留**（梅花的时间起卦与六爻的干支换算仍用它，只是不再对外单独提供「起卦」入口）。
 *        现共 26 个功能块 / 5 大板块。
 *        UMD 头三段（Node require 列表 / PWA 全局列表 / factory 形参表）**必须逐项一一对应**，
 *        顺序错位会让形参拿到别的内核（历史上踩过：SHEN 拿到 liuren-duanyu、MID 拿到 huangli-duanyu，
 *        致黄历/紫微/六壬/梅花整片崩）。改动请一次只改一处并立刻跑 tools/features.test.js。
 *
 * 依赖（UMD 注入）：见下方 KERNELS 列表，共 27 个内核，与各功能块用到的形参一一对齐。
 * 加载：UMD —— 小程序被 require；浏览器挂到全局 NT.features。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // 这里可以放心用**同步 require**：本文件与下面这些内核**永远同包** ——
    //   · 小程序端：本文件与全部内核同处分包 `occupy-cores`（主包不直接引用本文件，
    //     所以不存在「主包静态 require 分包文件」这种非法引用，v3.1.37 那个崩溃根因从架构上消失）；
    //   · Node / uni-app：同处源码树，同步加载；
    //   · PWA：走下面 else 分支，取全局 NT.core.*（各内核由 <script> 依次挂载）。
    module.exports = factory(
      require('../CoreModule/iching.js'),
      require('../CoreModule/bazhai.js'),
      require('../CoreModule/lunar.js'),
      require('../CoreModule/bazi.js'),
      require('../CoreModule/ziwei.js'),
      require('../CoreModule/qimen.js'),
      require('../CoreModule/liuren.js'),
      require('../CoreModule/liuyao.js'),
      require('../CoreModule/yangzhai.js'),
      require('../CoreModule/qianwen.js'),
      require('../CoreModule/qimen-fei.js'),
      require('../CoreModule/bazi-pattern.js'),
      require('../CoreModule/qimen-ge.js'),
      require('../CoreModule/liuren-bifa.js'),
      require('../CoreModule/liuyao-wangshuai.js'),
      require('../CoreModule/ziwei-horoscope.js'),
      require('../CoreModule/bazi-shensha.js'),
      require('../CoreModule/ziwei-stars.js'),
      require('../CoreModule/qimen-ri.js'),
      require('../CoreModule/qimen-ke.js'),
      require('../CoreModule/qimen-nianyue.js'),
      require('../CoreModule/ziwei-duanyu.js'),
      require('../CoreModule/liuren-duanyu.js'),
      require('../CoreModule/meihua-duanyu.js'),
      require('../CoreModule/feixing.js'),
      require('../CoreModule/shensha.js'),
      require('../CoreModule/huangli-duanyu.js')
    );
  } else {
    root.NT = root.NT || {};
    root.NT.features = factory(
      root.NT.core && root.NT.core.iching,
      root.NT.core && root.NT.core.bazhai,
      root.NT.core && root.NT.core.lunar,
      root.NT.core && root.NT.core.bazi,
      root.NT.core && root.NT.core.ziwei,
      root.NT.core && root.NT.core.qimen,
      root.NT.core && root.NT.core.liuren,
      root.NT.core && root.NT.core.liuyao,
      root.NT.core && root.NT.core.yangzhai,
      root.NT.core && root.NT.core.qianwen,
      root.NT.core && root.NT.core.qimenFei,
      root.NT.core && root.NT.core.baziPattern,
      root.NT.core && root.NT.core.qimenGe,
      root.NT.core && root.NT.core.liurenBifa,
      root.NT.core && root.NT.core.liuyaoWangshuai,
      root.NT.core && root.NT.core.ziweiHoroscope,
      root.NT.core && root.NT.core.baziShensha,
      root.NT.core && root.NT.core.ziweiStars,
      root.NT.core && root.NT.core.qimenRi,
      root.NT.core && root.NT.core.qimenKe,
      root.NT.core && root.NT.core.qimenNianYue,
      root.NT.core && root.NT.core.ziweiDuanyu,
      root.NT.core && root.NT.core.liurenDuanyu,
      root.NT.core && root.NT.core.meihuaDuanyu,
      root.NT.core && root.NT.core.feixing,
      root.NT.core && root.NT.core.shensha,
      root.NT.core && root.NT.core.huangliDuanyu
    );
  }
})(typeof self !== 'undefined' ? self : this, function (ICE, BZH, CORE, BAZI, ZW, QM, LR, LY, YZ, QW, QF, BP, QG, LBF, LWS, ZHW, BSS, ZWS, QMR, QMK, QNY, ZWD, LID, MID, FEI, SHEN, HLD) {

  // 各内核以形参直接注入（v3.1.32 曾因分包拆成「工厂内可变变量」，v3.1.38 改整体分包后恢复形参；
  //   v3.2.0 再次要求 require 列表与形参表严格一一对应，见文件头说明）。

  // 十二地支序（大六壬天地盘/天将逐一列用）
  function ZHI2() { return ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']; }

  // 取文本里显式写的年份（流年/流月/流日的起点用）；没写就返回 0，由调用方决定默认值
  function pullYear(text) {
    var m = String(text || '').match(/(19|20)\d{2}/);
    return m ? +m[0] : 0;
  }

  // 取年份（用于紫微/八宅命卦；无则取当前年）
  function yearOf(ent, text) {
    if (ent && ent.date && ent.date.year) return ent.date.year;
    var m = String(text || '').match(/(19|20)\d{2}/);
    return m ? +m[0] : new Date().getFullYear();
  }
  function genderOf(ent) { return ent && ent.gender ? ent.gender : null; }
  function zhGender(ent) { var g = genderOf(ent); return g === 'female' ? '女' : g === 'male' ? '男' : null; }
  /**
   * 中文数字 → 阿拉伯数字（1–100，够签号 / 卦序用）。
   * 为什么不直接用上面那张表：死表必然漏字（「一百」「二十三」「三十六」全会漏），
   * 漏了就变成「查不出」而不是「查错了」，用户看不出问题在哪 —— 所以用规则算。
   */
  function numOf(s) {
    var d = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    var t = String(s || '').replace(/[第\s]/g, '').replace(/签|卦/g, '');
    if (/^\d+$/.test(t)) return +t;
    if (t === '百') return 100;
    var m = t.match(/^([一二两三四五六七八九])?百(?:零?([一二三四五六七八九]))?$/);
    if (m) return (m[1] ? d[m[1]] : 1) * 100 + (m[2] ? d[m[2]] : 0);
    m = t.match(/^([一二两三四五六七八九])?十([一二三四五六七八九])?$/);
    if (m) return (m[1] ? d[m[1]] : 1) * 10 + (m[2] ? d[m[2]] : 0);
    if (d[t] != null) return d[t];
    return 0;
  }

  /**
   * 功能定义表（单一真源）。顺序即 match() 优先级。
   *   触发词 = 搜索框命中即路由；run = 返回 { text } 或 { prompt }（缺料时追问）。
   */
  var FEATURES = [
    {
      key: 'bazi-chart', 名: '八字完整排盘',
      板块: '命理排盘', 短名: '排八字',
      触发词: ['排盘', '八字', '四柱', '命盘', '藏干', '十神', '用神', '喜用', '纳音', '批八字'],
      说明: '五虎遁起月干五鼠遁起时干排四柱藏干十神旺衰用神',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '八字排盘需要出生年月日，例如「白玖玖，女，2005年6月9日」（可含时辰）。' };
        var g = zhGender(ent);
        if (!g) return { prompt: '排盘需出生性别（男/女），请补充，例如「白玖玖，女，2005年6月9日子时」。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 14;
        var c = BAZI.chart({ y: y, m: m, d: d, h: h, gender: g, name: ent.name || '命主' });
        var P = c.pillars;
        var lines = ['【八字排盘】' + (ent.name || '命主') + '（' + g + '）' + y + '年' + m + '月' + d + '日' + h + '时，' + c.lunar.text + '。'];
        lines.push('四柱：年' + P.年.干支 + ' / 月' + P.月.干支 + ' / 日' + P.日.干支 + ' / 时' + P.时.干支 + '。');
        lines.push('藏干：年' + P.年.藏干.join('') + ' 月' + P.月.藏干.join('') + ' 日' + P.日.藏干.join('') + ' 时' + P.时.藏干.join('') + '。');
        lines.push('十神：年' + P.年.十神 + ' 月' + P.月.十神 + ' 时' + P.时.十神 + '（日主' + c.dayMaster.干 + '·' + c.dayMaster.五行 + '）。');
        // 十二长生逐柱（v3.1.36 对拍问真八字后补）：星运=日主在各柱地支的状态；自坐=各柱天干坐本地支的状态。
        //   口径 = 阴阳干分列、阳顺阴逆（八字）；与六壬「水土同宫」异说已在 CoreModule/bazi.js 注释留痕。
        var CS = (BAZI && BAZI.changSheng) ? BAZI.changSheng : function () { return ''; };
        lines.push('十二长生：星运 ' + [CS(c.dayMaster.干, P.年.支), CS(c.dayMaster.干, P.月.支), CS(c.dayMaster.干, P.日.支), CS(c.dayMaster.干, P.时.支)].join(' ')
          + '；自坐 ' + [CS(P.年.干, P.年.支), CS(P.月.干, P.月.支), CS(P.日.干, P.日.支), CS(P.时.干, P.时.支)].join(' ') + '（年/月/日/时）。');
        lines.push('纳音：' + c.纳音.年 + ' ' + c.纳音.月 + ' ' + c.纳音.日 + ' ' + c.纳音.时 + '；胎元' + c.胎元 + ' 命宫' + c.命宫 + ' 身宫' + c.身宫 + '。');
        // 地支关系（六合/六冲/六害/三合/相刑/暗合）。暗合 = 藏干之间的天干五合，隐而不显（5 源核对口径）。
        // 同一对支可能并存多种关系（如寅巳既相刑又相害），故用 relsOf 全列，不只回一个。
        if (BSS && typeof BSS.relsOf === 'function') {
          var POS = [['年', P.年.支], ['月', P.月.支], ['日', P.日.支], ['时', P.时.支]];
          var rels = [];
          for (var i = 0; i < POS.length; i++) {
            for (var j = i + 1; j < POS.length; j++) {
              (BSS.relsOf(POS[i][1], POS[j][1]) || []).forEach(function (r) {
                rels.push(POS[i][0] + POS[j][0] + POS[i][1] + POS[j][1] + r.关系 + (r.明细 || ''));
              });
            }
          }
          lines.push('地支关系：' + (rels.length ? rels.join('、') + '。' : '四支之间无六合、六冲、六害、三合、相刑或暗合。'));
        }
        lines.push('五行：' + Object.keys(c.五行.统计).map(function (k) { return k + c.五行.统计[k]; }).join(' / ') + '，' + c.五行.缺文本 + '。');
        lines.push('旺衰：' + c.旺衰.判 + '（' + c.旺衰.加权分 + '分，得令' + (c.旺衰.得令 ? '是' : '否') + ' 得地' + c.旺衰.得地 + ' 得势' + c.旺衰.得势 + '）；用神' + c.旺衰.用神.第一用神 + '、喜' + c.旺衰.用神.喜神 + '、忌' + c.旺衰.用神.忌神 + '。');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'dayun', 名: '八字运程（大运·小运·流年流月流日）',
      板块: '命理排盘', 短名: '排运程',
      触发词: ['大运', '流年', '走运', '运程', '起运', '小运', '行年', '流月', '流日', '排运程'],
      说明: '阳男阴女顺排阴男阳女逆排起运叠小运流年流月流日',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '推运程需要出生年月日，例如「1990年8月1日」。' };
        var g = zhGender(ent);
        if (!g) return { prompt: '推运程需出生性别（男/女，定顺逆），请补充。' };
        var t = String(text || '');
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 14;
        var c = BAZI.chart({ y: y, m: m, d: d, h: h, gender: g, name: ent.name || '命主' });
        var dm = c.dayMaster.干, P = c.pillars;
        var dy = c.大运;
        var lines = ['【八字运程】' + P.年.干支 + '年 ' + P.月.干支 + '月 ' + P.日.干支 + '日 ' + P.时.干支 + '时，日主' + dm + '（' + c.dayMaster.五行 + '），' + g + '命，' + dy.顺逆 + '，' + dy.起运 + '。'];
        lines.push('大运：' + (dy.列表.length ? dy.列表.map(function (x) { return x.年龄 + '岁『' + x.干支 + '』（' + x.开始年 + '起）'; }).join('、') : '（未推出，请核对生辰）') + '。');
        // 小运（起运前逐年）：传统只用起运前，这里给前 12 位，并明说是哪一端起的
        if (BAZI.xiaoyun) {
          var xy = BAZI.xiaoyun(c._ec, g, 12);
          if (xy.列表.length) {
            lines.push('小运（自时柱『' + xy.起点 + '』' + xy.顺逆 + '，一位一年）：' + xy.列表.map(function (x) { return x.年龄 + '岁『' + x.干支 + '』'; }).join('、') + '。');
          }
        }
        // 流年：默认从今年起十年；文本里显式写了「流年/流月/流日 + 年份」则以该年为首
        // 注意别把生辰那一年当流年起点（问「大运 1990年8月15日」时 1990 是生日，不是流年）
        var py = pullYear(t);
        var y0 = (py && (py !== y || /流年|流月|流日/.test(t))) ? py : new Date().getFullYear();
        var ln = [];
        for (var i = 0; i < 10; i++) {
          var yy = y0 + i, gz = BAZI.GANZHI60[((yy - 4) % 60 + 60) % 60];
          ln.push(yy + '『' + gz + '』' + (BAZI.shishen(dm, gz.charAt(0)) ? '（' + BAZI.shishen(dm, gz.charAt(0)) + '）' : ''));
        }
        lines.push('流年（' + y0 + ' 起十年，年干支 + 对日主的十神）：' + ln.join('、') + '。');
        // 流月：问「流月」才铺十二个月，否则不占地
        if (/流月|每月|月运|逐月/.test(t) && BAZI.liuyue) {
          var lm = BAZI.liuyue(y0, dm);
          if (!lm.err) {
            lines.push('流月（' + y0 + '，按节气月，起于交节当日）：' + lm.月.map(function (x) { return x.月支 + '月（' + x.节 + ' ' + x.起 + '）『' + x.干支 + '』' + (x.十神 ? '（' + x.十神 + '）' : ''); }).join('、') + '。');
          }
        }
        // 流日：问「流日」给逐日干支，默认从出生日往后 30 天；文本带日期则从该日起
        if (/流日|每日|日运|逐日/.test(t) && BAZI.liuri) {
          var sy = pullYear(t) || y, sm = (ent.date && ent.date.month) || m, sd = (ent.date && ent.date.day) || d;
          var mm2 = t.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
          if (mm2) { sm = +mm2[1]; sd = +mm2[2]; }
          var lr = BAZI.liuri(sy, sm, sd, 30, dm);
          lines.push('流日（' + lr.起 + ' 起 30 天，日干支 + 对日主的十神）：' + lr.日.map(function (x) { return x.日期.slice(5) + '『' + x.干支 + '』' + (x.十神 ? '（' + x.十神 + '）' : ''); }).join('、') + '。');
        }
        lines.push('口径：大运起于月柱、小运起于时柱（醉醒子法，「男起丙寅/女起壬申」的古人法未采用），一位一年、以立春换柱；流月按节气月由底座的五虎遁换算，流日按日柱顺排。');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'feixing', 名: '九宫飞星（年·月·时）',
      板块: '风水堪舆', 短名: '排飞星',
      触发词: ['飞星', '九宫飞星', '紫微飞星', '飞星紫微', '入中星', '紫白', '玄空', '运程飞星', '月飞星', '时飞星', '日飞星'],
      说明: '年月日时紫白入中顺飞九宫年盘最有力月日时递减',
      run: function (ent, text) {
        var y = yearOf(ent, text);
        var m = ent && ent.date && ent.date.month ? ent.date.month : 1;
        var d = ent && ent.date && ent.date.day ? ent.date.day : 1;
        var h = ent && ent.time ? ent.time.hour : 14;
        var t = String(text || '');
        var wantMonth = t.indexOf('月飞星') >= 0 || t.indexOf('月紫白') >= 0 || t.indexOf('月盘') >= 0;
        var wantHour = t.indexOf('时飞星') >= 0 || t.indexOf('时紫白') >= 0 || t.indexOf('时辰') >= 0;
        var wantDay = t.indexOf('日飞星') >= 0 || t.indexOf('日紫白') >= 0;

        var lines = [];
        // 年飞星（默认必出）
        var yr = FEI.yearChart(y);
        lines.push('【九宫飞星】' + y + ' 年·' + y + '/' + m + '/' + d + ' ' + h + '时：');
        lines.push('年紫白：入中「' + yr.入中星名 + '」，' + yr.运.说明 + '；九宫 ' + Object.keys(yr.盘).map(function (g) { return '宫' + g + '=' + yr.盘[g].星; }).join(' ') + '。');

        // 取年支 / 日支 / 农历月（走 C01 历法内核）
        var gz = CORE.fromSolar(y, m, d, h);
        var yearZhi = gz.ganzhi.年.支, dayZhi = gz.ganzhi.日.支;
        var lunarMonth = Math.abs(gz._raw.getMonth());

        // 月飞星
        if (wantMonth) {
          var mo = FEI.monthChart(yearZhi, lunarMonth);
          lines.push('月紫白（' + lunarMonth + '月）：入中「' + mo.入中星名 + '」，九宫 ' + Object.keys(mo.盘).map(function (g) { return '宫' + g + '=' + mo.盘[g].星; }).join(' ') + '。');
        }
        // 时飞星（冬至后顺 / 夏至后逆：复用 C09 日紫白锚点精确判定当天顺/逆，不用月份近似）
        if (wantHour) {
          var winter = true;
          var dAnchor = FEI.dayChart(y, m, d);
          if (dAnchor && !dAnchor.err) winter = dAnchor.顺; // 顺=冬至后段（冬），逆=夏至后段（夏）
          var hr = FEI.hourChart(dayZhi, Math.floor(((h + 1) % 24) / 2), winter);
          lines.push('时紫白（' + dayZhi + '日 ' + (winter ? '冬顺' : '夏逆') + '）：入中「' + hr.入中星名 + '」，九宫 ' + Object.keys(hr.盘).map(function (g) { return '宫' + g + '=' + hr.盘[g].星; }).join(' ') + '。');
        }
        // 日飞星（玄空日紫白：节气锚点 + 甲子日计数，C02 精确交节日，6 段铁点已验）
        if (wantDay) {
          var dy = FEI.dayChart(y, m, d);
          if (dy.err) lines.push('日紫白：' + dy.err + '。');
          else lines.push('日紫白（' + dy.节气 + (dy.顺 ? '·顺' : '·逆') + '，自甲子日' + (dy.起星日 ? dy.起星日.y + '/' + dy.起星日.m + '/' + dy.起星日.d : '') + '）：入中「' + dy.入中星名 + '」，九宫 ' + Object.keys(dy.盘).map(function (g) { return '宫' + g + '=' + dy.盘[g].星; }).join(' ') + '。');
        }
        lines.push('（效力：年 > 月 > 日时；年盘最有力，月盘可参考，日时仅在特殊格局看。）');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'ziwei', 名: '紫微斗数',
      板块: '命理排盘', 短名: '排紫微',
      触发词: ['紫微斗数', '紫微排盘', '斗数', '排紫微', '紫微盘', '紫微星情', '紫微'],
      说明: '农历生辰安星法排十二宫中州派四化星情配古籍断语',
      run: function (ent, text) {
        var y = yearOf(ent, text);
        var m = ent && ent.date && ent.date.month ? ent.date.month : 1;
        var d = ent && ent.date && ent.date.day ? ent.date.day : 1;
        var h = ent && ent.time ? ent.time.hour : 14;
        var g = ent && ent.gender ? (ent.gender === 'female' ? '女' : '男') : null;
        if (!g) return { prompt: '紫微斗数需出生性别（定阴阳顺逆/大限），请补「男」或「女」。' };
        if (!ZW || !ZW.chart) return { prompt: '紫微引擎（iztro）未加载，无法排盘。' };
        var c = ZW.chart({ y: y, m: m, d: d, h: h, gender: g });
        if (c.err) return { text: '【紫微斗数】' + c.err };
        var lines = [];
        lines.push('【紫微斗数】' + y + '年' + m + '月' + d + '日' + h + '时（' + g + '）：命主星「' + c.命主星 + '」坐' + c.命宫地支 + '宫，身主星「' + c.身主星 + '」坐' + c.身宫地支 + '宫，' + c.五行局 + '。');
        lines.push('命宫（' + c.命宫.干支 + '）主星' + starPhrase(c.命宫.主星) + (c.命宫.辅星 ? '，辅星 ' + c.命宫.辅星 : '') + (c.命宫.四化 && c.命宫.四化.length ? '，四化 ' + (Array.isArray(c.命宫.四化) ? c.命宫.四化.join('、') : c.命宫.四化) : '') + '。');
        lines.push('身宫（' + c.身宫.干支 + '）主星' + starPhrase(c.身宫.主星) + '。');
        lines.push('十二宫：' + c.十二宫.map(function (p) { return p.宫 + (p.主星.length ? '「' + p.主星.join('/') + '」' : '（空）'); }).join(' '));
        lines.push('大限（命宫）：' + c.大限.命宫起限.join('、') + '。');
        // 星情与宫义（v3.1.13）：安星只给「哪颗星在哪」，这里补「这颗星什么脾气」
        if (ZWS && ZWS.line14) {
          var P = {};
          c.十二宫.forEach(function (p) { P[p.宫] = p; });
          var 命主 = c.命宫.主星 === '（空宫）' ? [] : c.命宫.主星.split('、');
          // 借星安宫：命宫无主星时借对宫（迁移）主星看（紫微斗数通例）
          var 借 = '';
          if (!命主.length) {
            var 迁 = P['迁移'];
            if (迁 && 迁.主星.length) { 借 = 迁.主星.join('、'); 命主 = 迁.主星.slice(); }
            lines.push('命宫空宫（无主星），依「借星安宫」借对宫迁移的「' + (借 || '空') + '」看命。');
          }
          var shown = {}, 星情行 = [];
          for (var si = 0; si < 命主.length; si++) {
            var l14 = ZWS.line14(命主[si]);
            if (l14) { 星情行.push(l14); shown[命主[si]] = 1; }
          }
          if (星情行.length) {
            lines.push('星情·' + (借 ? '借（取迁移宫）' : '命宫') + '：' + 星情行.join('；') + '。');
          }
          // 三方四正（财帛·官禄·迁移）：只并排短句，已在上行讲过的星不重复
          var trio = ['财帛', '官禄', '迁移'], tb = [];
          trio.forEach(function (g) {
            var p = P[g];
            if (!p || !p.主星.length) { tb.push(g + '（空宫）'); return; }
            p.主星.forEach(function (nm) {
              if (shown[nm]) return;
              var b = ZWS.brief14(nm); if (b) { tb.push(b); shown[nm] = 1; }
            });
          });
          if (tb.length) lines.push('三方四正：' + tb.join('；') + '。');
          // 命宫辅星（辅星是「加了什么料」，与主星分开讲）
          if (c.命宫.辅星) {
            var mn = c.命宫.辅星.split('、').map(function (nm) { return ZWS.lineMinor(nm) || (nm + '（星情未收录）'); });
            lines.push('命宫辅星：' + mn.join('；') + '。');
          }
          // 落宫断语（v3.1.46）：**优先取断语库**（ziwei-duanyu：古籍要点 + 白话），无则回落机械合成。
          //   有古籍明文者「『原文』+ 白话」并列展示（遵项目铁律：原文必配白话）；无明文者标「推演」。
          var comb = [];
          ['命宫', '财帛', '官禄'].forEach(function (g) {
            var p = P[g];
            if (!p) return;
            var arr = (g === '命宫' && !p.主星.length && 借) ? 借.split('、') : p.主星;
            arr.forEach(function (nm) {
              var dy = (ZWD && ZWD.duanyuOf) ? ZWD.duanyuOf(nm, g) : null;
              if (dy) {
                comb.push(nm + '坐' + g + '：' + (dy.原文 ? '『' + dy.原文 + '』' + dy.白 + '（古籍）' : dy.白 + '（推演）'));
              } else {
                var x = ZWS.comb(nm, g); if (x) comb.push(x);
              }
            });
          });
          if (comb.length) lines.push('落宫断语：' + comb.join('；') + '。');
          // 生年四化落宫解读（v3.1.46）：把十二宫里各星四化收齐，逐条给「落何宫、主何事」。
          if (ZWD && ZWD.SIHUA_TEXT) {
            var shi = [];
            c.十二宫.forEach(function (p) {
              (p.四化项 || []).forEach(function (it) {
                shi.push(it.星 + '化' + it.化 + '入' + p.宫 + '宫（' + ZWD.SIHUA_TEXT[it.化] + '）');
              });
            });
            if (shi.length) lines.push('四化解读：' + shi.join(' ') + '。');
          }
          // 格局初判（v3.1.46）：命宫 + 三方四正主星组合与格局条件做匹配（初判，非精确判定）。
          if (ZWD && ZWD.GEJU) {
            var pool = {};
            ['命宫', '财帛', '官禄', '迁移'].forEach(function (g) {
              var p = P[g]; if (!p) return;
              var arr = (g === '命宫' && !p.主星.length && 借) ? 借.split('、') : p.主星;
              arr.forEach(function (nm) { pool[nm] = 1; });
            });
            // 命盘已出现的星（命宫 + 三方四正），用于格局命中的「必备星」核对
            var ALL = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门',
              '天相', '天梁', '七杀', '破军', '左辅', '右弼', '文昌', '文曲', '天魁', '天钺',
              '擎羊', '陀罗', '火星', '铃星', '地空', '地劫', '禄存', '天马'];
            var hits = [];
            ZWD.GEJU.forEach(function (gj) {
              // 取格局条件里提到的星名，**要求全部命中**才算成立（避免只命中一两颗就误报）
              var req = ALL.filter(function (s) { return gj.条件.indexOf(s) >= 0; });
              if (req.length >= 2 && req.every(function (s) { return pool[s]; })) hits.push(gj);
            });
            if (hits.length) {
              lines.push('格局初判：' + hits.map(function (gj) { return gj.名 + '（' + gj.吉凶 + '）' + gj.断; }).join(' ') + '。');
            }
          }
          lines.push('断语口径：落宫断语优先取《紫微斗数全书》诸星问答论等古籍要点（有明文者「原文+白话」并列），古籍无逐条明文者按星性×宫义推演并标「推演」；四化依 iztro 年干四化落宫；格局为「命宫+三方四正主星组合」初判，仅供参详，非精确格局判定。');
        }
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'meihua', 名: '梅花易数（时间起卦）',
      板块: '三式推演', 短名: '排梅花',
      触发词: ['梅花易数', '梅花', '时间起卦', '物数起卦', '邵康节', '先天卦'],
      说明: '年支加月日时取余成卦体用互变配八卦类象断一事',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '梅花时间起卦需要完整年月日，例如「1990年8月1日」（可含时辰）。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 14;
        var lu = CORE.fromSolar(y, m, d, h);
        var SXO = { 鼠: 1, 牛: 2, 虎: 3, 兔: 4, 龙: 5, 蛇: 6, 马: 7, 羊: 8, 猴: 9, 鸡: 10, 狗: 11, 猪: 12 };
        var nY = SXO[lu.ganzhi.年.生肖] || 1, nM = m, nD = d;
        var nH = Math.floor(((((h % 24) + 24) % 24) + 1) / 2) + 1;
        var sh = (nY + nM + nD) % 8; if (sh === 0) sh = 8;            // 上卦
        var x = (nY + nM + nD + nH) % 8; if (x === 0) x = 8;          // 下卦
        var dy = (nY + nM + nD + nH) % 6; if (dy === 0) dy = 6;      // 动爻位（初爻=1…上爻=6）
        // 本卦 6 爻 = 下卦三爻 + 上卦三爻；动爻在体用判定时 dongYi=dy-1（<3 → 下卦动，体在上）
        var yao = ICE.BAGUA[x].爻.concat(ICE.BAGUA[sh].爻);
        var ben = ICE.fromYao(yao), hu = ICE.huGua(yao);
        var ty = ICE.tiyong(yao, dy - 1);
        var lines = ['【梅花易数】' + lu.lunar.text + '（' + y + '-' + m + '-' + d + ' ' + h + '时）起卦：'];
        lines.push('上卦「' + ICE.BAGUA[sh].名 + '」下卦「' + ICE.BAGUA[x].名 + '」→ 本卦「' + (ben.卦名 || ICE.hexName(ICE.BAGUA[sh].名, ICE.BAGUA[x].名)) + '」，互卦「' + ICE.hexName(ICE.BAGUA[hu.上卦].名, ICE.BAGUA[hu.下卦].名) + '」。');
        lines.push('动爻：第 ' + dy + ' 爻动。');
        lines.push('体用：体「' + ty.体卦 + '」用「' + ty.用卦 + '」，' + ty.关系 + '（体' + ty.体五 + ' / 用' + ty.用五 + '）→ ' + ty.吉凶 + '。');
        // 解卦层（v3.1.49 新增，meihua-duanyu）：此前只有「用克体→凶」一句，没有可读断语
        if (MID && MID.TIYONG) {
          var tyd = MID.tiYongOf(ty.关系);
          if (tyd) lines.push('体用断语：' + tyd);
          var 本卦名 = ben.卦名 || ICE.hexName(ICE.BAGUA[sh].名, ICE.BAGUA[x].名);
          // GUA64 键是单字卦名（如「蹇」），而本卦名是「水山蹇」式 → 依次试：原名 / 去前两字 / 末两字
          var gd = MID.guaOf(本卦名)
            || MID.guaOf(本卦名.replace(/^../, ''))
            || MID.guaOf(本卦名.slice(-2));
          if (gd) lines.push('本卦断语：' + gd);
          var xt = MID.xiangOf(ty.体卦), xu = MID.xiangOf(ty.用卦);
          if (xt || xu) lines.push('八卦类象：' + (xt || '') + (xu ? '；' + xu : ''));
          lines.push('梅花口径：体用/卦象/类象取《梅花易数》通行断法，单点参考，仍须结合互变与应期综合断。');
        }
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'bazhai', 名: '八宅命卦',
      板块: '风水堪舆', 短名: '查命卦',
      触发词: ['八宅', '命卦', '东四命', '西四命', '婚配命卦'],
      说明: '按出生年性别推命卦大游年八星定方位吉凶与婚配',
      run: function (ent, text) {
        var y = yearOf(ent, text);
        var g = genderOf(ent);
        var gStr = g === 'female' ? '女' : g === 'male' ? '男' : null;
        if (!gStr) return { prompt: '八宅命卦需出生性别，请补「男」或「女」。' };
        var r = BZH.mingGua(y, gStr);
        var lines = ['【八宅命卦】' + y + ' 年（' + gStr + '）：本命卦「' + r.卦 + '」（' + r.方位 + '），' + r.东西命 + '。'];
        var you = BZH.younian(r.卦);
        if (you) lines.push('大游年八星落宫：' + ['生气', '天医', '延年', '伏位', '六煞', '祸害', '五鬼', '绝命'].map(function (s) { return s + '=' + you[s]; }).join(' ') + '。');
        return { text: lines.join('\n') };
      }
    },
    {
      key: 'fengshui', 名: '八宅风水（八等婚·坐向）',
      板块: '风水堪舆', 短名: '解八等婚',
      触发词: ['八等婚', '八宅婚', '八宅合婚', '宅婚', '坐向', '宅卦', '东四西四', '大游年'],
      说明: '两人命卦推八等婚等级坐向大游年八星定宅向吉凶',
      run: function (ent, text) {
        var t = String(text || '');
        // ① 坐向（「坐北朝南」「坐北」等）
        var zuo = t.match(/坐(北|南|东|西|东北|东南|西北|西南)/);
        if (zuo) {
          var g = BZH.zhaiGua('坐' + zuo[1]);
          var you = g ? BZH.younian(g) : null;
          var lines = ['【八宅坐向】' + zuo[0] + ' → 宅卦「' + (g || '未识别') + '」。'];
          if (you) lines.push('大游年八星（吉）：生气宫' + you.生气 + '、天医宫' + you.天医 + '、延年宫' + you.延年 + '；（凶）五鬼' + you.五鬼 + '、六煞' + you.六煞 + '、祸害' + you.祸害 + '、绝命' + you.绝命 + '。');
          return { text: lines.join('\n') };
        }
        // ② 八等婚合婚（需两造命卦；给两个年份 + 性别，或直接给「东四命/西四命 + 卦名」）
        var years = (t.match(/(19|20)\d{2}/g) || []).map(function (x) { return +x; });
        var genders = (t.match(/男|女/g) || []);
        if (years.length >= 2 && genders.length >= 2) {
          var ga = BZH.mingGua(years[0], genders[0] === '女' ? 'female' : 'male').卦;
          var gb = BZH.mingGua(years[1], genders[1] === '女' ? 'female' : 'male').卦;
          var h = BZH.hehun(ga, gb);
          var lines2 = ['【八宅合婚】' + years[0] + '年（' + genders[0] + '，' + ga + '卦）× ' + years[1] + '年（' + genders[1] + '，' + gb + '卦）：'];
          lines2.push('第 ' + h.等 + ' 等「' + h.名 + '」（' + h.关系星 + '），' + h.说明 + '。');
          return { text: lines2.join('\n') };
        }
        return { prompt: '八宅合婚请给「两个出生年 + 性别」（如「1990男 1992女 八等婚」）；或给坐向（如「坐北 坐向」）。' };
      }
    },
    {
      key: 'qimen', 名: '奇门遁甲（时家转盘·拆补）',
      板块: '三式推演', 短名: '排奇门',
      触发词: ['奇门', '奇门遁甲', '遁甲', '值符', '值使', '阴遁', '阳遁', '转盘法', '拆补法', '九星八门'],
      说明: '节气定阴阳遁拆补置局转盘排三奇六仪九星八门八神',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '奇门遁甲需要起局年月日，例如「1990年8月15日」（尽量给到时辰，时家奇门以时辰起局）。' };
        // 家数守门：本块只有时家。问「日家/刻家」已各有内核，必须指过去（否则用户会把时家属局当那家局用，那是错盘）。
        // 「年家/月家」仍未实现，如实说清，不拿时家属局冒充。
        // 家数守门：本块只有时家。问「日家/刻家/年家/月家」都已各有内核，必须指过去（否则用户会把时家属局当那家局用，那是错盘）。
        var famM = String(text || '').match(/(年家|月家|日家|刻家)/);
        var famWarn = famM ? (famM[1] === '日家'
          ? '⚠️ 你问的是「日家奇门」，它另有一套内核（以日为单位、值符随日干、六十日一局），与时家不同。下面给的是**同一日的时家局**，只能当参考。日家局请直接说「日家奇门 ' + ent.date.year + '年' + (ent.date.month || 1) + '月' + (ent.date.day || 1) + '日」。'
          : famM[1] === '刻家'
            ? '⚠️ 你问的是「刻家奇门」，它另有一套内核（十二分钟一刻、只在时家局内推、每刻移一宫），与时家不同。下面给的是**本时辰的时家局**。刻家局请直接说「刻家奇门 ' + ent.date.year + '年' + (ent.date.month || 1) + '月' + (ent.date.day || 1) + '日' + (ent.time ? ent.time.hour : 10) + '时' + (ent.time && ent.time.minute != null ? ent.time.minute : 24) + '分」。'
            : '⚠️ 你问的是「' + famM[1] + '奇门」，它另有一套内核（全阴遁、三元局数 1/4/7、值符随干、值使随支），与时家不同。下面给的是**同一时刻的时家局**，只能当参考。' + famM[1] + '局请直接说「' + famM[1] + '奇门 ' + ent.date.year + '年' + (ent.date.month || 1) + '月」。') : null;
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 0;
        if (!QM || !QM.chart) return { text: '【奇门】奇门内核未加载，暂不可用。' };
        try {
          var c = QM.chart({ y: y, m: m, d: d, h: h });
          if (c.err) return { prompt: c.err };
          var L = [];
          if (famWarn) L.push(famWarn);
          L.push('【奇门遁甲】' + y + '年' + m + '月' + d + '日' + h + '时（时家·转盘·拆补）：');
          L.push('四柱 ' + c.四柱.年 + ' ' + c.四柱.月 + ' ' + c.四柱.日 + ' ' + c.四柱.时 + '；' + c.阴阳遁 + c.局数 + '局（' + c.节气 + c.元 + '元），旬首' + c.旬首 + '，值符「' + c.值符星 + '」、值使「' + c.值使门 + '」。');
          var GONG = [1, 8, 3, 4, 9, 2, 7, 6]; // 洛书地理顺时针环（展示顺序）
          L.push('地盘布仪：' + GONG.map(function (p) { return '宫' + p + c.地盘[p]; }).join(' ') + '（中五寄坤二）；');
          L.push('天盘九星：' + GONG.map(function (p) { return '宫' + p + c.天盘[p]; }).join(' ') + '；');
          L.push('人盘八门：' + GONG.map(function (p) { return '宫' + p + c.八门[p]; }).join(' ') + '；');
          L.push('神盘八神：' + GONG.map(function (p) { return '宫' + p + c.八神[p]; }).join(' '));
          L.push('（飞布九星/八门/八神逐宫落位已按 qimen.pro 黄金盘锁定；' + c._飞布验证 + ' 吉凶格另判。）');
          return { text: L.join('\n') };
        } catch (e) {
          return { text: '【奇门】排局失败：' + String(e && e.message ? e.message : e) + '（内核暂不可用，不影响其他功能）。' };
        }
      }
    },
    {
      key: 'qimen-ri', 名: '奇门遁甲·日家（六十日一局·值符随日干）',
      板块: '三式推演', 短名: '排日家',
      触发词: ['日家奇门', '日家', '日奇门', '日家遁甲', '日家局', '每日奇门', '今天的奇门局'],
      说明: '六十甲子日定局值符随日干转盘排九星八门八神',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '日家奇门需要日期，例如「日家奇门 2026年2月9日」。日家以日为单元，不需时辰。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1;
        if (!QMR || !QMR.chart) return { text: '【日家奇门】内核未加载，暂不可用。' };
        try {
          // 口径可选：说「节气分元」走派B，默认走派A（甲子日数元）
          var 用节气 = /节气分元|按节气|节气派/.test(String(text || ''));
          var c = QMR.chart({ y: y, m: m, d: d, 口径: 用节气 ? '节气' : '甲子' });
          if (c.err) return { prompt: c.err };
          var GONG = [1, 8, 3, 4, 9, 2, 7, 6]; // 洛书地理顺时针环（展示顺序）
          var L = [];
          L.push('【日家奇门】' + c.日期 + '（日柱 ' + c.日柱 + '）：');
          L.push('日家以日为单元，六十日一局、一百八十日走完三元。本日' + c.阴阳遁 + c.元 + c.局数 + '局（' + c.定局口径 + '），' + c.段起点 + '起算。');
          // 两派并列：不替用户选，把分歧摆明
          var pa = c.甲子派, pb = c.节气派;
          var two = [];
          two.push('甲子日数元 → ' + (pa ? (pa.元 + pa.局数 + '局，起算甲子日 ' + pa.起算甲子日 + '、已过 ' + pa.距起算天数 + ' 日') : '本日不可判'));
          two.push('节气分元 → ' + (pb ? (pb.元 + pb.局数 + '局，本日属' + pb.节气) : '本日不可判'));
          L.push('定元两派并列：' + two.join('。') + '。');
          if (pa && pb && pa.局数 !== pb.局数) {
            L.push('⚠️ 两派本日局数不同（' + pa.局数 + '局 vs ' + pb.局数 + '局），属流派分歧而非算错，用哪个口径请自行认定。');
          }
          L.push('旬首 ' + c.旬首 + '，旬首仪「' + c.旬首仪 + '」落宫' + c.旬首宫 + '，值符「' + c.值符星 + '」、值使「' + c.值使门 + '」门。');
          L.push('值符随日干：日干「' + c.日干 + '」在地盘宫' + c.日干宫 + '，故值符星落此宫。');
          L.push('值使随日干位次：日干在旬中第 ' + c.日干位次 + ' 位，值使门自本宫' + c.值使本宫 + '起' + (c.阴阳遁 === '阳遁' ? '顺' : '逆') + '数，落宫' + c.值使落宫 + '。');
          L.push('地盘布仪：' + GONG.map(function (p) { return '宫' + p + c.地盘[p]; }).join(' ') + '（中五' + c.地盘[5] + '，寄坤二）。');
          L.push('天盘九星：' + GONG.map(function (p) { return '宫' + p + c.天盘[p]; }).join(' ') + '。');
          L.push('人盘八门：' + GONG.map(function (p) { return '宫' + p + c.八门[p]; }).join(' ') + '。');
          L.push('神盘八神：' + GONG.map(function (p) { return '宫' + p + c.八神[p]; }).join(' ') + '。');
          var gan = GONG.map(function (p) {
            var g = c.天盘干[p];
            if (c.禽宫 === p && c.禽干) g = g + c.禽干;  // 天禽随天芮同宫，该宫两干
            return '宫' + p + g;
          });
          L.push('天盘干：' + gan.join(' ') + '（天禽随天芮同落宫' + c.禽宫 + '，故该宫并见' + c.天盘干[c.禽宫] + c.禽干 + '）。');
          L.push('与时家的区别：时家锚时干时支、日家锚日干与日干位次，两者不是同一张盘，不能互相顶替。');
          L.push('缺口（如实标注）：' + c.缺口.join(''));
          return { text: L.join('\n') };
        } catch (e) {
          return { text: '【日家奇门】排局失败：' + String(e && e.message ? e.message : e) + '（内核暂不可用，不影响其他功能）。' };
        }
      }
    },
    {
      key: 'qimen-ke', 名: '奇门遁甲·刻家（十二分钟一刻·时家局内推）',
      板块: '三式推演', 短名: '排刻家',
      触发词: ['刻家奇门', '刻家', '刻奇门', '刻家遁甲', '刻家局', '刻盘'],
      说明: '十二分钟为一刻时家局内每刻移一宫逐刻排盘',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '刻家奇门需要年月日与时刻，例如「刻家奇门 2026年2月9日10时24分」（要精确到分才定得出第几刻）。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1;
        var h = ent.time ? ent.time.hour : null;
        var min = ent.time && ent.time.minute != null ? ent.time.minute : null;
        if (h == null) return { prompt: '刻家奇门要精确到「时」与「分」，例如「刻家奇门 2026年2月9日10时24分」。' };
        if (!QMK || !QMK.chart) return { text: '【刻家奇门】内核未加载，暂不可用。' };
        try {
          var c = QMK.chart({ y: y, m: m, d: d, h: h, min: min });
          if (c.err) return { prompt: c.err };
          var GONG = [1, 8, 3, 4, 9, 2, 7, 6];
          var L = [];
          L.push('【刻家奇门】' + c.时刻 + '（本时辰 ' + c.四柱.时 + '，第 ' + c.第几刻 + ' 刻 → ' + c.刻柱 + '）：');
          L.push('刻家以十二分钟为一刻、一时辰十刻，只在时家局内推：初刻局数与地盘恒等于本时辰的时家局，此后每刻' + (c.阴阳遁 === '阳遁' ? '阳进一宫' : '阴退一宫') + '。');
          L.push('本日' + c.阴阳遁 + '，时家' + c.时家局数 + '局。本刻已移 ' + c.移宫 + ' 宫 → 刻' + c.刻局数 + '局。');
          if (!c.有分钟) L.push('（未给分钟，按该钟点折算刻序；要初刻请给时辰起点小时。）');
          L.push('旬首 ' + c.旬首 + '，旬首仪「' + c.旬首仪 + '」落宫' + c.旬首宫 + '，值符「' + c.值符星 + '」、值使「' + c.值使门 + '」门。');
          L.push('刻干「' + c.刻干 + '」' + (c.刻干阳 ? '属阳干，八门顺行' : '属阴干，八门逆行') + '（此条单源待验，见缺口）。');
          L.push('地盘布仪：' + GONG.map(function (p) { return '宫' + p + c.地盘[p]; }).join(' ') + '（中五' + c.地盘[5] + '，寄坤二）。');
          L.push('天盘九星：' + GONG.map(function (p) { return '宫' + p + c.天盘[p]; }).join(' ') + '。');
          L.push('人盘八门：' + GONG.map(function (p) { return '宫' + p + c.八门[p]; }).join(' ') + '。');
          L.push('神盘八神：' + GONG.map(function (p) { return '宫' + p + c.八神[p]; }).join(' ') + '。');
          var gan = GONG.map(function (p) {
            var g = c.天盘干[p];
            if (c.禽宫 === p && c.禽干) g = g + c.禽干;
            return '宫' + p + g;
          });
          L.push('天盘干：' + gan.join(' ') + '（天禽随天芮同落宫' + c.禽宫 + '，故该宫并见' + c.天盘干[c.禽宫] + c.禽干 + '）。');
          L.push('本时辰十刻一览：' + c.十刻一览.map(function (x) { return (x.当前 ? '【' : '') + x.刻 + '刻' + x.刻柱 + '=' + x.局数 + '局' + (x.当前 ? '】' : ''); }).join(' '));
          L.push('与时家的区别：刻家只在时家局内推、每刻移一宫，两者不是同一张盘。');
          L.push('缺口（如实标注）：' + c.缺口.join(''));
          return { text: L.join('\n') };
        } catch (e) {
          return { text: '【刻家奇门】排局失败：' + String(e && e.message ? e.message : e) + '（内核暂不可用，不影响其他功能）。' };
        }
      }
    },
    {
      key: 'qimen-bj', 名: '奇门遁甲·宝鉴日奇门（日支定局·九星八门日移）',
      板块: '三式推演', 短名: '排宝鉴日奇',
      触发词: ['宝鉴日奇门', '日支定局', '日支奇门', '宝鉴日奇', '奇门宝鉴日奇门'],
      说明: '日支定局九星日移一位八门三日一宫不入中五',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '宝鉴日奇门需要日期，例如「宝鉴日奇门 2026年2月19日」。以日为单位，不需时辰。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1;
        if (!QMR || !QMR.bjJian) return { text: '【宝鉴日奇门】内核未加载，暂不可用。' };
        try {
          var c = QMR.bjJian({ y: y, m: m, d: d });
          if (c.err) return { prompt: c.err };
          var GONG = [1, 8, 3, 4, 9, 2, 7, 6]; // 洛书地理顺时针环（展示顺序）
          var L = [];
          L.push('【宝鉴日奇门】' + c.日期 + '（日柱 ' + c.日柱 + '）：');
          L.push(c.名 + '：' + c.定局依据 + '，' + c.节气界 + '用' + c.阴阳遁 + '（局数固定由日支定，阴阳遁只改顺逆）。');
          L.push('锚定：' + c.甲子锚日 + '为甲子日（日差 ' + c.日差 + ' 日），九星自艮八每日顺移一位、八门自坎一每三日顺转一宫。');
          L.push('地盘布仪：' + GONG.map(function (p) { return '宫' + p + c.地盘[p]; }).join(' ') + '（中五' + c.地盘[5] + '，寄坤二）。');
          L.push('天盘九星：' + GONG.map(function (p) { return '宫' + p + (c.九星[p] || '—'); }).join(' ') + '。');
          L.push('人盘八门：' + GONG.map(function (p) { return '宫' + p + (c.八门[p] || '—'); }).join(' ') + '。');
          L.push('与「日家」（六十日一局转盘）的区别：本式不按元、无旬首值符值使，星门位置全由日支与甲子锚日差决定，两套系统输出并列不合并、混排即错盘。');
          L.push('缺口（如实标注）：' + c.缺口.join(''));
          return { text: L.join('\n') };
        } catch (e) {
          return { text: '【宝鉴日奇门】排局失败：' + String(e && e.message ? e.message : e) + '（内核暂不可用，不影响其他功能）。' };
        }
      }
    },
    {
      key: 'qimen-nianyue', 名: '奇门遁甲·年家 / 月家（阴遁 1/4/7 局·值符随干）',
      板块: '三式推演', 短名: '排年家月家',
      触发词: ['年家奇门', '年家', '年奇门', '年家遁甲', '年家局', '月家奇门', '月家', '月奇门', '月家遁甲', '月家局'],
      说明: '三元定1/4/7局全阴遁值符随岁干月干飞九宫',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '年家/月家奇门需要日期，例如「年家奇门 2026年」（月家按节气取月柱，可说「月家奇门 2026年2月」）。' };
        var T = String(text || '');
        var isYue = /月家|月奇门/.test(T);
        var y = ent.date.year, m = ent.date.month || 6, d = ent.date.day || 15;
        if (!QNY || !QNY.nianChart) return { text: '【年家/月家奇门】内核未加载，暂不可用。' };
        try {
          var c = isYue ? QNY.yueChart({ y: y, m: m, d: d }) : QNY.nianChart({ y: y, m: m, d: d });
          if (c.err) return { prompt: c.err };
          var GONG = [1, 8, 3, 4, 9, 2, 7, 6];
          var fam = isYue ? '月家' : '年家';
          var L = [];
          L.push('【' + fam + '奇门】' + c.日期 + '：');
          L.push(fam + '奇门全用阴遁，三元局数为 1、4、7 局。');
          if (isYue) {
            L.push('月柱 ' + c.月柱 + '（六十甲子第 ' + c.月柱序 + ' 位，模 15 = ' + c.模15 + '），属' + c.元 + c.局数 + '局。');
          } else {
            L.push('年柱 ' + c.年柱 + '（干支年 ' + c.干支年 + '，距上元甲子 ' + c.距上元 + ' 年），属' + c.元 + c.局数 + '局。');
          }
          L.push('旬首 ' + c.旬首 + '，旬首仪「' + c.旬首仪 + '」落宫' + c.旬首宫 + '，值符「' + c.值符星 + '」、值使「' + c.值使门 + '」门。');
          L.push('值符随' + (isYue ? '月干' : '年干') + '：干「' + c.干 + '」在地盘宫' + c.干宫 + '，故值符星落此宫。值使随' + (isYue ? '月支' : '年支') + '：支「' + c.支 + '」临宫' + c.支宫 + '。');
          L.push('八神：年家月家全用阴遁，故八神一律逆排（小值符随大值符）。');
          L.push('地盘布仪：' + GONG.map(function (p) { return '宫' + p + c.地盘[p]; }).join(' ') + '（中五' + c.地盘[5] + '，寄坤二）。');
          L.push('天盘九星：' + GONG.map(function (p) { return '宫' + p + c.天盘[p]; }).join(' ') + '。');
          L.push('人盘八门：' + GONG.map(function (p) { return '宫' + p + c.八门[p]; }).join(' ') + '（环序铺开口径，与时家同源）。');
          // 八门伏吟派并列（v3.1.59）：伏吟局（值使门恰落本宫）时两派不同，并列输出不裁定
          if (c.八门_伏吟派) {
            L.push('人盘八门（伏吟派，算例派并列）：' + GONG.map(function (p) { return '宫' + p + c.八门_伏吟派[p]; }).join(' ') + '（各门归本宫。本日值使门恰落本宫成伏吟局，两派并列不合并、不裁定，详见缺口）。');
          }
          L.push('神盘八神：' + GONG.map(function (p) { return '宫' + p + c.八神[p]; }).join(' ') + '。');
          L.push('天盘干：' + GONG.map(function (p) {
            var g = c.天盘干[p];
            if (c.禽宫 === p && c.禽干) g = g + c.禽干;
            return '宫' + p + g;
          }).join(' ') + '。');
          if (isYue) L.push('月家定元：采古籍《奇門遁甲統宗》月奇门起例（按月柱六十甲子序位分组）。另有按年支四孟四仲四季定元一派，本内核不采。');
          L.push('与时家/日家/刻家的区别：年家以年、月家以月为单位，全阴遁，与前述各家不是同一张盘。');
          L.push('缺口（如实标注）：' + c.缺口.join(''));
          return { text: L.join('\n') };
        } catch (e) {
          return { text: '【' + (String(text || '').match(/月家/) ? '月家' : '年家') + '奇门】排局失败：' + String(e && e.message ? e.message : e) + '（内核暂不可用，不影响其他功能）。' };
        }
      }
    },
    {
      key: 'liuren', 名: '大六壬（时家·月将加占时·四课三传·十二天将）',
      板块: '三式推演', 短名: '排六壬',
      触发词: ['大六壬', '六壬', '月将加时', '月将加占时', '四课', '三传', '十二天将', '天乙贵人', '贵人', '伏吟', '返吟', '涉害', '蒿矢', '弹射', '遥克', '重审', '元首', '别责', '八专', '昴星', '井栏', '连茹', '天马', '孤虚'],
      说明: '月将加占时成天地盘四课三传十二天将断一课',
      run: function (ent, text) {
        if (!ent || !ent.date || !ent.date.year) return { prompt: '大六壬需要起课时辰年月日，例如「1990年8月15日14时」（可只给日期，占时另说）。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 0;
        if (!LR || !LR.chart) return { text: '【大六壬】内核未加载，暂不可用。' };
        try {
          var c = LR.chart({ y: y, m: m, d: d, h: h });
          if (c.err) return { prompt: c.err };
          var L = ['【大六壬】' + y + '年' + m + '月' + d + '日' + h + '时（时家·月将加占时）：'];
          L.push('四柱 ' + c.四柱.年 + ' ' + c.四柱.月 + ' ' + c.四柱.日 + ' ' + c.四柱.时 + '；月将' + c.月将 + '（' + c.中气 + '后）、占时' + c.占时 + '。');
          // 天地盘（十二支逐一列）
          L.push('天地盘：' + ZHI2().map(function (z) { return z + '上' + c.天地盘.天盘[z]; }).join(' ') + '（地盘恒为本身）。');
          // 四课
          L.push('四课：①' + c.四课[0].位 + '上' + c.四课[0].上 + ' ②' + c.四课[1].位 + '上' + c.四课[1].上 + ' ③' + c.四课[2].位 + '上' + c.四课[2].上 + ' ④' + c.四课[3].位 + '上' + c.四课[3].上 + '。');
          // 三传 + 发用
          L.push('发用 ' + c.发用.方法 + '，三传：初' + c.发用.三传[0] + ' → 中' + c.发用.三传[1] + ' → 末' + c.发用.三传[2] + '（遁干 ' + c.三传遁干.join(' ') + '）。');
          // 十二天将
          L.push('十二天将（' + c.十二天将.贵人 + '贵·' + c.十二天将.昼夜 + '·' + c.十二天将.顺逆 + '布）：' + ZHI2().map(function (z) { return z + c.十二天将.将[z]; }).join(' '));
          // 旬空 / 驿马
          L.push('旬空（空亡）' + (c.旬空.join('') || '无') + '；驿马' + (c.驿马 || '无') + '。');
          // 六壬细分（v3.1.24）：天马 / 连茹 / 孤虚 / 应期（古籍口径，缺口如实标注）
          L.push('细分：天马（驿马）' + c.天马.天马 + (c.天马.三传带马 ? '，三传带马' : '，三传不带马')
            + '；连茹' + (c.连茹.是 ? c.连茹.名 + '（三传' + c.发用.三传.join('') + '在地支环相连）' + (c.连茹.真连茹 ? '·**真连茹**（同属' + c.连茹.季节[0] + '季一路·连珠格）' : '·非真连茹（跨' + c.连茹.季节.join('/') + '不同季）') : '非连茹（三传不相连）') + '。');
          L.push('孤虚（《戎事类占》太岁法·以月建/日支代太岁）：日孤' + c.孤虚.日.孤.join('') + '、日虚' + c.孤虚.日.虚.join('')
            + '；月孤' + c.孤虚.月.孤.join('') + '、月虚' + c.孤虚.月.虚.join('') + '。');
          L.push('应期（《东方朔射覆秘诀》初传所合成期·末传所冲散期）：成期' + (c.应期.成期 || '—')
            + '、散期' + (c.应期.散期 || '—') + '。');
          L.push('（' + c.发用.说明 + '）');
          L.push('（九宗门全门已按《大六壬指南》《心印赋》《六壬大全》《探源》多源条文实现，并由古籍黄金课例逐条锁死；'
            + '涉害藏干/季无取/元首重审混见次序/金口诀贵人顺逆异说/夜子日柱 等细分项内核已如实标注，不假报已锁。）');
          // 解课层（v3.1.49 新增，liuren-duanyu）：此前排盘完整但零断事断语
          if (LID && LID.FAYONG) {
            var fk = (c.发用 && c.发用.方法) || '';   // 字段名 = 方法（实测：'伏吟·自任(阳日干上)'）
            var fd = LID.fayongOf(fk);
            if (fd) L.push('发用断语：' + fd);
            var ds = ['求财', '官讼', '疾病', '婚姻', '行人', '失物', '兵占', '天时']
              .map(function (t) { return LID.duanshiOf(t); }).filter(Boolean);
            if (ds.length) L.push('分类断事（问什么看什么）：' + ds.join(' '));
            L.push('六壬口径：断语取《大六壬指南》《六壬大全》通行断法，为单点参考；断事仍须合日辰用神与年命。');
          }
          return { text: L.join('\n') };
        } catch (e) {
          return { text: '【大六壬】起课失败：' + String(e && e.message ? e.message : e) + '（内核暂不可用，不影响其他功能）。' };
        }
      }
    },
    {
      key: 'liuyao', 名: '六爻纳甲',
      板块: '三式推演', 短名: '排六爻',
      触发词: ['六爻', '纳甲', '摇卦', '爻', '世应', '六亲', '卦象详解'],
      说明: '三铜钱起卦装纳甲安世应六亲生克配黄金策断六门',
      run: function (ent, text) {
        if (!LY || !LY.cast) return { text: '【六爻】内核未加载，暂不可用。' };
        try {
          var inp = {};
          // 尝试从文本解析 6 次背数（如「背 3 1 2 0 3 2」）
          var m = String(text || '').match(/背\s*([0-3\s,，、]+)/);
          if (m) {
            // 按「数字段」切：「背 3 1 2 0 3 2 2026年」里最后那个 2026 是年份、不是背数，须剔掉
            var bs = m[1].split(/[^\d]+/).filter(function (x) { return x !== '' && +x <= 3; }).map(Number);
            if (bs.length >= 6) inp.backs = bs.slice(0, 6);
          }
          if (ent && ent.date) { inp.y = ent.date.year; inp.m = ent.date.month || 1; inp.d = ent.date.day || 1; inp.h = ent.time ? ent.time.hour : 12; }
          // 测事 → 用神
          var 事m = String(text || '').match(/测([财运|事业|婚姻|感情|学业|考试|求财|疾病|出行|子嗣|官司]+)/);
          if (事m) inp.事 = 事m[1];
          var c = LY.cast(inp);
          if (c.err) return { prompt: c.err };
          var L = ['【六爻纳甲】本卦「' + c.本卦 + '」' + (c.变卦 ? '→ 变卦「' + c.变卦 + '」' : '') + '（' + c.宫 + '，世' + c.世 + ' 应' + c.应 + '）。'];
          L.push('上下卦：' + c.上下卦 + (c.动爻.length ? '；动爻：第 ' + c.动爻.join('、') + ' 爻' : '；无动爻'));
          L.push('六爻（自下而上）：');
          c.爻线.forEach(function (x) {
            L.push('  ' + x.爻 + '爻 ' + (x.阴阳 === '阴' ? '--' : '—') + ' ' + x.干支 + ' ' + x.六亲 + (x.六神 ? ' ' + x.六神 : '') + (x.世应 ? '【' + x.世应 + '】' : '') + (x.标记 ? ' ' + x.标记 : ''));
          });
          if (c.用神) L.push('用神：' + c.用神 + '。');
          if (c.日干) L.push('日干 ' + c.日干 + '，旬空 ' + (c.旬空.join('') || '无') + '，月建 ' + (c.月建 || '—') + '。');
          // 分门断语（v3.1.16）：用神—原神—忌神 生克推演
          var men = LY.menOf(String(text || '')) || (inp.事 ? (LY.menOf(inp.事) || null) : null);
          if (men && LY.menJudge) {
            var mj = LY.menJudge(c, men, { 性别: (ent && ent.gender === 'female') ? '女' : '男' });
            if (!mj.err) {
              L.push('【' + mj.门 + '门】用神「' + mj.用神 + '」（' + mj.用神五行 + '），原神「' + mj.原神 + '」，忌神「' + mj.忌神 + '」→ ' + mj.判 + '（' + (mj.分 >= 0 ? '+' : '') + mj.分 + ' 分）。');
              L.push('依据：' + mj.依据.join('；') + '。');
              L.push('口径：' + mj.说明 + '门义——' + mj.备注 + '。');
            }
          } else {
            L.push('分门断语：要按《黄金策》用神体系断，请说明所问之事（求财 / 婚姻 / 疾病 / 官讼 / 功名 / 出行）。');
          }
          if (c.缺料) L.push('（' + c.缺料 + '）');
          return { text: L.join('\n') };
        } catch (e) {
          return { text: '【六爻】起卦失败：' + String(e && e.message ? e.message : e) };
        }
      }
    },
    {
      key: 'yangzhai', 名: '阳宅风水',
      板块: '风水堪舆', 短名: '查阳宅',
      触发词: ['阳宅', '厨厕', '门对门', '缺角', '凸角', '户型', '楼层五行', '八宫', '家居风水'],
      说明: '按坐向门位厨厕判九宫吉凶缺角门对楼层五行逐项查',
      run: function (ent, text) {
        if (!YZ || !YZ.analyze) return { text: '【阳宅风水】内核未加载。' };
        var t = String(text || '');
        var inp = {};
        // 缺角（「缺西北 缺东南」）
        var miss = (t.match(/缺([西北|西南|东南|东北|正北|正南|正东|正西|中]+)/g) || []).map(function (x) { return x.replace('缺', ''); });
        if (miss.length) inp.缺角 = miss;
        // 厨房/厕所方位
        var k = t.match(/厨房在([西北|西南|东南|东北|正北|正南|正东|正西|中]+)/); if (k) inp.厨房 = k[1];
        var to = t.match(/厕所(在|位于)([西北|西南|东南|东北|正北|正南|正东|正西|中]+)/); if (to) inp.厕所 = to[2];
        // 门对门
        for (var dp in YZ.DOOR_PAIRS) if (t.indexOf(dp.replace('对', '对')) >= 0 || t.indexOf(dp) >= 0) { inp.门对门 = dp; break; }
        // 楼层 + 生肖
        var fl = t.match(/(\d+)\s*楼/); if (fl) inp.楼层 = +fl[1];
        var zs = t.match(/属([鼠牛虎兔龙蛇马羊猴鸡狗猪])/); if (zs) inp.生肖 = zs[1];
        if (!inp.缺角 && !inp.厨房 && !inp.厕所 && !inp.门对门 && !inp.楼层) {
          return { prompt: '请描述户型，例如「厨房在正南、缺西北、入户对电梯、8 楼属虎」或「阳宅八宫映射」。' };
        }
        var a = YZ.analyze(inp);
        var L = ['【阳宅风水】'];
        if (a.厨厕.length) a.厨厕.forEach(function (x) { L.push('·' + x.类型 + (x.方位 ? '(' + x.方位 + ')' : '') + (x.吉凶 ? '【' + x.吉凶 + '】' : '') + (x.危害 ? '：' + x.危害 : '') + (x.化解 ? '；化解：' + x.化解 : '')); });
        if (a.门对门.length) a.门对门.forEach(function (x) { L.push('·门对门(' + x.类型 + ')：' + x.化解); });
        if (a.缺角.length) a.缺角.forEach(function (x) { L.push('·缺' + x.方位 + '：' + x.危害 + '；补角：' + x.补角 + (x.严重 ? ' ⚠' + x.严重 : '')); });
        if (a.楼层) L.push('·楼层' + inp.楼层 + '：五行' + a.楼层.楼层五行 + (a.楼层.生肖五行 ? ('，生肖' + inp.生肖 + '五行' + a.楼层.生肖五行 + '，' + a.楼层.匹配) : ''));
        L.push('（' + a.缺口 + '）');
        return { text: L.join('\n') };
      }
    },
    {
      key: 'qianwen', 名: '签文·解梦·答案之书',
      板块: '相术占验', 短名: '解灵签',
      触发词: ['观音灵签', '灵签', '抽签', '求签', '抽一签', '求一签', '第几签', '签诗', '签文', '解梦', '梦到', '梦见', '做梦', '答案之书'],
      说明: '按日期定签不随机签诗诗意解曰配解梦词典答案书',
      run: function (ent, text) {
        if (!QW) return { text: '【签文/解梦】内核未加载。' };
        var t = String(text || '');
        if (t.indexOf('观音') >= 0 || t.indexOf('灵签') >= 0 || t.indexOf('抽签') >= 0 || t.indexOf('求签') >= 0 ||
            t.indexOf('抽一签') >= 0 || t.indexOf('求一签') >= 0 || t.indexOf('签文') >= 0 || t.indexOf('签诗') >= 0 || t.indexOf('第几签') >= 0 || /第\s*[0-9一二三四五六七八九十百]+\s*签/.test(t)) {
          // ① 指定签号（「第11签」「第十一签」）→ 直接查那一签
          // ② 指定签名（「观音 苏秦不第」）→ 按典故名查
          // ③ 都没给 → 按日期抽（同日同签，不靠随机数）
          var g = null, byNum = t.match(/第\s*([0-9一二三四五六七八九十百]+)\s*签/);
          if (byNum) {
            g = QW.guanyinByNo(numOf(byNum[1]));
            if (!g) return { prompt: '观音灵签共 100 签，签号请给 1–100（如「第11签」「第一百签」）。' };
            g.总签数 = QW.GUANYIN_COUNT;
          } else {
            g = QW.guanyinByName(t.replace(/观音|灵签|抽签|求签|签文|签|查|看看|一下|的|\s/g, ''));
            if (g) g.总签数 = QW.GUANYIN_COUNT;
          }
          if (!g) {
            g = QW.guanyinDraw(ent && ent.date ? (ent.date.year + '-' + (ent.date.month || 1) + '-' + (ent.date.day || 1)) : undefined);
            if (!g || !g.签名) return { text: '【观音灵签】签文数据未加载。' };
          }
          // 签诗四句一行一句（结果页按换行分段，正好一句一行）
          var poem = (g.签诗 || []).map(function (s, i) { return (i === 0 ? '签诗：' : '　　　') + s; }).join('\n');
          var out = ['【观音灵签】第 ' + g.签号 + ' 签 / 共 ' + g.总签数 + ' 签「' + g.签名 + '」' + g.等级 + '签（' + g.宫位 + '·' + g.吉凶 + '）。'];
          if (poem) out.push(poem);
          if (g.诗意) out.push('诗意：' + g.诗意);
          if (g.解曰) out.push('解曰：' + g.解曰);
          if (g.圣意) out.push('圣意：' + g.圣意);
          out.push('注：签文取《观音一百签》传统文本（天天灵签网 / 农历114 / 观音灵签解签 三源比对），标点按阅读节奏处理、字句未改，' + (g.注 || '') + '要查别的签，直接说「第 11 签」或「苏秦不第」。');
          return { text: out.join('\n') };
        }
        if (t.indexOf('解梦') >= 0 || /梦到|梦见|做梦|梦里/.test(t)) {
          if (!QW.dreamMatch) return { text: '【解梦】词库未加载。' };
          var 梦词 = t.replace(/解梦/g, ' ');
          var hitD = QW.dreamMatch(梦词);
          // ① 指定了分类（「解梦 动物」「解梦里有哪些动物」）→ 列该类全部词条
          var catHit = null;
          QW.DREAM_CATS.forEach(function (c) { if (梦词.indexOf(c) >= 0) catHit = c; });
          if (hitD && !(catHit && hitD.词.length < 2)) {
            var L = ['【解梦】梦见「' + hitD.词 + '」（' + hitD.类别 + '类）：'];
            L.push('传统向：' + hitD.传统 + '。');
            L.push('心理向：' + hitD.心理 + '。');
            var same = QW.dreamList(hitD.类别).map(function (x) { return x.词; }).filter(function (w) { return w !== hitD.词; });
            L.push('同类可查（' + hitD.类别 + '，共 ' + (same.length + 1) + ' 条）：' + same.slice(0, 12).join('、') + (same.length > 12 ? '…' : '') + '。');
            L.push('口径：传统向取民间《周公解梦》一系通行说法（此书无权威定本，各辑本互有出入），措辞为「旧说/民间谓」不作断言；心理向为现代释梦通识归纳，属一种读法。两栏并列，本应用不裁谁对。');
            return { text: L.join('\n') };
          }
          if (catHit) {
            var lst = QW.dreamList(catHit);
            return {
              text: '【解梦】' + catHit + '类共 ' + lst.length + ' 条：' + lst.map(function (x) { return x.词; }).join('、')
                + '。\n说具体梦象即可（如「梦到蛇」），会给传统向 + 心理向两栏。'
            };
          }
          if (!hitD) {
            var cats = QW.dreamCats();
            return {
              text: '【解梦】词库现有 ' + QW.dreamCount() + ' 条 / ' + cats.length + ' 类：'
                + cats.map(function (x) { return x.类别 + '(' + x.词数 + ')'; }).join('、')
                + '。\n这个梦象暂未收录 —— 不硬编一个解释给你。可换个说法（如「梦到蛇」「梦见掉牙」），或按类别查（「解梦 动物」）。'
            };
          }
          return { text: '【解梦】词库未加载。' };
        }
        if (t.indexOf('答案') >= 0) {
          var a = QW.answerBook();
          return { text: '【答案之书】' + a.句 + '\n' + a.注 };
        }
        return { prompt: '请指明：观音灵签 / 解梦 / 答案之书（如「抽观音灵签」「梦到蛇」）。' };
      }
    },
    {
      key: 'qimen-fei', 名: '飞盘奇门（飞宫法）',
      板块: '三式推演', 短名: '排飞盘',
      触发词: ['飞盘奇门', '飞盘', '飞宫', '飞宫法', '九星飞布', '飞布奇门'],
      说明: '复用时家定局九星按宫数飞布八门跳中五逆顺推',
      run: function (ent, text) {
        if (!QF) return { text: '【飞盘奇门】内核未加载。' };
        if (!ent || !ent.date) return { prompt: '飞盘奇门需占局时刻，例如「飞盘奇门 2026年8月15日14时」。' };
        var r = QF.feiChart({ y: ent.date.year, m: ent.date.month || 1, d: ent.date.day || 1, h: (ent.time && ent.time.hour) || 12 });
        if (r.err) return { text: '【飞盘奇门】' + r.err };
        // 九宫展示序（巽4 离9 坤2 / 震3 中5 兑7 / 艮8 坎1 乾6）
        var order = [4, 9, 2, 3, 5, 7, 8, 1, 6];
        var grid = [];
        for (var i = 0; i < 9; i += 3) {
          var row = [];
          for (var j = 0; j < 3; j++) {
            var p = order[i + j];
            row.push(p + '宫 ' + (r.地盘[p] || '—') + (r.天盘[p] ? '·' + r.天盘[p].replace('天', '') : '')
              + (r.八门[p] ? '·' + r.八门[p] : '') + (r.九神[p] ? '·' + r.九神[p] : ''));
          }
          grid.push(row.join(' │ '));
        }
        return {
          text: '【飞盘奇门·飞宫法】' + r.时刻 + ' ' + r.阴阳遁 + r.局数 + '局（' + r.节气 + '·' + r.元 + '元）\n'
            + '旬首 ' + r.旬首 + '（' + r.旬首宫 + '宫）｜值符 ' + r.值符星 + ' 落 ' + r.时干宫 + '宫｜值使 ' + r.值使门 + ' 落 ' + r.值使落宫 + '宫\n'
            + '四柱 ' + r.四柱.年 + ' ' + r.四柱.月 + ' ' + r.四柱.日 + ' ' + r.四柱.时 + '\n'
            + '── 九宫（地盘仪·天盘星·八门·九神）──\n' + grid.join('\n') + '\n'
            + '（中五宫有星无门；地盘中五保留不寄坤，与转盘不同）\n'
            + r._飞布验证
        };
      }
    },
    {
      key: 'bazi-pattern', 名: '八字格局·喜用神',
      板块: '命理排盘', 短名: '解格局',
      触发词: ['八字格局', '格局取用', '格局成败', '喜用神', '用神喜忌', '调候用神', '通关用神', '身强弱', '日主强弱', '取格', '什么格', '格局'],
      说明: '月支本气透干取格配穷通宝鉴调候定喜用神',
      run: function (ent, text) {
        if (!BP || !BP.analyze) return { text: '【八字格局·用神】内核未加载。' };
        if (!ent || !ent.date || !ent.date.year) return { prompt: '看格局需要出生年月日，例如「1990年8月15日14时 看格局」（时辰缺失按 14 时补）。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 14;
        var g = zhGender(ent) || '男';
        var r = BP.analyze({ y: y, m: m, d: d, h: h, gender: g, name: ent.name || '命主' });
        if (r.err) return { text: '【八字格局·用神】' + r.err };
        var ge = r.格局;
        var L = ['【八字格局·用神】' + (ent.name || '命主') + '（' + g + '）' + y + '年' + m + '月' + d + '日' + h + '时。'];
        L.push('四柱：年' + r.四柱.年 + ' 月' + r.四柱.月 + ' 日' + r.四柱.日 + ' 时' + r.四柱.时 + '。');
        L.push('日主：' + r.日主 + '；月令：' + r.月令 + '。');
        L.push('格局：' + ge.名 + '（' + ge.类别 + (ge.禄刃 ? '·' + ge.禄刃 + '位' : '') + '）' + (ge.透干 ? '，透干' + ge.透干 : '') + '。');
        L.push('取格依据：' + ge.依据);
        L.push('成格要：' + r.格局成败.成格要);
        L.push('破格忌：' + r.格局成败.破格忌);
        L.push('身强弱：' + r.身强弱.判 + '（加权' + r.身强弱.加权分 + '分，得令' + (r.身强弱.得令 ? '是' : '否') + '，得地' + r.身强弱.得地 + '，得势' + r.身强弱.得势 + '）。');
        L.push('调候：' + (r.调候.第一用神 ? (r.调候.全表次第.join('、') + '（首项为主）；' + r.调候.说明) : r.调候.说明));
        L.push('通关：' + (r.通关.length ? r.通关.map(function (t) { return t.说明; }).join('；') : '全局无两行并旺相战，无需通关。'));
        L.push('用神：扶抑取' + r.用神.扶抑 + '、调候取' + (r.用神.调候 || '—') + '、通关取' + (r.用神.通关 || '—') + '，综合主用' + r.用神.综合主用 + '。');
        if (r.用神.冲突提示) L.push('冲突：' + r.用神.冲突提示);
        L.push('喜忌：' + r.喜忌.参考);
        if (r.外格提示.length) L.push('外格：' + r.外格提示.join('；'));
        L.push('标注：' + r.缺口.replace(/\n/g, '；'));
        return { text: L.join('\n') };
      }
    },
    {
      key: 'qimen-ge', 名: '奇门吉凶格局库',
      板块: '三式推演', 短名: '解奇门格局',
      触发词: ['奇门格局', '吉凶格局', '奇门吉凶', '十干克应', '九遁', '三奇得使', '玉女守门', '青龙返首', '飞鸟跌穴', '五不遇时', '六仪击刑', '三奇入墓'],
      说明: '十干克应九遁三奇得使等格按门宫星神组合断吉凶',
      run: function (ent, text) {
        if (!QG || !QG.analyze) return { text: '【奇门吉凶格局】内核未加载。' };
        if (!ent || !ent.date || !ent.date.year) return { prompt: '判格局需要用事时刻，例如「奇门格局 2026年10月20日14时」。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 12;
        var r = QG.analyze({ y: y, m: m, d: d, h: h });
        if (r.err) return { text: '【奇门吉凶格局】' + r.err };
        var G = ['（中五无实宫）', '坎一', '坤二', '震三', '巽四', '中五', '乾六', '兑七', '艮八', '离九'];
        var L = ['【奇门吉凶格局】' + y + '年' + m + '月' + d + '日' + h + '时，' + r.阴阳遁 + r.局数 + '局，旬首' + r.旬首 + '，四柱 ' + r.四柱.年 + ' ' + r.四柱.月 + ' ' + r.四柱.日 + ' ' + r.四柱.时 + '。'];
        L.push('克应：' + r.十干克应.map(function (x) {
          return G[x.宫] + '宫【' + x.天盘干 + '+' + x.地盘干 + '】' + x.格名 + '（' + x.吉凶 + '）' + (x.异名 ? '·异名' + x.异名 : '') + '，' + x.门 + '门' + x.星 + x.神;
        }).join('；'));
        L.push('吉格：' + (r.吉格.length ? r.吉格.map(function (x) { return x.名 + (x.宫 ? '（' + G[x.宫] + '宫）' : '') + '：' + x.义; }).join('；') : '本局未检出吉格。'));
        L.push('凶格：' + (r.凶格.length ? r.凶格.map(function (x) { return x.名 + (x.宫 ? '（' + G[x.宫] + '宫）' : '') + '：' + x.义; }).join('；') : '本局未检出凶格。'));
        L.push('总评：' + r.总评 + '（吉格 ' + r.吉格数 + ' 条 / 凶格 ' + r.凶格数 + ' 条）。');
        L.push('破格：' + r.破格提示);
        L.push('标注：' + r.缺口.replace(/\n/g, '；'));
        return { text: L.join('\n') };
      }
    },
    {
      key: 'liuren-bifa', 名: '大六壬·毕法赋断课',
      板块: '三式推演', 短名: '解毕法',
      触发词: ['毕法赋', '毕法', '六壬毕法', '毕法断课', '一百法', '毕法目录', '天将类象', '六壬类象'],
      说明: '毕法赋一百法逐条匹配课体按条目断事类吉凶',
      run: function (ent, text) {
        if (!LBF || !LBF.analyze) return { text: '【毕法赋断课】内核未加载。' };
        var t = String(text || '');
        // 只要目录（不占课时）：「毕法目录 / 一百法全表」
        if (/目录|全表|一百法/.test(t) && !ent.date) {
          var L0 = ['【毕法赋·一百法目录】（四库《六壬大全》卷九上 1–70 / 卷十一下 71–100，凌福之撰）'];
          var 上 = [], 下 = [];
          LBF.BIFA.forEach(function (x) { (x[2] === '上' ? 上 : 下).push(x[0] + '·' + x[1]); });
          L0.push('上卷：' + 上.join('、') + '。');
          L0.push('下卷：' + 下.join('、') + '。');
          L0.push('覆盖：' + LBF.BIFA.length + ' 条；本内核对 18 条做机器判定（5/6/23/24/25/26/27/28/31/32/36/51/52/59/79/81/83/96），其余只列目录。');
          return { text: L0.join('\n') };
        }
        if (!ent || !ent.date || !ent.date.year) return { prompt: '断课需要占问时刻，例如「毕法赋 2026年10月20日14时」（只要目录可说「毕法赋目录」）。' };
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1, h = ent.time ? ent.time.hour : 12;
        var r = LBF.analyze({ y: y, m: m, d: d, h: h });
        if (r.err) return { text: '【毕法赋断课】' + r.err };
        var L = ['【毕法赋断课】' + y + '年' + m + '月' + d + '日' + h + '时，月将' + r.月将 + '，占时' + r.占时 + '，日干支' + r.四柱.日 + '。'];
        L.push('四课：' + r.四课.map(function (k, i) { return ['干上', '干阴', '支上', '支阴'][i] + k.位 + '乘' + k.上; }).join('；') + '。');
        L.push('三传：' + r.三传.join(' → ') + '（初' + r.三传[0] + ' 中' + r.三传[1] + ' 末' + r.三传[2] + '），遁干' + (r.三传遁干 || []).join('') + '，旬空' + (r.旬空 || []).join('') + '。');
        L.push('毕法：' + (r.命中.length ? r.命中.map(function (x) { return '第' + x.序 + '法「' + x.名 + '」（' + x.卷 + '卷）：' + x.说明; }).join('；') : '本課未命中可自动判定之毕法条目（18 条判据内）。'));
        L.push('类象：' + r.类象.map(function (x) { return x.位 + x.支 + '乘' + x.将 + '——' + x.象意; }).join('；'));
        L.push('覆盖：' + r.判定覆盖);
        L.push('标注：' + r.缺口.replace(/\n/g, '；'));
        return { text: L.join('\n') };
      }
    },
    {
      key: 'liuyao-wangshuai', 名: '六爻旺衰进阶',
      板块: '三式推演', 短名: '解六爻旺衰',
      触发词: ['六爻旺衰', '爻旺衰', '旺衰进阶', '生旺墓绝', '暗动', '日破', '月破', '化进神', '化退神', '回头生', '回头克', '六爻三合局', '爻三合', '六冲卦', '六合卦', '爻伏吟', '爻反吟', '化墓', '化绝'],
      说明: '生旺墓绝加月建日辰档暗动进退三合局定旺衰',
      run: function (ent, text) {
        if (!LWS || !LWS.analyze) return { text: '【六爻旺衰】内核未加载。' };
        function 净(x) {
          return String(x == null ? '' : x)
            .replace(/[。；]/g, '，')
            .replace(/，{2,}/g, '，')
            .replace(/^，+|，+$/g, '');
        }
        var t = String(text || '');
        // ① 背数起卦：文本里 6 个连续的 0–3（如「起卦 1 2 3 0 1 2」）
        var backs = null;
        var m6 = t.match(/[0-3](?:[\s,，、]{0,2}[0-3]){5}/);
        if (m6) backs = (m6[0].match(/[0-3]/g) || []).map(Number);
        // ② 测事：命中用神表最长词
        var 事 = null, 事长 = 0;
        if (LY && LY.YONG) {
          Object.keys(LY.YONG).forEach(function (k) {
            if (t.indexOf(k) >= 0 && k.length > 事长) { 事 = k; 事长 = k.length; }
          });
        }
        if (!ent || !ent.date || !ent.date.year) {
          return { prompt: '六爻需占卦时刻（定月建/日辰/旬空/六神），例如「六爻旺衰 求财 2026年10月20日14时」，要指定手摇结果可加六个数「1 2 3 0 1 2」（每爻背数 0–3）。' };
        }
        var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1;
        var h = (ent.time && ent.time.hour != null) ? ent.time.hour : 12;
        var r = LWS.analyze({ y: y, m: m, d: d, h: h, backs: backs || undefined, 事: 事 });
        if (r.err) return { text: '【六爻旺衰】' + r.err };

        var L = ['【六爻旺衰进阶】' + y + '年' + m + '月' + d + '日' + h + '时' + (backs ? '，按手摇背数 ' + backs.join('') + ' 起卦' : '，即时起卦')
          + '，得「' + r.本卦 + '」' + (r.变卦 ? '之「' + r.变卦 + '」（动爻 ' + r.动爻.join('、') + '）' : '（六爻安静，无变卦）')
          + '，' + r.宫 + '，世' + r.世 + '应' + r.应 + '。'];
        L.push('月建日辰：月建' + r.月建 + '，日辰' + r.日辰 + '（日干' + r.日干 + '），旬空' + ((r.旬空 && r.旬空.length) ? r.旬空.join('') : '无') + '，月建司一月之权为提纲，日辰司一日之权为主宰。');

        L.push('卦象：' + (r.卦象.项.length
          ? r.卦象.项.map(function (x) { return x.名 + '（' + 净(x.断) + '）'; }).join('，')
          : '常卦（非六冲六合、非游魂归魂，内外卦亦无伏吟反吟）。'));

        // 用神
        if (r.用神) {
          if (r.用神爻 && r.用神爻.length) {
            L.push('用神：' + r.用神 + '（' + r.用神五行 + '）现于' + r.用神爻.map(function (x) {
              return '第' + x.爻 + '爻' + x.干支 + '，' + x.旺衰 + (x.空亡 ? '·旬空' : '') + (x.月破 ? '·月破' : '');
            }).join('，') + '。');
          } else if (r.用神伏神 && r.用神伏神.length) {
            L.push('用神：' + r.用神 + '（' + r.用神五行 + '）不上卦，' + r.用神伏神.map(function (f) {
              return '伏于第' + f.爻 + '爻（伏神' + f.干支 + '，飞神' + f.飞神.干支 + '·' + f.飞神.六亲 + '，' + f.飞伏关系 + '，' + f.旺衰 + '）';
            }).join('，') + '，须待伏神出伏透出方可论吉凶。');
          } else {
            L.push('用神：' + r.用神 + '（' + r.用神五行 + '）本卦与本宫纯卦皆无，此事无缘或难成之象。');
          }
        } else {
          L.push('用神：未指定测事，未取用神（说「求财/事业/婚姻/疾病/学业…」即可取用神）。');
        }

        // 逐爻旺衰
        L.push('逐爻：' + r.爻.map(function (x) {
          var s = '第' + x.爻 + '爻' + x.干支 + x.五行 + '·' + x.六亲 + (x.六神 ? '·' + x.六神 : '') + (x.世应 ? '·' + x.世应 : '') + (x.动 ? '·动' : '') + '，' + x.旺衰;
          if (x.空亡) s += '·旬空';
          if (x.月破) s += '·月破';
          if (x.冲判) s += '·' + x.冲判;
          if (x.变) s += ' → 化' + x.变.变支 + x.变.变五行 + '（' + x.变.项.map(function (tt) { return tt.名; }).join('/') + '）';
          return s;
        }).join('，') + '。');

        // 世爻
        if (r.世爻) {
          L.push('世爻：第' + r.世爻.爻 + '爻' + r.世爻.干支 + r.世爻.五行 + '·' + r.世爻.六亲 + '，' + r.世爻.旺衰
            + (r.世爻.空亡 ? '·旬空' : '') + (r.世爻.月破 ? '·月破' : '') + (r.世爻.冲判 ? '·' + r.世爻.冲判 : '')
            + (r.世爻.变 ? '，' + 净(r.世爻.变.主判.断) : '') + '。');
        }

        // 原神 / 忌神 / 仇神
        if (r.元忌仇) {
          var Y = r.元忌仇;
          function seg(名, o) {
            return 名 + '（' + o.六亲 + '·' + o.五行 + '）' + (o.爻.length
              ? o.爻.map(function (x) { return '第' + x.爻 + '爻' + x.旺衰 + (x.空亡 ? '·空' : '') + (x.月破 ? '·破' : ''); }).join('，')
              : '不上卦');
          }
          L.push('元忌仇：' + seg('原神', Y.原神) + '，' + seg('忌神', Y.忌神) + '，' + seg('仇神', Y.仇神) + '。');
        }

        // 动变
        var 动列 = r.爻.filter(function (x) { return x.变; });
        L.push('动变：' + (动列.length ? 动列.map(function (x) {
          return '第' + x.爻 + '爻' + x.支 + '→' + x.变.变支 + '，' + x.变.项.map(function (tt) {
            return tt.名 + (tt.注 ? '（' + 净(tt.注) + '）' : '');
          }).join('，') + '，主判：' + 净(x.变.主判.断);
        }).join('，') : '六爻安静，无动变（以日月旺衰与合冲论）。'));

        // 三合局
        L.push('合局：' + (r.合局.length ? r.合局.map(function (x) { return 净(x.说明).replace(/；/g, '，'); }).join('，') : '未检出三合局（静爻不能成合，须三爻齐动或动爻与日月凑局）。'));

        // 断要（通用法则定性，不作绝对断言）
        var 用强 = (r.用神爻 && r.用神爻.length) ? r.用神爻[0].强弱 : (r.用神伏神 && r.用神伏神[0] ? r.用神伏神[0].强弱 : null);
        var 判;
        if (用强 === '旺') 判 = '用神旺相有根，事有可成之基，宜乘时而动。';
        else if (用强 === '相') 判 = '用神得气，事可为，成中须借日月扶助。';
        else if (用强 === '暗动（力增）') 判 = '用神受日冲而暗动，静中带动，事有意外之转机。';
        else if (用强 === '平') 判 = '用神平平，力不专，须待值日值月或动爻生扶方成。';
        else if (用强 === '弱有救') 判 = '用神弱而有救，事虽可为而成中带阻，宜耐心待时。';
        else if (用强 === '衰') 判 = '用神无气（旬空、月破、日破或受克），事难成，旺相有气之日月方是应期。';
        else 判 = '用神旺衰未定（缺月建日辰），须补占卦日期。';
        var 忌强 = (r.元忌仇 && r.元忌仇.忌神.爻.length) ? r.元忌仇.忌神.爻[0].强弱 : null;
        if (忌强 === '旺' || 忌强 === '相' || 忌强 === '暗动（力增）') 判 += '忌神（' + r.元忌仇.忌神.六亲 + '）有力，为事之阻力，须看有无制化。';
        var 合局成立 = r.合局.filter(function (x) { return x.成立; });
        if (合局成立.length) 判 += '三合' + 合局成立[0].局 + '已成立，' + (合局成立[0].空破.length ? '然局中有空破待解，' : '') + '事势聚合，力量专一。';
        L.push('断要：' + 净(判) + '（通用法则定性，不作绝对断言，具体应期须结合值日值月、冲合填实另断）');

        L.push('标注：' + r.注.map(净).join('，') + (r.缺料 ? '，' + 净(r.缺料) : '') + '。');
        return { text: L.join('\n') };
      }
    },
    {
      key: 'ziwei-sihua', 名: '紫微四化·流年流月流日',
      板块: '命理排盘', 短名: '解四化',
      触发词: ['紫微四化', '生年四化', '四化流年', '流年四化', '流月四化', '流日四化', '大限四化', '紫微流年', '紫微流月', '紫微流日', '紫微小限', '紫微大限', '三方四正', '四化表', '化禄', '化权', '化科', '化忌', '四化'],
      说明: '十天干四化入十二宫推流年流月流日四层运限',
      run: function (ent, text) {
        if (!ZHW || !ZHW.analyze) return { text: '【紫微四化】内核未加载。' };
        function 净(x) {
          return String(x == null ? '' : x)
            .replace(/[。；]/g, '，').replace(/，{2,}/g, '，').replace(/^，+|，+$/g, '');
        }
        var t = String(text || '');
        var y = yearOf(ent, text);
        var m = ent && ent.date && ent.date.month ? ent.date.month : 1;
        var d = ent && ent.date && ent.date.day ? ent.date.day : 1;
        var h = (ent && ent.time && ent.time.hour != null) ? ent.time.hour : 14;
        var g = ent && ent.gender ? ((ent.gender === 'female' || ent.gender === '女') ? '女' : '男') : null;
        if (!g) return { prompt: '紫微斗数需出生性别（定阴阳顺逆与大限方向），请补「男」或「女」。' };
        if (!y) return { prompt: '紫微四化需出生年月日，例如「紫微四化 1990年8月15日14时 男 看2026年流年」。' };

        // 目标日期：支持 2026-10-20 / 流年2026年10月20日 / 只给年 / 明年去年；缺省取今日
        var now = new Date();
        var ty = now.getFullYear(), tm = now.getMonth() + 1, td = now.getDate();
        var m1 = t.match(/(20\d{2}|19\d{2})\s*[-\/.]\s*(\d{1,2})\s*[-\/.]\s*(\d{1,2})/);
        var m2 = t.match(/流(?:年|月|日)[^\d]{0,4}(\d{4})\s*年\s*(\d{1,2})\s*月(?:\s*(\d{1,2})\s*[日号])?/);
        if (m1) { ty = +m1[1]; tm = +m1[2]; td = +m1[3]; }
        else if (m2) { ty = +m2[1]; tm = +m2[2]; if (m2[3]) td = +m2[3]; }
        else {
          var all = t.match(/(20\d{2})\s*年/g);
          if (all && all.length) ty = parseInt(all[all.length - 1], 10);
          else if (/明年/.test(t)) ty += 1;
          else if (/去年/.test(t)) ty -= 1;
        }

        var r = ZHW.analyze({ y: y, m: m, d: d, h: h, gender: g }, { y: ty, m: tm, d: td });
        if (r.err) return { text: '【紫微四化·流运】' + r.err };

        var L = ['【紫微四化·流运】' + y + '年' + m + '月' + d + '日' + h + '时生（' + g + '），推' + ty + '年' + tm + '月' + td + '日（农历' + r.农历 + '）之运。'];
        L.push('命盘：命宫' + r.命盘.命宫.干支 + '主星「' + r.命盘.命宫.主星 + '」，身宫' + r.命盘.身宫.干支 + '主星「' + r.命盘.身宫.主星 + '」，' + r.命盘.五行局 + '，命主' + r.命盘.命主星 + '、身主' + r.命盘.身主星 + '。');
        L.push('生年四化：' + r.生年.map(function (x) {
          return x.星 + '化' + x.化 + '入' + x.宫 + '（' + x.宫干支 + '）';
        }).join('，') + '。');

        function 层线(L0) {
          var s = L0.干支 + ((L0.层 === '大限' && L0.岁区间) ? '（' + L0.岁区间.join('-') + '岁）' : '') + '，命宫在' + L0.命宫宫名 + '宫，';
          s += L0.项.map(function (x) {
            return (x.星 || '—') + '化' + x.化 + '→' + x.宫 + (x.入三方 ? '★' : '');
          }).join('，');
          return s + '。';
        }
        // 大限 / 流年 / 流月 / 流日 各出一块；小限与流时合并一块
        ['大限', '流年', '流月', '流日'].forEach(function (nm) {
          var L0 = r.层.filter(function (x) { return x.层 === nm; })[0];
          if (L0) L.push(nm + '运：' + 层线(L0));
        });
        var 余 = r.层.filter(function (x) { return x.层 === '小限' || x.层 === '流时'; });
        L.push('小限流时：' + 余.map(function (x) { return x.层 + '：' + 层线(x); }).join('').replace(/。$/, ''));

        // 流年断语（只给流年四化，避免堆砌）
        var 流年层 = r.层.filter(function (x) { return x.层 === '流年'; })[0];
        if (流年层) {
          L.push('流年断语：' + 流年层.项.map(function (x) { return 净(x.断); }).filter(Boolean).join('；').replace(/；/g, '，') + '。');
        }

        // 流年十二宫映射
        if (r.流年映射.length) {
          L.push('流年宫位：' + r.流年映射.map(function (x) { return x.本命宫 + '→' + x.流年宫; }).join('，') + '。');
        }

        L.push('标注：' + r.说明.map(function (s) { return String(s).replace(/[。；]/g, '，').replace(/，+$/, ''); }).join('，') + '。');
        return { text: L.join('\n') };
      }
    },
    // ===== v3.1.8 占星宫位 / 阿拉伯点 / 卜卦 / 择时（C28）=====
    // ===== v3.1.8 八字神煞全表 / 八字合婚（C31）=====
    {
      key: 'bazi-shensha', 名: '八字神煞全表（21 类）',
      板块: '命理排盘', 短名: '查神煞',
      说明: '天乙贵人太极文昌等二十一类按四柱干支查神煞吉凶',
      触发词: ['神煞', '八字神煞', '太极贵人', '文昌贵人', '文昌贵人星', '天德贵人', '月德贵人', '桃花', '咸池', '驿马', '羊刃', '华盖', '将星', '劫煞', '灾煞', '亡神', '孤辰', '寡宿', '红鸾', '天喜', '金舆', '禄神', '天医', '空亡'],
      run: function (ent, text) {
        if (!BSS || !BSS.analyze) return { text: '【八字神煞】内核未加载。' };
        var y = ent.date && ent.date.year, m = ent.date && ent.date.month, d = ent.date && ent.date.day;
        var h = ent.time && ent.time.hour != null ? ent.time.hour : null;
        if (!y || !m || !d) return { prompt: '神煞需出生年月日时，例如「1990年8月15日14时 八字神煞」。' };
        if (h == null) return { prompt: '神煞须给时辰（时柱决定半数神煞落位），例如「1990年8月15日14时 八字神煞」。' };
        var r = BSS.analyze({ y: y, m: m, d: d, h: h, gender: genderOf(ent) });
        if (r.err) return { prompt: r.err };
        var L = ['【八字·神煞】' + r.四柱 + '，日主' + r.日主 + '（' + r.性别 + '）。'];
        if (r.命中.length) {
          r.命中.forEach(function (x) {
            L.push(x.名 + '：在' + x.位 + '——' + x.义 + '（查法：' + x.查法 + '）。');
          });
        } else {
          L.push('本盘 21 类常用神煞皆未落柱。');
        }
        L.push(r.汇总 + '。');
        L.push('标注：' + String(r.缺口).replace(/[。；]/g, '，').replace(/，$/, '') + '。');
        return { text: L.join('\n') };
      }
    },
    {
      key: 'bazi-hehun', 名: '八字合婚（生肖·夫妻宫·五合·纳音·互补）',
      板块: '命理排盘', 短名: '查合婚',
      说明: '两人四柱生肖夫妻宫五合纳音互补判合婚吉凶与建议',
      触发词: ['合婚', '八字合婚', '婚配', '配不配', '合不合', '属相合婚', '婚姻合不合', '两人合婚'],
      run: function (ent, text) {
        if (!BSS || !BSS.hehun) return { text: '【八字合婚】内核未加载。' };
        var t = String(text || '');
        // 从文本里取两人生辰（YYYY年M月D日[时] 或 YYYY-M-D）
        var ds = [], re = /(\d{4})\s*[年\-\/.]\s*(\d{1,2})\s*[月\-\/.]\s*(\d{1,2})\s*[日号]?\s*(?:(\d{1,2})\s*时)?/g, mm;
        while ((mm = re.exec(t)) !== null) {
          ds.push({ y: +mm[1], m: +mm[2], d: +mm[3], h: mm[4] != null ? +mm[4] : null });
        }
        // 只有一方时，把 ent 的一方补进来（ent 在前）
        if (ds.length === 1 && ent.date && ent.date.year) {
          ds.unshift({ y: ent.date.year, m: ent.date.month, d: ent.date.day, h: ent.time && ent.time.hour != null ? ent.time.hour : null });
        }
        if (ds.length < 2) return { prompt: '合婚需两人生辰，例如「合婚 1990年8月15日14时 男 与 1992年3月20日9时 女」。' };
        // 性别：按文本中「男/女」出现次序；缺则按前男后女
        var gs = [], gr = /([男女])/g, gm;
        while ((gm = gr.exec(t)) !== null) gs.push(gm[1] === '男' ? 'male' : 'female');
        var a = ds[0], b = ds[1];
        if (a.h == null) a.h = 12;
        if (b.h == null) b.h = 12;
        var r = BSS.hehun(
          { y: a.y, m: a.m, d: a.d, h: a.h, gender: gs[0] || 'male' },
          { y: b.y, m: b.m, d: b.d, h: b.h, gender: gs[1] || 'female' }
        );
        if (r.err) return { prompt: r.err };
        var L = ['【八字·合婚】甲（' + (gs[0] === 'female' ? '女' : '男') + '）' + a.y + '年' + a.m + '月' + a.d + '日' + a.h + '时：' + r.甲 + '，乙（' + (gs[1] === 'female' || !gs[1] ? '女' : '男') + '）' + b.y + '年' + b.m + '月' + b.d + '日' + b.h + '时：' + r.乙 + '。'];
        L.push('综合：' + r.档 + '（参考评分 ' + r.评分 + '／100）。');
        r.项.forEach(function (x) { L.push(x.名 + '［' + x.判 + '］' + String(x.说).replace(/[。；]/g, '，').replace(/，$/, '') + '。'); });
        L.push('标注：' + (r.说明 + r.缺口).replace(/[。]/g, '，').replace(/，$/, '') + '。');
        return { text: L.join('\n') };
      }
    },
  {
        key: 'date-convert', 名: '万年历·日期换算',
        板块: '黄历择日', 短名: '查农历',
        触发词: ['日期换算', '公历', '农历', '儒略日', '倒排日', '阳历', '阴历', '换农历', '查农历', '换算'],
        说明: '公历农历干支生肖儒略日互查附四柱与时辰换算',
        run: function (ent, text) {
          if (!ent || !ent.date || !ent.date.year) return { prompt: '请给出要换算的日期，例如「2026年8月15日」。' };
          var y = ent.date.year, m = ent.date.month || 1, d = ent.date.day || 1;
          var r = CORE.fromSolar(y, m, d, ent.time ? ent.time.hour : 0);
          var wd = ['日', '一', '二', '三', '四', '五', '六'][new Date(y, m - 1, d).getDay()];
          var lines = ['【日期换算】' + y + '年' + m + '月' + d + '日（星期' + wd + '）：'];
          lines.push('农历：' + r.lunar.text + '；干支四柱：' + r.ganzhi.年.干支 + ' ' + r.ganzhi.月.干支 + ' ' + r.ganzhi.日.干支 + ' ' + r.ganzhi.时.干支 + '。');
          lines.push('生肖：' + r.ganzhi.年.生肖 + '；儒略日：' + Math.round(CORE.julianDay(y, m, d, 0, 0, 0)) + '。');
          return { text: lines.join('\n') };
        }
      },
  {
        key: 'huangli', 名: '每日黄历（老黄历·宜忌·建除·黄道·二十八宿）',
        板块: '黄历择日', 短名: '查黄历',
        触发词: ['黄历', '老黄历', '今日黄历', '每日宜忌', '今日宜忌', '通胜', '宪书', '今日冲煞', '值日天神', '今日财神方位', '今日喜神'],
        说明: '按当日干支排宜忌建除黄道二十八宿彭祖胎神冲煞',
        run: function (ent, text) {
          if (!SHEN || !SHEN.daily) return { text: '【黄历】内核未加载，暂不可用。' };
          var y, m, d, 今天 = false;
          if (ent && ent.date && ent.date.year) { y = ent.date.year; m = ent.date.month || 1; d = ent.date.day || 1; }
          else { var now = new Date(); y = now.getFullYear(); m = now.getMonth() + 1; d = now.getDate(); 今天 = true; }   // 缺省=今天
          var r;
          try { r = SHEN.daily(y, m, d); } catch (e) { return { text: '【黄历】起历失败：' + String(e && e.message ? e.message : e) }; }
          var wd = ['日', '一', '二', '三', '四', '五', '六'][new Date(y, m - 1, d).getDay()];
          var L = ['【每日黄历】' + y + '年' + m + '月' + d + '日（星期' + wd + '）' + (今天 ? '（今天）' : '') + '：'];
          L.push('农历 ' + r.lunar.text + '，干支 ' + r.ganzhi.年.干支 + '年 ' + r.ganzhi.月.干支 + '月 ' + r.ganzhi.日.干支 + '日，属' + r.ganzhi.年.生肖 + '。');
          L.push('建除值神 ' + (r.值星 || '—') + '，' + (r.天神类 || '') + '日天神 ' + (r.天神 || '—') + '（' + (r.天神吉凶 || '') + '）。');
          L.push('二十八宿 ' + (r.二十八宿.宿 || '—') + '（' + (r.二十八宿.吉凶 || '') + (r.二十八宿.动物 ? '·' + r.二十八宿.动物 : '') + '），日九星 ' + (r.九星 || '—') + '。');
          L.push('彭祖百忌：' + (r.彭祖百忌.干 || '—') + '，' + (r.彭祖百忌.支 || '—') + '。');
          L.push('胎神占方 ' + (r.胎神 || '—') + '。');
          L.push('吉神五方：喜神' + (r.方位.喜神 || '—') + '、福神' + (r.方位.福神 || '—') + '、财神' + (r.方位.财神 || '—') + '、阳贵' + (r.方位.阳贵 || '—') + '、阴贵' + (r.方位.阴贵 || '—') + '。');
          L.push('冲煞：冲' + (r.冲煞.冲生肖 || '—') + '（' + (r.冲煞.冲 || '—') + '），煞方' + (r.冲煞.煞方 || '—') + '。');
          L.push('【宜】' + ((r.宜 && r.宜.length) ? r.宜.join('、') : '（无）') + '。');
          L.push('【忌】' + ((r.忌 && r.忌.length) ? r.忌.join('、') : '（无）') + '。');
          if (r.吉神宜趋 && r.吉神宜趋.length) L.push('吉神宜趋：' + r.吉神宜趋.join('、') + '。');
          if (r.凶煞宜忌 && r.凶煞宜忌.length) L.push('凶煞宜忌：' + r.凶煞宜忌.join('、') + '。');
          if (r.节日 && r.节日.length) L.push('节日：' + r.节日.join('、') + '。');
          // 法定节假日安排（v3.4.0，数据源 = 国务院公告，见 CoreModule/festival.js）
          //   只在该年数据已收录时输出；未收录的年份不瞎猜，静默省略。
          if (r.法定假期) L.push('法定节假日：' + r.法定假期.名 + '（' + (r.法定假期.说明 || r.法定假期.类型) + '）。');
          // 神煞断语层（v3.1.49 新增，huangli-duanyu）：建除/值神/吉神/凶煞 逐条给「何意·主何·趋避」
          if (HLD && HLD.JIANCHU) {
            // 逐项**独立成行**（不用中文分号连接，守「切段安全」护栏）
            var jd = HLD.jianchuOf(r.值星);
            if (jd) L.push('【神煞断语·建除】' + r.值星 + '日：' + jd);
            var zd = HLD.zhIShenOf(r.天神);
            if (zd) L.push('【神煞断语·值神】' + r.天神 + '：' + zd);
            var gs = [], xs = [];
            (r.吉神宜趋 || []).forEach(function (n) { var t = HLD.shenshaOf(n); if (t) gs.push(n + '——' + t); });
            (r.凶煞宜忌 || []).forEach(function (n) { var t = HLD.shenshaOf(n); if (t) xs.push(n + '——' + t); });
            if (gs.length) L.push('【神煞断语·吉神宜趋】' + gs.slice(0, 6).join(' '));
            if (xs.length) L.push('【神煞断语·凶煞宜忌】' + xs.slice(0, 6).join(' '));
          }
          L.push('（宜忌、值神、冲煞等为传统通书数据，走 lunar 底座口径，与「择日」同一数据源，作日常参考，具体大事请结合专业日课。）');
          return { text: L.join('\n') };
        }
      },
  ];

  /**
   * 板块（分类）定义 —— 只服务「功能介绍」页把全部功能分组展示，**不参与路由**。
   *   顺序 = 介绍页自上而下的顺序；「名」必须与各功能条目的「板块」字段逐字一致
   *   （tools 下的 catalog 测试会逐条校验，写错即红）。
   *   加新功能时：FEATURES 里写清 板块 + 短名 即可，本表只在开新板块时才动。
   */
  var BANKS = [
    { 名: '命理排盘', 说明: '四柱与紫微的排盘、运程与断法，按出生时间一次排齐。' },
    { 名: '三式推演', 说明: '奇门、大六壬、六爻、梅花四套古法，各按本门起局断事。' },
    { 名: '风水堪舆', 说明: '命卦、坐向、飞星、户型，按规则查吉凶，不现场编。' },
    { 名: '黄历择日', 说明: '黄历宜忌与公农历换算，按通书口径逐项列出。' },
    { 名: '相术占验', 说明: '灵签、解梦、答案之书，传统词库与心理向双栏参考。' }
  ];

  /**
   * 把功能的长「说明」压成一句 28 字以内的简介（介绍页每行用）。
   * 做法纯机械、不改语义：去括号补充 → 去内核编号（C07/C25）与书内小节号（§8.2）
   * → 只取第一个短句（遇「，。；：·」即断）→ 超长才截断加省略号。
   * 目的是「不新增第二份文案真源」：简介永远由说明派生，改说明即改简介。
   */
  function briefOf(s) {
    s = String(s || '');
    s = s.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '');  // 去中文/英文括号补充
    s = s.replace(/\s*C\d+\s*/g, ' ').replace(/\s*§[\d.]+\s*/g, ' '); // 去内核编号与小节号
    s = s.replace(/\s{2,}/g, ' ').trim();
    // 取第一个非空短句（有的说明以「C31：」开头，去掉编号后会留下空段，故要跳过空段）
    var segs = s.split(/[，。；：]/), out = '';
    for (var i = 0; i < segs.length; i++) {
      var t = segs[i].replace(/^[、，。；：\s]+/, '').trim();
      if (t) { out = t; break; }
    }
    if (out.length > 28) {
      // 超长才截断：优先在「·」「/」这类并列符处收口，避免截在半个词上
      var cut = out.slice(0, 28);
      var idx = Math.max(cut.lastIndexOf('·'), cut.lastIndexOf('/'));
      out = (idx >= 12 ? cut.slice(0, idx) : cut) + '…';
    }
    return out;
  }

  /**
   * 功能总览（介绍页数据源）：按 BANKS 顺序把 FEATURES 分组。
   * 返回 [{ 板块, 说明, 项数, items: [{ key, 短名, 名, 简介 }] }]。
   * 版块与条目全从同一张 FEATURES 派生，故「功能数 / 版块数」永远不会和实际脱节。
   */
  function catalog() {
    var out = [];
    for (var b = 0; b < BANKS.length; b++) {
      var bank = BANKS[b], items = [];
      for (var i = 0; i < FEATURES.length; i++) {
        var f = FEATURES[i];
        if (f.板块 !== bank.名) continue;
        items.push({ key: f.key, 短名: f.短名, 名: f.名, 简介: briefOf(f.说明) });
      }
      out.push({ 板块: bank.名, 说明: bank.说明, 项数: items.length, items: items });
    }
    return out;
  }

  // 紫微：主星串的显示写法（空宫不再套一层「「（空宫）」」双括号）
  function starPhrase(v) {
    v = String(v == null ? '' : v);
    return (!v || v === '（空宫）') ? '（空宫）' : '「' + v + '」';
  }

  // 路由：命中触发词**最长（最具体）**者优先（如「八字神煞」不会被「八字」抢）；
  //      v3.3.0：「周易 64 卦查卦辞」功能移除后，原先的「64 卦全名 → 周易」兜底也一并删除，
  //      否则会返回一个已不存在的 key（挂了还装作能算）。
  function match(text) {
    text = String(text || '');
    var best = null, bestLen = 0;
    for (var i = 0; i < FEATURES.length; i++) {
      var f = FEATURES[i];
      for (var k = 0; k < f.触发词.length; k++) {
        var w = f.触发词[k];
        if (text.indexOf(w) >= 0 && w.length > bestLen) { best = f; bestLen = w.length; }
      }
    }
    if (best) return best;
    // 八宅坐向兜底：命中「坐北/坐南/…/朝X」等坐向说法 → fengshui
    if (/坐(北|南|东|西|东北|东南|西北|西南)|朝(北|南|东|西)/.test(text)) {
      for (var fs = 0; fs < FEATURES.length; fs++) if (FEATURES[fs].key === 'fengshui') return FEATURES[fs];
    }
    return null;
  }

  // —— 功能「常用性」次序（一个输入命中多个功能时，按此顺序依次输出）——
  // 只服务多命中排序，不改各功能定义；未列入者排最后（按 FEATURES 原序）。
  // 排序原则：大众化、日常用得多的在前（八字/紫微/奇门/六爻/梅花…），
  // 专项/进阶/冷门在后（各家奇门变体、进阶断法）。
  var COMMON_ORDER = [
    'bazi-chart', 'ziwei', 'qimen', 'liuyao', 'meihua',
    'feixing', 'bazhai', 'fengshui', 'yangzhai', 'qianwen',
    'dayun', 'bazi-pattern', 'bazi-shensha', 'bazi-hehun', 'ziwei-sihua',
    'qimen-ri', 'qimen-ke', 'qimen-nianyue', 'qimen-fei', 'qimen-ge',
    'liuren', 'liuren-bifa', 'liuyao-wangshuai',
    'huangli', 'date-convert'
  ];
  // 通用动作词：单独命中它不算「用户点名了某算法」（如「奇门遁甲排盘」里的「排盘」不该再带出一个八字排盘）
  var GENERIC_TRIGGERS = ['排盘', '排', '查', '看', '解'];

  function commonIndexOf(key) {
    var i = COMMON_ORDER.indexOf(key);
    if (i >= 0) return i;
    for (var j = 0; j < FEATURES.length; j++) if (FEATURES[j].key === key) return COMMON_ORDER.length + j;
    return 9999;
  }

  /**
   * 多命中路由（用户需求：一个输入可按常用性顺序依次调用多个算法、并列输出）：
   *   ① 收集每个功能「命中的最长触发词」；
   *   ② 去从属：若某功能的命中词是另一功能命中词的**真子串**（如「紫微」⊂「紫微飞星」、「八字」⊂「八字神煞」、
   *      「奇门」⊂「日家奇门」），则被包含者剔除（保留更长更具体的那个）——这是现有「最长优先」原则的多命中推广；
   *   ③ 通用动作词保护：仅靠「排盘/排/查/看/解」这类通用词命中的功能，若同段还有别的实质命中，则不列；
   *   ④ 无触发词命中时，回落 match() 的兜底（坐向），返回至多一个。
   * @returns {Array<{key,名,板块,短名,命中词,常用序}>} 按常用性升序
   */
  function matchAll(text) {
    text = String(text || '');
    var hits = [];
    for (var i = 0; i < FEATURES.length; i++) {
      var f = FEATURES[i], bestWord = '', bestLen = 0;
      for (var k = 0; k < f.触发词.length; k++) {
        var w = f.触发词[k];
        if (text.indexOf(w) >= 0 && w.length > bestLen) { bestWord = w; bestLen = w.length; }
      }
      if (bestLen > 0) hits.push({ f: f, word: bestWord, len: bestLen });
    }
    if (!hits.length) {
      var fb = match(text);  // 复用兜底（坐向）
      if (fb) return [{ key: fb.key, 名: fb.名, 板块: fb.板块, 短名: fb.短名, 命中词: '', 常用序: commonIndexOf(fb.key) }];
      return [];
    }
    // 去从属：被更长命中词包含者剔除（不同 key 之间）
    var kept = hits.filter(function (a) {
      for (var j = 0; j < hits.length; j++) {
        var b = hits[j];
        if (b.f.key !== a.f.key && b.word.length > a.word.length && b.word.indexOf(a.word) >= 0) return false;
      }
      return true;
    });
    // 通用动作词保护
    var hasSubstantive = kept.some(function (a) { return GENERIC_TRIGGERS.indexOf(a.word) < 0; });
    if (hasSubstantive) kept = kept.filter(function (a) { return GENERIC_TRIGGERS.indexOf(a.word) < 0; });
    // 按常用性排序
    kept.sort(function (a, b) { return commonIndexOf(a.f.key) - commonIndexOf(b.f.key); });
    return kept.map(function (a) {
      return { key: a.f.key, 名: a.f.名, 板块: a.f.板块, 短名: a.f.短名, 命中词: a.word, 常用序: commonIndexOf(a.f.key) };
    });
  }

  function run(key, ent, text) {
    for (var i = 0; i < FEATURES.length; i++) if (FEATURES[i].key === key) return FEATURES[i].run(ent, text) || {};
    return { prompt: '未知功能：' + key };
  }

  return {
    FEATURES: FEATURES,
    keys: FEATURES.map(function (f) { return f.key; }),
    match: match,
    matchAll: matchAll,      // 多命中（按常用性排序）——一个输入可依次调用多个算法
    run: run,
    catalog: catalog,   // 介绍页用：按板块分组的功能总览（与 FEATURES 同一真源）
    BANKS: BANKS        // 板块顺序与说明（介绍页只读）
  };
});
