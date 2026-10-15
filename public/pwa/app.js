/**
 * 玄玖灵犀 NT-Xhex · 浏览器 PWA 壳（薄壳）
 * 三视图：首页（输入）→ 结果页（展示分析）→ 关于页；不做聊天区、不显示历史。
 * 本壳只做：① 用引擎+存储创建「问答」实例；② 视图切换与 DOM 绑定；③ 关于/页脚数据装配。
 * 问答行为在 modules/HomeModule/conversation.js，结果排版在 modules/HomeModule/result-format.js，
 * 品牌/备案/版权在 modules/SettingsModule/settings.js —— 均不在此壳内复制。
 */
(function () {
  var N = window.NT || {};
  var $ = function (id) { return document.getElementById(id); };

  // 单一真源装配：引擎 + 存储 -> 问答行为（一份，各壳共享）
  var conversation = N.conversation.createConversation({
    analyzer: N.analyzer,
    storage: N.storage
  });

  // ---- 视图切换（首页/结果/关于/关于我们/内容详情 五视图；清除缓存只弹窗不走二级页）----
  // 转场：PWA 无"上一页"DOM，走单层右滑入（theme.css .nt-slide-in，经 .view.on 动画），布局不动
  var views = { home: $('v-home'), result: $('v-result'), about: $('v-about'), us: $('v-us'), detail: $('v-detail') };
  var detailBack = 'about'; // 内容详情页「‹」回哪一级：about（关于）/ us（关于我们），由 backTarget 决定
  function show(name) {
    Object.keys(views).forEach(function (k) { views[k].classList.toggle('on', k === name); });
  }

  // ---- 黑白主题（全局反色；宜忌/五行语义色不翻）----
  // PWA 从 public/pwa/ 静态服务，logo 用相对前缀 ../../static/icons/（与本页 HTML 一致）；
  //   「深色用白色词标」的决策与小程序/uni-app 同一份（theme.js），此处只套本页路径前缀。
  var Theme = N.theme;
  var heroLogo = $('heroLogo'), aboutLogo = $('aboutLogo'), usLogo = $('usLogo');
  var LOGO_BASE = '../../static/icons/';
  function applyTheme(theme) {
    if (document.documentElement.classList) document.documentElement.classList.toggle('nt-dark', theme === 'dark');
    var name = theme === 'dark' ? 'logo-white.png' : 'logo.png';
    if (heroLogo) heroLogo.src = LOGO_BASE + name;
    if (aboutLogo) aboutLogo.src = LOGO_BASE + name;
    if (usLogo) usLogo.src = LOGO_BASE + name;
  }
  if (Theme) {
    // 加载时按系统深浅自动套色（手动切换按钮暂不开放；theme.js 的 toggle 能力保留备用）
    applyTheme(Theme.current());
  }

  // ---- 提问 ----
  function renderResult(f) {
    $('restitle').textContent = f.title || '分析结果';
    $('resquestion').textContent = f.question;
    var lead = $('reslead');
    lead.textContent = f.lead;
    lead.style.display = f.lead ? '' : 'none';
    var box = $('resblocks');
    box.innerHTML = '';
    f.blocks.forEach(function (b) {
      var wrap = document.createElement('div');
      wrap.className = 'res-block nt-mark';
      if (b.label) {
        var lab = document.createElement('span');
        lab.className = 'res-block-label';
        lab.textContent = b.label;
        wrap.appendChild(lab);
      }
      var txt = document.createElement('span');
      txt.className = 'nt-dl-text res-block-text';
      txt.textContent = b.text;
      wrap.appendChild(txt);
      box.appendChild(wrap);
    });
  }

  function send() {
    var raw = $('heroinput').value;
    // 主题切换「只在搜索框内实现」：命中切换指令（单一真源 theme.js）→ 切主题并提示，不进入结果页
    if (Theme && Theme.isToggleCommand && Theme.isToggleCommand(raw)) {
      var next = Theme.toggle();
      applyTheme(next);
      $('heroinput').value = '';
      toast('已切换为' + (next === 'dark' ? '深色' : '浅色') + '主题');
      return;
    }
    var r = conversation.ask(raw);
    if (!r.ok) return;
    var f = N.resultFormat.format(r.answer);
    f.question = r.question;
    renderResult(f);
    $('heroinput').value = '';
    show('result');
  }

  $('heroSend').addEventListener('click', send);
  $('heroinput').addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });

  // 返回输入页（清空当前结果）
  function goHome() { conversation.clear(); show('home'); }
  $('resultback').addEventListener('click', goHome);
  $('againbtn').addEventListener('click', goHome);

  // 关于面板
  $('aboutbtn').addEventListener('click', function () { show('about'); });
  $('aboutback').addEventListener('click', goHome);
  // 关于我们页「‹」→ 回「关于」；内容详情页「‹」→ 回上一级（about/us，由 detailBack 决定）
  $('usback').addEventListener('click', function () { show('about'); });
  $('detailback').addEventListener('click', function () { show(detailBack || 'about'); });

  // ---- 关于 / 页脚 / 首页免责：全部来自 settings.js 单一真源 ----
  var about = N.settings.about();
  $('icp').textContent = about.icp;
  $('copy').textContent = about.footerCopy;
  $('heroDisclaimer').textContent = about.homeDisclaimer;
  $('ab-slogan').textContent = about.slogan;
  $('us-title').textContent = about.usPageTitle;
  $('us-slogan').textContent = about.slogan;

  // 首页免责声明（定稿 §4.5：单一真源 homeDisclaimer）

  // 底部两行说明（§3.4/§4.6：aboutFoot 单一真源；结果/关于/关于我们/内容页 共用）
  function fillFoot(box) {
    box.innerHTML = '';
    about.aboutFoot.forEach(function (line) {
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
  var setlist = $('ab-setlist');
  about.aboutRows.forEach(function (row) {
    var el = document.createElement('div');
    el.className = 'nt-setrow' + (row.danger ? ' danger' : '');
    el.innerHTML =
      '<span class="nt-setl"><span class="nt-setl-title"></span><span class="nt-setl-desc"></span></span>' +
      '<span class="nt-icon nt-i-chev"></span>';
    el.querySelector('.nt-setl-title').textContent = row.title;
    el.querySelector('.nt-setl-desc').textContent = row.desc;
    el.addEventListener('click', function () {
      if (row.danger) { openMask(); return; }
      if (row.id === 'us') { show('us'); return; }
      openDetail(row.id);
    });
    setlist.appendChild(el);
  });

  // 关于我们页 3 张卡（星玖工作室 / 协议条款 / 开源声明）→ 各自内容详情页
  var usSetlist = $('us-setlist');
  about.usRows.forEach(function (row) {
    var el = document.createElement('div');
    el.className = 'nt-setrow';
    el.innerHTML =
      '<span class="nt-setl"><span class="nt-setl-title"></span><span class="nt-setl-desc"></span></span>' +
      '<span class="nt-icon nt-i-chev"></span>';
    el.querySelector('.nt-setl-title').textContent = row.title;
    el.querySelector('.nt-setl-desc').textContent = row.desc;
    el.addEventListener('click', function () { openDetail(row.id); });
    usSetlist.appendChild(el);
  });

  // 内容详情页（一稿两用 5 子页：refs/intro 回「关于」，studio/terms/open 回「关于我们」）
  function openDetail(id) {
    $('detailtitle').textContent = about.resTitle[id];
    detailBack = (about.backTarget && about.backTarget[id]) || 'about';
    var box = $('detail-items');
    box.innerHTML = '';
    var items = about.aboutNotes[id] || []; // aboutNotes[id] = [{h,text}] 数组
    items.forEach(function (it) {
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

  // ---- 清除缓存：通用弹窗（定稿v3 §5：清除场景专用，无二级页；文案走 about.clearModal 单一真源）----
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
  function openMask() { mask.style.display = 'flex'; }
  function closeMask() { mask.style.display = 'none'; }
  mask.addEventListener('click', function (e) { if (e.target === mask) closeMask(); });
  mask.querySelector('#m-cancel').addEventListener('click', closeMask);
  mask.querySelector('#m-ok').addEventListener('click', function () {
    N.settings.clearData();
    conversation.clear();
    closeMask();
    // 清除数据后重置页内状态：清空输入、清空结果页残留 DOM（否则返回首页后旧结果仍在）
    $('heroinput').value = '';
    $('resblocks').innerHTML = '';
    $('resquestion').textContent = '';
    $('reslead').textContent = '';
    $('detail-items').innerHTML = '';
    // 清缓存会重置主题偏好（回落跟随系统）→ 重读主题并重新套色，否则深色界面看着没变
    if (Theme) applyTheme(Theme.current());
    show('home');
    toast('已恢复出厂设置');
  });
  // Esc 关闭模态框（规范 §6.4 电脑端快捷键）
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMask(); });

  function toast(text) {
    var t = document.createElement('div');
    t.className = 'nt-toast';
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2000);
  }

  // ---- PWA 安装引导（依赖注入的 env）----
  if (N.env) {
    if (N.env.registerServiceWorker) N.env.registerServiceWorker();
    if (N.env.initInstallPrompt) N.env.initInstallPrompt();
    var bar = $('installbar');
    $('installbtn').addEventListener('click', function () { if (N.env.promptInstall) N.env.promptInstall(); });
    window.addEventListener('nt:installavailable', function () { bar.style.display = 'flex'; });
    window.addEventListener('nt:installed', function () { bar.style.display = 'none'; });
  }

  // 恢复上次这一问（刷新不丢）
  var last = conversation.restore();
  if (last) {
    var f = N.resultFormat.format(last.answer);
    f.question = last.question;
    renderResult(f);
    show('result');
  }
})();
