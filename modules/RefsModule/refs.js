/**
 * modules/RefsModule/refs.js —— 「参考文献」页的书目与可查原文【单一真源】
 *
 * 干什么：「关于 → 参考文献」页原来只有「书目 + 查证状态」的文字描述，用户看不到原文。
 *   本模块把两块合起来：
 *     ① BOOKS —— 全书目表（书名 / 朝代作者 / 是否公版 / 查证状态正文），
 *        与各内核头注释、缺口字段逐字一致，不臆造书名、不美化状态；
 *     ② QUOTERS —— 公版古籍的**可查原文**：只从各内核已锁定的结构化数据里汇整，
 *        零二次转录、零新录入（原文单一真源仍在各内核文件里，这里只是「读出来、排成页」）。
 *
 * ── 版权边界（法律红线，不可含糊）────────────────────────────────────────────
 *   · 公版 = true（明清及以前传本、作者不详的民俗文本，如《周易》十三经本、
 *     《紫微斗数全书》、《六壬大全》、观音灵签）→ 可在应用内附原文片段；
 *   · 公版 = false（开源库、现代著作、网站整理件，如 lunar-javascript/MIT、
 *     霍斐然《周易小成图简述》、高山青《世界相命全集》、各易学网站转录）→
 *     **只列书目与来源，不载原文**，请用户阅原书；本项目不侵犯他人著作权。
 *   · 判定只按「作品是否已过著作权保护期 / 是否有现行授权」这一把尺子，
 *     与内容质量、查证状态无关（查证再扎实的现代著作也不入包原文）。
 *
 * ── 与现有架构的关系（为什么这样放）────────────────────────────────────────
 *   · 原文数据散在内核里（ziwei-duanyu 的 168 格、iching-text 的 64 卦…），
 *     按「全代码单一引用、不复制」铁律，本模块**不抄任何原文**，只运行时读；
 *   · 本文件被内核依赖（ziwei-duanyu / iching-text / guanyin-data / liuren-bifa），
 *     故与内核同放**分包 occupy-cores**（小程序端），Node/uni 直require、PWA 取 NT.core.* 全局；
 *   · 「参考文献」页在小程序端必须**同步秒开**（不能为看书目加载整个分包），
 *     故 settings.js 用的是一份**主包快照**（HomeModule/refs-snapshot.js，
 *     由 tools/sync-mp.js 构建期从本模块的 refsPage() 提取，与 catalog.js 同一机制），
 *     单一真源仍是本文件。
 *
 * 加载：UMD —— Node/小程序(分包内) require（相对路径注入 4 个内核）；浏览器挂 NT.refs。
 * 校验：modules/RefsModule/__tests__/refs.test.js（书目唯一性 / 原文条数与内核一致 / 版权边界）。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node / uni-app / 小程序分包内：同步 require 同仓内核（refs.js 与内核同在 occupy-cores，
    //   分包内互相 require 合法；主包不许静态 require 分包文件，故 settings.js 不直接依赖本文件）
    module.exports = factory(
      require('../CoreModule/ziwei-duanyu.js'),
      require('../CoreModule/iching-text.js'),
      require('../CoreModule/guanyin-data.js'),
      require('../CoreModule/liuren-bifa.js')
    );
  } else {
    // 浏览器（PWA）：内核已由 <script> 挂到 NT.core.*（加载链保证它们在本文件之前）
    root.NT = root.NT || {};
    root.NT.refs = factory(
      root.NT.core && root.NT.core.ziweiDuanyu,
      root.NT.core && root.NT.core.ichingText,
      root.NT.core && root.NT.core.guanyinData,
      root.NT.core && root.NT.core.liurenBifa
    );
  }
})(typeof self !== 'undefined' ? self : this, function (ZIWEI_DY, ICHING_T, GUANYIN, BIFA) {

  /**
   * 书目单一真源。
   * 字段（大白话）：
   *   id     —— 唯一键（测试与引用用，不展示）
   *   h      —— 页面上显示的小标题（沿用历史文案，逐字未改）
   *   朝代   —— 作者/朝代/授权信息（展示用）
   *   公版   —— true=可附原文；false=有版权的现代作品/库，只列书目（见文件头版权边界）
   *   quoter —— 原文汇整键（对应下面 QUOTERS；null = 暂无结构化原文可挂）
   *   text   —— 查证状态正文（与各内核头注释一致；状态四档：✅已锁/✅已核/⚠单源待验/◆本项目独有）
   *
   * ⚠️ 顺序即页面顺序：先按领域列全书目，最后是「算法示例」。
   */
  var BOOKS = [
    { id: 'lunar-js', h: '历法底座 · lunar-javascript', 朝代: '6tail（MIT 授权）', 公版: false, quoter: null,
      text: '公历↔农历、四柱干支、节气、纳音、旬空、每日宜忌等走内嵌 lunar-javascript（6tail，MIT 授权，构建期资产，运行时不联网）；本项目的口径封装（年柱立春换年、月建节气定、子时归属）在适配层 lunar.js，读 config.js 开关。状态：✅已核（基准例 2005-06-09 子时 → 乙酉/壬午/甲子/甲子 锁死）。' },
    { id: 'noaa-solar', h: '廿四节气 · NOAA 太阳黄经式', 朝代: 'NOAA 公式（公有领域算法）', 公版: false, quoter: null,
      text: '节气时刻基于 NOAA 太阳黄经低精度式 + 二分求交节，精确到「天」（东八区）；年柱以「立春」换年（节气定界，非阳历 1 月 1 日）。状态：✅已核。' },
    { id: 'wuhu-wushu', h: '四柱排盘 · 五虎遁五鼠遁', 朝代: '传统口诀（作者不详传本）', 公版: true, quoter: null,
      text: '月柱 = 节气定月建 + 五虎遁（年干起寅月干）；时柱 = 五鼠遁（日干起子时干）；日柱 = 甲子纪日（儒略日计数、锚点常量内置）。状态：✅已核（lunar-javascript 口径 + 本项目基准例）。' },
    { id: 'jianchu', h: '建除十二神 · 黄黑道口诀', 朝代: '传统口诀（作者不详传本）', 公版: true, quoter: null,
      text: '以节气月建 + 日支推「建除满平定执破危成收开闭」值日；黄黑道按口诀「建满平收黑，除危定执黄；成开皆可用，闭破不可当」（5 源一致：造福堂/微运堂/杨筠松文化中心/易公子/天天黄历）。状态：✅已核。' },
    { id: 'pengzu', h: '五行与宜忌 · 彭祖百忌', 朝代: '传为彭祖（作者不详传本）', 公版: true, quoter: null,
      text: '天干/地支五行生克、地支六冲、得令得地得势（日主旺衰）内置静态表（见 db.js，大白话注释）；彭祖百忌按当日天干、地支各出一条忌（天干 10 条 + 地支 12 条，查证标准版存 db.js）。状态：✅已核。' },
    { id: 'jinhanyujing', h: '神煞 ·《金函玉镜》', 朝代: '题汉·诸葛亮（传本）', 公版: true, quoter: null,
      text: '天乙贵人口诀「甲戊兼牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，庚辛逢马虎」出《金函玉镜》（内置为 zeri.js 的 GUI_REN 单一真源，八字神煞复用不复制）；太极/文昌/天德/月德/驿马/桃花/华盖/将星/劫煞/灾煞/亡神/孤辰寡宿/禄神/羊刃/金舆/天医/红鸾天喜共 21 类为子平通用表，各行注明查法。状态：✅已核；羊刃阴干取法、天德干/支取法两处流派并存已如实标注。' },
    { id: 'ziping-geju', h: '子平格局 ·《子平真诠》《穷通宝鉴》《滴天髓》', 朝代: '清·沈孝瞻 / 明·余春台 / 相传唐·京图', 公版: true, quoter: null,
      text: '取格八法依《子平真诠》「八字用神，专求月令」（月支本气透干优先，多源一致：原义+算准网+易德轩+读书笔记）；调候用神取《穷通宝鉴》十干十二月；日主强弱五档与扶抑分层为本项目自研，依《滴天髓》《子平真诠》规则。状态：取格/调候 ✅已核；旺衰分层 ◆自研（规则出处已注明）。' },
    { id: 'qimen-shijia', h: '奇门时家 ·《奇门遁甲统宗》', 朝代: '明·佚名（传本）', 公版: true, quoter: null,
      text: '时家奇门转盘(排宫)法·拆补定局，逐行对照《奇门遁甲统宗》卷一 + 多源交叉；定局表（阴阳遁各 12 节气局数）已多源核对一致。状态：✅已锁——阴阳遁双盘 qimen.pro 黄金盘逐宫锁死（九星/八门/八神 8/8 全中；阳遁 2002-03-20 丙午时、阴遁 3 局丁巳时两盘）。' },
    { id: 'qimen-feipan', h: '奇门飞盘 · 黄金范例', 朝代: '传统技法（传本）', 公版: true, quoter: null,
      text: '飞盘奇门（飞宫法）复用时家定局，重写三盘飞布（九星按宫数阳顺阴逆、八门跳中五）。状态：✅已锁（黄金范例逐宫锁死）。' },
    { id: 'qimen-geju', h: '奇门格局 · 吉凶象意', 朝代: '现代整理（易德轩/玄霖易学）', 公版: false, quoter: null,
      text: '奇门吉凶格局象意取自《奇门遁甲的预测依据与信息象意》（易德轩/玄霖易学同文）+ 易德轩《常用吉格分析》，3 源一致。状态：✅已核；异说并存已标注（清抄本《拨雾经》天人地遁与主流三源不同，本内核采主流并注明）。' },
    { id: 'qimen-nianyue', h: '奇门年家月家 ·《统宗》卷二', 朝代: '明·佚名（传本）', 公版: true, quoter: null,
      text: '年家/月家奇门依《奇门遁甲統宗》卷二「附年奇門起例」「附月奇門起例」，3 源逐字一致；三元 1/4/7 局（上元甲子 1864/中元 1924/下元 1984）。状态：起例 ✅已核；整盘 ⚠ 仅验内部自洽 + 一条原文自证（1864 甲子年伏吟），未外部整盘锁死（缺口已标）。' },
    { id: 'qimen-rike', h: '奇门日家刻家', 朝代: '日家传统 + 刻家现代教材', 公版: false, quoter: null,
      text: '日家奇门 60 日一局·值符随日干，5 源一致 + 2004-08-06 黄金范例（✅已核）；刻家奇门主张实质单源（《奇门遁甲预测学试行教材》第四章，其余为镜像转载），无完整刻盘算例 → ⚠ 单源待验，飞布仅自洽、未外部锁死，缺口已如实标注。' },
    { id: 'liuren-zhinan', h: '大六壬 ·《大六壬指南》《壬归》《心印赋》', 朝代: '清·郭御青 / 明·佚名 / 传本', 公版: true, quoter: null,
      text: '时家大六壬·月将加占时；月将表（中气换将）、日干寄宫、天地盘公式 5 源逐字一致，天地盘手工核验《心印赋》「亥加午、子加未」；初传取「受克之神」锁死于黄金范例。状态：✅已锁；连茹「孟仲季」各路划分不一，只报顺逆+三相连，未锁（⚠）。' },
    { id: 'bifa', h: '大六壬 ·《毕法赋》', 朝代: '清·凌福之（四库《六壬大全》卷九/十一）', 公版: true, quoter: 'bifa',
      text: '《毕法赋》一百法目录取四库全书《六壬大全》卷九/卷十一（凌福之撰），维基文库/Chinese Text Project/开运龙/六壬网 4 源一致；原书卷十一编号脱误（第 51 法后直跳 53 法）已按实际顺序重编 1–100 并标注；可机器判定 18 条逐条检出。状态：目录 ✅已核。' },
    { id: 'liuren-xifen', h: '大六壬 · 细分断语', 朝代: '《灵觉经》等古籍传本', 公版: true, quoter: null,
      text: '连茹起法《灵觉经》、孤虚《戎事类占》、应期多源古籍口径（含《东方朔射覆》）；天马/驿马/旬空为通用神煞表。状态：细分 ⚠单源待验（各本划分不一，内核只输出确定性部分，逐条注明）。' },
    { id: 'jinkou', h: '金口诀 ·《大六壬金口诀》', 朝代: '明·适适子', 公版: true, quoter: null,
      text: '明·适适子《六壬神课金口诀》（影印本）/ 易德轩本 / 国易堂《金口诀怎样布课》/ 汉同文《新编大六壬金口诀》/ 知行易学 / 卦无忧共 5 源一致；起课四步、定用爻、五动三动 + 黄金盘逐位核对。状态：✅已锁；五动爻诵原歌（五动×八句）5 源逐字一致，只作旧说并列、不作吉凶断言；换将口径「过节换将」为双流中主采一派，已注明。' },
    { id: 'liuyao', h: '六爻 · 京房纳甲 +《增删卜易》《卜筮正宗》《黄金策》', 朝代: '汉·京房 / 清·野鹤老人 / 明·刘伯温', 公版: true, quoter: null,
      text: '八宫卦序/纳甲/安世应走京房法（八宫歌与装干支诀多源逐字一致）；分门断语形式化自《黄金策》用神—原神—忌神四层生克；旺衰进阶多源核对。状态：盘面 ✅已锁；深入细则（暗动/墓绝/三合局/化进化退）⚠ 待黄金盘裁定，已如实标注不假报。' },
    { id: 'taiyi', h: '太乙 ·《金镜式经》', 朝代: '唐·王希明', 公版: true, quoter: null,
      text: '积年 1937281+(Y−724) 取《金镜式经》724 年基点公认口径（多套上元仅平移整数，不影响局数相对排布）；十六神固定顺布 5 源逐字一致。状态：十六神/二目 ✅已核；落宫移宫年限（3 年/9 年异说）与主客算 ⚠ 待黄金盘验证，本内核只输出确定性项。' },
    { id: 'ziwei-iztro', h: '紫微 · iztro 2.6.2 + 中州派', 朝代: 'iztro（MIT）/ 中州派·陆斌兆（现代）', 公版: false, quoter: null,
      text: '安星法/命盘/大限走内嵌 iztro 2.6.2（MIT，798KB 自包含，运行时不联网），薄适配层不自研安星；十天干四化表取中州派（陆斌兆）口径，并与 iztro 逐干反推 10/10 全等；星情宫义五源互校。状态：✅已核；换派须整表替换、不得混用。' },
    { id: 'astro', h: '占星 · astronomy-engine + Meeus', 朝代: 'astronomy-engine（MIT）/ Meeus 现代著作', 公版: false, quoter: null,
      text: '七政四余黄经走内嵌 astronomy-engine（JPL 级星历，运行时不联网）；三余（罗睺/计都/紫炁）用 Meeus《Astronomical Algorithms》均值算法；宫位/阿拉伯点/相位口径多源核对（含 Robert Hand《Horoscope Symbols》）。状态：✅已锁（7 政回归经真值对拍 + 三余 Meeus 均值）。' },
    { id: 'name81', h: '姓名 · 熊崎健翁 81 数理 + 康熙笔画', 朝代: '熊崎健翁（近代）/ TDEM kangxi-strokecount（MIT）', 公版: false, quoter: null,
      text: '81 数理吉凶档位取熊崎健翁标准表（5 源核对；交界数 27/42/43/49/55/72/73 各刊本或标半吉或标凶，本处取半吉档并注明）；康熙笔画走 TDEM kangxi-strokecount（MIT）+ opencc 简繁生成，覆盖通用规范汉字 3500 字。状态：✅已核。' },
    { id: 'fengshui', h: '风水 ·《沈氏玄空学》与八宅阳宅', 朝代: '民国·沈竹礽 / 八宅传统', 公版: true, quoter: null,
      text: '九宫飞星（年/月/日/时紫白）公式 5 源交叉核对（依《沈氏玄空学》三元九运）；八宅命卦、阳宅缺角/厨厕/门对门为主流派规则。状态：飞星 ✅已核；缺角判定等流派差异 ⚠ 已逐条标注（如「一米以上算缺」各派不一）。' },
    { id: 'xiangshu', h: '相术 ·《神相全编》等通则', 朝代: '《麻衣神相》《柳庄相法》《神相全编》《相理衡真》', 公版: true, quoter: null,
      text: '面相十二宫/三停/五岳四渎/五官/手相三大线辅线/手型五行/九骨名目，对应《麻衣神相》《柳庄相法》《神相全编》《相理衡真》通则，多源一致。状态：✅已核（B 类词库，逐条注明出处通则）。' },
    { id: 'qianwen-misc', h: '签文解梦塔罗 · 观音灵签等', 朝代: '公版/传统词库（塔罗 78 张、解梦、雷诺曼、如尼）', 公版: true, quoter: null,
      text: '观音灵签 100 签三源比对（主源天天灵签网 2026-10-17 逐签抓取，统一取「主源∩校一版本一」一系，不混本）；塔罗 78 张、解梦词典 14 类 161 条（传统向+心理向）、占星骰子 1440 组合、答案之书、雷诺曼 36 张、如尼 24 符均为公版/传统词库。状态：✅已核（异本情况逐条标注）。' },
    { id: 'yizhangjing', h: '一掌经 ·《神机妙算·达摩一掌经》', 朝代: '传为达摩（传本）', 公版: true, quoter: null,
      text: '一掌经起法 5 源核对（年宫落生年地支、男顺女逆等铁律）；小六壬/马前课/节律为通用口诀。状态：✅已核。' },
    { id: 'cezi', h: '测字 ·《测字秘牒》+ 康熙笔画', 朝代: '清·程省', 公版: true, quoter: null,
      text: '康熙笔画同姓名学单一真源（不另起一套）；《测字秘牒》十法待权威全本比对，本内核只做数理五行+起卦+增删提示+事类比对四类通用法。状态：四通用法 ✅已核；十法 ⚠ 待权威全本（缺口已标）。' },
    { id: 'xiaocheng', h: '小成图 ·《周易小成图简述》', 朝代: '霍斐然（现代著作，版权作品）', 公版: false, quoter: null,
      text: '霍斐然《周易小成图简述》原文 + 易德轩/卦无忧等 8 处转述；起卦（天地数表）、九宫装图、归藏中宫、取用应期有 1136 外部算例逐宫锁死。状态：骨架 ✅已锁；「阖辟往来」四势吉凶与五行生克转述版互斥（单源），本内核只做象数结构定位、不硬下断语（◆不硬下）。' },
    { id: 'shuzi', h: '数字命理 · 本项目独有', 朝代: '星玖工作室自研', 公版: false, quoter: null,
      text: '数字八字与八星磁场为自研体系，依项目内部文档（无外部公开权威可核对），已按铁律标「本项目独有/无外部权威」，不作权威断言。状态：◆自研。' },
    { id: 'yijing', h: '易经 · 64 卦经文', 朝代: '《十三经》通行本（与维基文库互校）', 公版: true, quoter: 'yijing',
      text: '卦辞/爻辞/大象取《十三经》通行本（与维基文库互校），字句未改；白话为本应用主旨概括、非古籍原文；起卦/互变/体用为通用规则（自研）。状态：经文 ✅已核；起卦规则 ◆自研（通用规则）。' },
    { id: 'guanyin', h: '观音灵签 · 一百签签文', 朝代: '民间传本（作者不详、流传数百年）', 公版: true, quoter: 'guanyin',
      text: '签诗/诗意/解曰/圣意四件套逐签照排。主源天天灵签网（2026-10-17 逐签抓取），校一农历114、校二观音灵签解签；统一取「主源∩校一版本一」一系，不混本；第 1 签「锤离」订正为「钟离」，62/74/75/84 签残缺字段取校一，第 100 签保留原句体例。状态：✅已核（异本逐条标注，见 guanyin-data.js 头注）。' },
    { id: 'ziwei-benshu', h: '紫微斗数全书 · 断语库原文（168 格）', 朝代: '明·罗洪先辑（旧题宋·陈希夷）', 公版: true, quoter: 'ziwei',
      text: '十四主星 × 十二人事宫共 168 格古籍断语，照引不改字。来源分层级：卷一「诸星问答论」为主源；卷二「诸宫问答」据 ziwei.pro / bzwai / 古文岛三处独立转录交叉补齐 56 格；「七杀·财帛宫」据明清流传《星曜飞躔十二宫》（易德轩/六都命理/紫微府/壹风水 4 源逐字一致）补齐，附王亭之一系歌诀两源标「本派传」——来源层级在 ziwei-duanyu.js 头注与各条原文内如实注明，不假称卷二。状态：原文 ✅已核（非黄金盘逐宫锁死层级）。' }
  ];

  /**
   * 原文汇整器（quoter）。每个函数返回 [{h: 页内小标题, text: 原文一段}]。
   * ⚠️ 只读内核已有数据，不改写、不补字；取不到（模块未加载）时返回空数组，
   *    由 refsPage() 降级为「仅列书目」，绝不编造原文。
   */
  var QUOTERS = {
    // 紫微斗数全书：STAR12[主星].原文 = [{宫, 文}]，十四主星 × 十二宫共 168 格
    ziwei: function () {
      var out = [];
      if (!ZIWEI_DY || !ZIWEI_DY.STAR12) return out;
      var PAL_FULL = ZIWEI_DY.PAL_FULL || {};
      Object.keys(ZIWEI_DY.STAR12).forEach(function (star) {
        var d = ZIWEI_DY.STAR12[star];
        (d.原文 || []).forEach(function (q) {
          out.push({ h: '紫微 · ' + star + '居' + (PAL_FULL[q.宫] || q.宫), text: q.文 });
        });
      });
      return out;
    },
    // 周易·十三经本：GUA[序号] = {名, 象, 辞, 爻:[[爻位, 爻辞]], 白}，64 卦
    yijing: function () {
      var out = [];
      if (!ICHING_T || !ICHING_T.GUA) return out;
      Object.keys(ICHING_T.GUA).forEach(function (no) {
        var g = ICHING_T.GUA[no];
        var parts = ['卦辞：' + g.辞];
        (g.爻 || []).forEach(function (y) { parts.push(y[0] + '：' + y[1]); });
        parts.push('大象：' + g.象);
        out.push({ h: '周易 · 第' + no + '卦 ' + g.名, text: parts.join(' ') });
      });
      return out;
    },
    // 观音灵签：LIST 每项 [签号, 签名, 等级, 吉凶, 宫位, [签诗四句], 诗意, 解曰, 圣意]
    guanyin: function () {
      var out = [];
      if (!GUANYIN || !GUANYIN.LIST || !GUANYIN.byNo) return out;
      GUANYIN.LIST.forEach(function (r) {
        var q = GUANYIN.byNo(r[0]);
        if (!q) return;
        out.push({
          h: '灵签 · 第' + q.号 + '签 ' + q.名 + '（' + q.宫 + '·' + q.吉凶 + '）',
          text: '签诗：' + (q.诗 || []).join('，') + '。诗意：' + q.意 + '。解曰：' + q.解 + '。圣意：' + q.圣 + '。'
        });
      });
      return out;
    },
    // 毕法赋一百法：BIFA = [[编号, 法名, 档位], ...]（卷九上 1–70 / 卷十一下 71–100）
    bifa: function () {
      var out = [];
      if (!BIFA || !BIFA.BIFA) return out;
      BIFA.BIFA.forEach(function (b) {
        out.push({
          h: '毕法 · 第' + b[0] + '法 ' + b[1],
          text: '《六壬大全》' + (b[0] <= 70 ? '卷九上' : '卷十一下') + '，档：' + b[2] + '。'
        });
      });
      return out;
    }
  };

  /** 某本书的可查原文（非公版 / 无 quoter / 模块没加载 → 空数组，不编造） */
  function quotesOf(id) {
    var b = null;
    for (var i = 0; i < BOOKS.length; i++) { if (BOOKS[i].id === id) { b = BOOKS[i]; break; } }
    if (!b || !b.公版 || !b.quoter || !QUOTERS[b.quoter]) return [];
    return QUOTERS[b.quoter]() || [];
  }

  /** 原文总条数（页面导语与测试用） */
  function quoteCount() {
    var n = 0;
    BOOKS.forEach(function (b) { if (b.quoter) n += quotesOf(b.id).length; });
    return n;
  }

  /**
   * 「参考文献」面板条目（[{h, text}]，三端详情页渲染代码一行不改）。
   * 结构：凡例 → 一、书目与查证状态（逐本）→ 二、可查原文 · 公版古籍（逐条）→ 算法示例。
   */
  function refsPage() {
    var out = [];
    var pub = BOOKS.filter(function (b) { return b.公版; });
    var withQuotes = BOOKS.filter(function (b) { return b.quoter; });
    var total = quoteCount();

    out.push({
      h: '凡例 · 查证状态四档',
      text: '✅已锁：多源逐字一致，且有黄金盘/算例逐条锁死（可用断言回归）。✅已核：多源交叉一致，暂无完整算例锁死。⚠单源待验：实质只有单一来源，未锁、只作口径参考。◆本项目独有：自研体系，无外部公开权威，不作权威断言。本页列出的每条都与对应内核头注释、缺口字段一致。'
        + '另：下方「二、可查原文」仅收录**公版古籍**（明清及以前传本、作者不详民俗文本）的原文片段，直接取自本应用各内核已锁定的数据；开源库、现代著作与网站整理件有版权，只列书目与来源、不载原文，请阅原书。'
    });
    out.push({
      h: '一、书目与查证状态',
      text: '共 ' + BOOKS.length + ' 种参考：公版古籍 ' + pub.length + ' 种（其中 ' + withQuotes.length + ' 种在下方附可查原文，共 ' + total + ' 条）、开源库与现代著作 ' + (BOOKS.length - pub.length) + ' 种（版权作品，仅列书目）。'
    });
    BOOKS.forEach(function (b) {
      out.push({ h: b.h + (b.quoter ? '（附原文）' : ''), text: b.text });
    });
    out.push({
      h: '二、可查原文 · 公版古籍',
      text: '以下原文片段由本应用在各内核中已锁定的数据直接汇整（单一真源仍在内核文件，此处不复制、不改写、不补字）；'
        + '逐条来源层级与查证状态见「一、书目与查证状态」对应条目。滚动查找，或按条目前缀（紫微/周易/灵签/毕法）定位。'
    });
    BOOKS.forEach(function (b) {
      if (!b.quoter) return;
      var qs = quotesOf(b.id);
      if (!qs.length) {
        out.push({ h: b.h, text: '原文暂未加载（对应内核未进包），请刷新网页版或重新导入小程序包。' });
        return;
      }
      qs.forEach(function (q) { out.push(q); });
    });
    out.push({ h: '算法示例（白玖玖）', text: '例：白玖玖（女，2005 年 6 月 9 日子时）—— 排得「乙酉 / 壬午 / 甲子 / 甲子」，日主甲木生午月，得令得势，建除为「建」日，宜会亲友、忌动土。' });
    return out;
  }

  return {
    BOOKS: BOOKS,
    quotesOf: quotesOf,
    quoteCount: quoteCount,
    refsPage: refsPage,
    count: { 书目: BOOKS.length, 公版: BOOKS.filter(function (b) { return b.公版; }).length, 附原文书: BOOKS.filter(function (b) { return b.quoter; }).length }
  };
});
