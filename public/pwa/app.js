/**
 * 玄玖灵犀 NT-Xhex · 浏览器 PWA 壳（薄壳）
 *
 * 五视图：首页（输入）→ 结果页（展示分析）→ 关于页 → 关于我们页 → 内容详情页；不做聊天区、不显示历史。
 * 本壳只做三件事：① 用引擎+存储创建「问答」实例；② 视图切换与 DOM 绑定；③ 把 settings.js 的文案填进 DOM。
 *   · 问答行为  → modules/HomeModule/conversation.js
 *   · 结果排版  → modules/HomeModule/result-format.js
 *   · 品牌/备案/版权/页脚 → modules/SettingsModule/settings.js
 *   · 版式与视觉 → modules/UIModule/theme.css（CSS）＋ modules/ExportModule/export-image.js（导出图版式）
 * 以上均为单一真源，本壳内**不复制**任何一份。
 */
(function () {
  var N = window.NT || {};
  var $ = function (id) { return document.getElementById(id); };

  // 单一真源装配：引擎 + 存储 -> 问答行为（一份，三端共享）
  var conversation = N.conversation.createConversation({
    analyzer: N.analyzer,
    storage: N.storage
  });

  // ---- 视图切换（首页 / 结果 / 关于 / 关于我们 / 内容详情；清除缓存只弹窗不走二级页）----
  // 转场：PWA 无「上一页」DOM，走单层滑入 —— 方向类名由 transition.js 判（前进自右入 / 返回自左回），
  // 视觉 keyframe 全在 theme.css（.nt-slide-in / .nt-slide-in-back），本壳只负责挂/摘类。
  // display 由 none→flex 时浏览器会重播视图内的入场动画，无需额外代码。
  //
  // 内容错落入场的门控类 nt-cascade：**只在冷启动首屏保留**（首页写在 index.html 的初始 class 里，
  //   恢复上次结果时由 show(name, true) 现挂）。切页一律摘掉 —— 切页已有整层滑入承担位移，
  //   若内容再各自上浮一次，两种动效同期叠加会看成"重影"（用户实测反馈）。
  //   ⚠️ 必须「摘掉就不再挂回」：反过来写会因 animation-name 由 none 变回 nt-rise，凭空重启一次动画。
  var views = { home: $('v-home'), result: $('v-result'), about: $('v-about'), us: $('v-us'), detail: $('v-detail') };
  var detailBack = 'about'; // 内容详情页「‹」回哪一级：about（关于）/ us（关于我们），由 backTarget 决定
  var curView = 'home';
  var slide = (N.transition && N.transition.slideClass) || null;
  function show(name, boot) {
    // boot = 冷启动首屏：只播内容错落入场，不挂整层滑入 —— 两者同期叠加就是"重影"
    var cls = boot ? '' : (slide ? slide(curView, name) : 'nt-slide-in');
    var other = boot ? '' : (cls === 'nt-slide-in' ? 'nt-slide-in-back' : 'nt-slide-in');
    Object.keys(views).forEach(function (k) {
      var on = k === name;
      views[k].classList.toggle('on', on);
      if (cls) views[k].classList.toggle(cls, on);
      if (other) views[k].classList.remove(other);
      views[k].classList.toggle('nt-cascade', !!(on && boot));   // 只有冷启动首屏那一页带
    });
    curView = name;
  }

  // ---- 黑白主题（全局反色；危险红等语义色不翻）----
  // PWA 从 public/pwa/ 静态服务，logo 用相对前缀 ../../static/icons/（与本页 HTML 一致）；
  //   「深色用白色词标」的决策与小程序/uni-app 同一份（theme.js），此处只套本页路径前缀。
  var Theme = N.theme;
  var LOGO_BASE = '../../static/icons/';
  var heroLogo = $('heroLogo'), aboutLogo = $('aboutLogo'), splashLogo = $('splashLogo');
  function applyTheme(theme) {
    // 反色根（把 .nt-dark 挂到 documentElement）统一交给 theme.js 的 apply()（单一真源，
    // 不在这里再写一遍 class toggle）；本壳只负责「按主题换 logo」这件 PWA 专属的事。
    // 挂 documentElement 而不只是 #app：上下滑动越界时露出的是 <html>/<body> 的底色与
    // 浏览器原生 UI（滚动条/回弹底色），不跟 #app 走 → 深色下会闪白条。
    if (Theme && Theme.apply) Theme.apply();
    // 开屏 Logo 与首页/关于页同一份 themeLogo（单一真源 Theme.logoFor 决定深浅各用哪张）
    var name = theme === 'dark' ? 'logo-white.png' : 'logo.png';
    if (heroLogo) heroLogo.src = LOGO_BASE + name;
    if (aboutLogo) aboutLogo.src = LOGO_BASE + name;
    if (splashLogo) splashLogo.src = LOGO_BASE + name;
    // 浏览器自身色条（地址栏 / 状态栏区域）跟着主题，避免深色下顶部留一条白
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff');
  }
  if (Theme) applyTheme(Theme.current());   // 加载时按系统深浅/日出日落自动套色

  // ---- 主题切换过渡开关（theme.css 的 .nt-theme-fade 门控类）----
  // 必须在**首次 applyTheme 之后、同一 tick 内**挂上：
  //   · 同一 tick 内 → 浏览器还没为"浅色默认值"下过一次样式，所以冷启动不会先白后黑闪一次渐变；
  //   · 但用户第一次主动切换主题时它早已生效 → 那次切换才有 320ms 的颜色交叉过渡。
  // 挂 <html>（与 .nt-dark 同一个反色根），三端行为一致；详见 theme.css 该块的注释。
  if (document.documentElement) document.documentElement.classList.add('nt-theme-fade');

  // ---- 关于 / 页脚 / 首页免责：全部来自 settings.js 单一真源 ----
  var about = N.settings.about();
  var curResult = null;   // 当前展示的结果（导出图片要用）

  // ---- 开屏页（冷启动品牌瞬间：品牌组 Logo + 玄玖灵犀 + 副标 演乾坤·知天命，停留后退场）----
  // 文案单一真源 = settings.js 的 about().splash；视觉 = theme.css 的 .nt-splash*；
  // 时长用设计稿令牌 --d-splash(400ms)（开屏退场）+ 一段停留（1200ms，给品牌被记住的时长）。
  // 退场手法同弹窗：先挂 .nt-splash-out（播 品牌组缩放到起始页比例 nt-splash-brand-out +
  // 背景/副标淡出 nt-splash-bg，400ms），播完再摘节点 —— 直接摘则动画来不及播。
  // 品牌组（logo+玄玖灵犀）缩到 0.75（=起始页 Logo 比例 64.27/85.69）且同轴居中，
  //   摘节点瞬间正好落到起始页 logo 尺寸/位置 → 开屏与起始页「品牌交接」不闪不跳。
  // 开屏 overlay 层级 z-index:200（在弹窗 100 之上，冷启动先于一切展示）；摘掉后不再拦截点击。
  // ⚠️ 必须放在 about 声明之后（开屏文案取 about.splash）。
  var splash = $('splash');
  if (splash) {
    $('splashName').textContent = (about.splash && about.splash.title) || '';
    $('splashSub').textContent = (about.splash && about.splash.sub) || '';
    // 开屏停留/退场时长走 transition.js 的 TIMING（单一真源，三端共用；镜像 theme.css --d-splash）
    var splashHold = (N.transition && N.transition.TIMING) ? N.transition.TIMING.SPLASH_HOLD : 1200;
    var splashFade = (N.transition && N.transition.TIMING) ? N.transition.TIMING.SPLASH_FADE : 400;
    setTimeout(function () {
      splash.classList.add('nt-splash-out');
      setTimeout(function () {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, splashFade);
    }, splashHold);
  }


  // ---- 搜索框占位（固定一句话；内容来自 settings.js 的 searchPlaceholder 单一真源）----
  // 占据与滚动词条相同的 .nt-ph 裁切窗（48pt 高），样式复用 .nt-ph-item。
  var pill = $('heroPill');
  var phBox = $('heroPh');
  if (phBox && about.searchPlaceholder) {
    var phEl = document.createElement('span');
    phEl.className = 'nt-ph-item';
    phEl.textContent = about.searchPlaceholder;
    phBox.appendChild(phEl);
  }
  // 让位规则：**输入非空 或 已聚焦** → 给胶囊加 .nt-ph-off，把固定占位整体隐去
  //   （HIG：占位提示不与真实输入重叠；聚焦时也让位，因为微信官方文档写明「input 仅在 focus 时
  //    表现为原生组件」，聚焦态它的层级高于 WebView 里的一切元素，词条会被直接盖住）。
  // 统一走 setInput / syncPhOff，避免"用 JS 清空 value 却没同步类名"导致清空后词条不回来。
  var heroInput = $('heroinput');
  var heroFocused = false;
  function syncPhOff() {
    if (pill) pill.classList.toggle('nt-ph-off', !!heroInput.value || heroFocused);
  }
  function setInput(v) {
    heroInput.value = v;
    syncPhOff();
  }
  heroInput.addEventListener('input', syncPhOff);
  heroInput.addEventListener('focus', function () { heroFocused = true; syncPhOff(); });
  heroInput.addEventListener('blur', function () { heroFocused = false; syncPhOff(); });

  // ================= 结果页渲染 =================
  // 渲染一个算法小节（单算法的正文 / 多算法的其中一节共用）
  function renderSection(box, sec) {
    if (sec.lead) {
      var ld = document.createElement('span');
      ld.className = 'nt-dl-text nt-dl-text-light';
      ld.textContent = sec.lead;
      box.appendChild(ld);
    }
    (sec.blocks || []).forEach(function (b) {
      var wrap = document.createElement('div');
      wrap.className = 'res-block';
      if (b.label) {
        var lab = document.createElement('span');
        lab.className = 'res-block-label';
        lab.textContent = b.label;
        wrap.appendChild(lab);
      }
      var txt = document.createElement('span');
      txt.className = 'nt-dl-text nt-dl-text-light';
      txt.textContent = b.text;
      wrap.appendChild(txt);
      box.appendChild(wrap);
    });
  }
  function renderResult(f) {
    curResult = f;
    $('restitle').textContent = about.navTitle || '玄玖灵犀';
    // 多算法并列：页名沿用「搜索结果」（各节标题已在卡内自分节，页名不抢任何一个算法的名）
    $('respageh').textContent = (f.multi ? '' : f.title) || about.resultPageTitle || '搜索结果';
    $('resqlabel').textContent = about.questionLabel || '你的提问';
    $('resquestion').textContent = f.question || '';
    var secs = $('ressections');
    var lead = $('reslead');
    var box = $('resblocks');
    secs.innerHTML = '';
    box.innerHTML = '';
    if (f.multi) {
      // 多算法：单算法那套 lead/blocks 整体隐藏，改渲染 N 个 .res-section
      lead.style.display = 'none';
      box.style.display = 'none';
      secs.hidden = false;
      (f.sections || []).forEach(function (s) {
        var wrap = document.createElement('div');
        wrap.className = 'res-section';
        if (s.title) {
          var h = document.createElement('span');
          h.className = 'res-section-title nt-dl-h1';
          h.textContent = s.title;
          wrap.appendChild(h);
        }
        renderSection(wrap, s);
        secs.appendChild(wrap);
      });
      return;
    }
    // 单算法：原有结构不变
    secs.hidden = true;
    lead.style.display = '';
    box.style.display = '';
    lead.textContent = f.lead || '';
    lead.style.display = f.lead ? '' : 'none';
    renderSection(box, f);
  }

  // ================= 提问 =================
  function send() {
    var raw = $('heroinput').value;
    // 主题切换「只在搜索框内实现」：命中切换指令（单一真源 theme.js）→ 切主题并提示，不进入结果页
    if (Theme && Theme.isToggleCommand && Theme.isToggleCommand(raw)) {
      var next = Theme.toggle();
      applyTheme(next);
      setInput('');
      toast('已切换为' + (next === 'dark' ? '深色' : '浅色') + '主题');
      return;
    }
    var r = conversation.ask(raw);
    if (!r.ok) return;
    // 多算法并列：r.hits > 1 时 result-format 按【标题】切小节
    var f = N.resultFormat.format(r.answer, (r.hits || 1) > 1);
    f.question = r.question;
    renderResult(f);
    setInput('');
    show('result');
  }

  $('heroSend').addEventListener('click', send);
  heroInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });

  // ---- 返回输入页（清空当前结果）----
  function goHome() { conversation.clear(); show('home'); }
  $('resultback').addEventListener('click', goHome);
  $('againbtn').addEventListener('click', goHome);

  // ================= 导出图片 =================
  /**
   * 把当前结果渲染成一张 PNG 并触发下载。
   *
   * 版式与绘制**完全走 ExportModule/export-image.js**（与小程序同一份代码，壳里不重画）：
   *   build() 出「矩形 + 文本」版式计划 → 按计划尺寸建 canvas → paint() 落笔 →
   *   toBlob() 出 PNG → 触发 <a download>。留白/圆角/字号/行高全部取自设计稿 token，
   *   故导出图与页面视觉一致（2 倍图，保证在视网膜屏上文字不糊）。
   */
  function exportImage() {
    if (!curResult || !N.exportImage) { toast('暂无可导出的内容'); return; }
    var dpr = Math.min(window.devicePixelRatio || 1, 3);

    // ① 先用一个临时 canvas 量字排版（只调 measureText，不落笔）
    // meta 走 optsFrom(about)（单一装配，与小程序同一份；二维码指向 about.exportMeta.qrUrl，离线内置）
    var meta = N.exportImage.optsFrom(about);
    var measure = document.createElement('canvas').getContext('2d');
    var plan = N.exportImage.build(curResult, meta, measure);

    // ② 按计划尺寸建画布并落笔
    var cv = document.createElement('canvas');
    cv.width = Math.round(plan.width * dpr);
    cv.height = Math.round(plan.height * dpr);
    var ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    N.exportImage.paint(ctx, plan);

    // ③ 出文件并下载
    var name = '玄玖灵犀-' + (curResult.title || '分析结果') + '.png';
    function save(url) {
      var a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(function () { document.body.removeChild(a); if (url.indexOf('blob:') === 0) URL.revokeObjectURL(url); }, 0);
    }
    if (cv.toBlob) {
      cv.toBlob(function (blob) {
        if (!blob) { save(cv.toDataURL('image/png')); return; }
        save(URL.createObjectURL(blob));
        toast('已导出图片');
      }, 'image/png');
    } else {
      save(cv.toDataURL('image/png'));   // 老浏览器兜底
      toast('已导出图片');
    }
  }
  $('exportbtn').addEventListener('click', exportImage);

  // ================= 关于面板 / 关于我们 / 内容详情 =================
  $('aboutbtn').addEventListener('click', function () { show('about'); });
  $('aboutback').addEventListener('click', goHome);
  // 关于我们页「‹」→ 回「关于」；内容详情页「‹」→ 回上一级（about/us，由 detailBack 决定）
  $('usback').addEventListener('click', function () { show('about'); });
  $('detailback').addEventListener('click', function () { show(detailBack || 'about'); });

  $('icp').textContent = about.icp;
  $('copy').textContent = about.footerCopy;
  $('heroDisclaimer').textContent = about.homeDisclaimer;
  $('ab-slogan').textContent = about.slogan;
  $('us-title').textContent = about.usPageTitle;

  // 结果页双按钮文案（about.resultActions 单一真源；PWA 不再写死「导出图片/再问一个」，
  // 与小程序 / uni-app 三端一致 —— 改文案只改 settings.js 一处）
  var ra = about.resultActions || {};
  if (ra.export) $('exportbtn').textContent = ra.export;
  if (ra.again) $('againbtn').textContent = ra.again;

  // 底部两行说明（aboutFoot 单一真源；结果 / 关于 / 关于我们 / 内容页 共用）
  function fillFoot(box) {
    box.innerHTML = '';
    (about.aboutFoot || []).forEach(function (line) {
      var t = document.createElement('span');
      t.className = 'nt-setfoot-line';
      t.textContent = line;
      box.appendChild(t);
    });
  }
  fillFoot($('ab-foot'));
  fillFoot($('res-foot'));
  fillFoot($('us-foot'));
  fillFoot($('detail-foot'));

  // 关于页设置区（4 卡：refs/intro → 内容详情页；us → 关于我们页；清除项 → 弹窗；走 theme.css）
  function buildRows(box, rows, onDanger) {
    (rows || []).forEach(function (row) {
      var el = document.createElement('div');
      el.className = 'nt-setrow' + (row.danger ? ' danger' : '');
      el.innerHTML =
        '<span class="nt-setl"><span class="nt-setl-title"></span><span class="nt-setl-desc"></span></span>' +
        '<span class="nt-icon nt-i-chev"></span>';
      el.querySelector('.nt-setl-title').textContent = row.title;
      el.querySelector('.nt-setl-desc').textContent = row.desc;
      el.addEventListener('click', function () {
        // 路由判定走 settings.js 的 rowAction（单一真源，三端同一份）：clear→弹窗 / us→关于我们 / 其余→内容详情
        var act = N.settings.rowAction(row);
        if (act === 'clear') { if (onDanger) onDanger(); return; }
        if (act === 'us') { show('us'); return; }
        openDetail(row.id);
      });
      box.appendChild(el);
    });
  }
  buildRows($('ab-setlist'), about.aboutRows, openMask);
  // 关于我们页 3 张卡（星玖工作室 / 协议条款 / 开源声明）→ 各自内容详情页
  buildRows($('us-setlist'), about.usRows);

  // 内容详情页（一稿两用 5 子页：refs/intro 回「关于」，studio/terms/open 回「关于我们」）
  function openDetail(id) {
    $('detailnavtitle').textContent = about.navTitle || '玄玖灵犀';
    $('detailtitle').textContent = about.resTitle[id];
    detailBack = (about.backTarget && about.backTarget[id]) || 'about';
    var box = $('detail-items');
    box.innerHTML = '';
    (about.aboutNotes[id] || []).forEach(function (it) {   // aboutNotes[id] = [{h,text}] 数组
      var wrap = document.createElement('div');
      wrap.className = 'nt-dl-item';
      if (it.h) {
        var h = document.createElement('span');
        h.className = 'nt-dl-h1'; h.textContent = it.h;
        wrap.appendChild(h);
      }
      var p = document.createElement('span');
      p.className = 'nt-dl-text'; p.textContent = it.text;
      wrap.appendChild(p);
      box.appendChild(wrap);
    });
    show('detail');
  }

  // ================= 清除缓存：通用弹窗（文案走 about.clearModal 单一真源）=================
  var cm = about.clearModal;
  var mask = document.createElement('div');
  mask.className = 'nt-mask';
  mask.style.display = 'none';
  mask.innerHTML =
    '<div class="nt-modal">' +
    '<span class="nt-modal-title">' + cm.title + '</span>' +
    '<span class="nt-modal-desc">' + cm.desc + '</span>' +
    '<div class="nt-modal-btns">' +
    '<button class="nt-pill-btn ghost" id="m-cancel">' + cm.cancel + '</button>' +
    '<button class="nt-pill-btn" id="m-ok">' + cm.confirm + '</button>' +
    '</div></div>';
  document.body.appendChild(mask);
  // 弹窗退场时长走 transition.js 的 TIMING.MODAL_OUT（单一真源，三端共用；镜像 theme.css --d-modal-out，
  // 退场比进场 --d-drawer 快一档；JS 读不到 CSS 变量，故值集中在这份，改 theme.css 令牌时改 transition.js 一处）。
  var MODAL_OUT_MS = (N.transition && N.transition.TIMING) ? N.transition.TIMING.MODAL_OUT : 200;
  function openMask() {
    mask.classList.remove('nt-mask-out');   // 复用同一节点重开：先摘退场类，让它重新播一次进场(nt-rise)
    clearTimeout(mask._outTimer);           // 若上次退场还没摘完就重开，掐掉那个延迟卸载，避免刚打开就被隐藏
    mask.style.display = 'flex';
  }
  // 出场动画：先播 nt-fall（200ms 淡出下沉），播完再卸载节点（display:none）。
  //   直接 display:none 就摘掉了节点，退场动画根本来不及播 —— 必须「先播后摘」。
  function closeMask() {
    if (mask._closing) return;
    mask._closing = true;
    mask.classList.add('nt-mask-out');
    mask._outTimer = setTimeout(function () {
      mask.style.display = 'none';
      mask.classList.remove('nt-mask-out');
      mask._closing = false;
      clearTimeout(mask._outTimer);
    }, MODAL_OUT_MS);
  }
  mask.addEventListener('click', function (e) { if (e.target === mask) closeMask(); });
  mask.querySelector('#m-cancel').addEventListener('click', closeMask);
  mask.querySelector('#m-ok').addEventListener('click', function () {
    N.settings.clearData();
    conversation.clear();
    closeMask();
    // 清除数据后重置页内状态：清空输入、清空结果页残留 DOM（否则返回首页后旧结果仍在）
    curResult = null;
    setInput('');
    $('resblocks').innerHTML = '';
    $('resquestion').textContent = '';
    $('reslead').textContent = '';
    $('detail-items').innerHTML = '';
    // 清缓存会重置主题偏好（回落跟随系统）→ 重读主题并重新套色，否则深色界面看着没变
    if (Theme) applyTheme(Theme.current());
    show('home');
    toast(cm.done || '已彻底清除缓存');
  });
  // Esc 关闭模态框（HIG 电脑端快捷键）
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMask(); });

  function toast(text) {
    var t = document.createElement('div');
    t.className = 'nt-toast';
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2000);
  }

  // ================= PWA 安装引导（依赖注入的 env）=================
  if (N.env) {
    if (N.env.registerServiceWorker) N.env.registerServiceWorker();
    if (N.env.initInstallPrompt) N.env.initInstallPrompt();
    var bar = $('installbar');
    $('installbtn').addEventListener('click', function () { if (N.env.promptInstall) N.env.promptInstall(); });
    window.addEventListener('nt:installavailable', function () { bar.style.display = 'flex'; });
    window.addEventListener('nt:installed', function () { bar.style.display = 'none'; });
  }

  // 恢复上次这一问（刷新不丢）。这是冷启动首屏 → 传 boot=true，让恢复出来的结果页也播一次内容错落入场。
  // hits 已随 conversation 持久化（v3.2.1），恢复路径与提问路径走同一判定，不靠文本猜。
  var last = conversation.restore();
  if (last) {
    var f = N.resultFormat.format(last.answer, (last.hits || 1) > 1);
    f.question = last.question;
    renderResult(f);
    show('result', true);
  }
})();
