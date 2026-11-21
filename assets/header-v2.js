/* Go AI v2.0.0 — menu xổ xuống, chọn ngôn ngữ, video "Go AI làm được gì". Không phụ thuộc app.js. */
(function () {
  'use strict';
  var header = document.querySelector('.header.hv2');
  if (header) {
    var items = Array.prototype.slice.call(header.querySelectorAll('.nav-item.has-sub'));
    var langMenu = header.querySelector('.lang-menu');
    var langBtn = header.querySelector('.lang-btn');
    var nav = header.querySelector('#nav-links');
    var menuBtn = header.querySelector('.menu-toggle');
    var closeAll = function (except) {
      items.forEach(function (it) {
        if (it === except) return;
        it.classList.remove('open');
        var b = it.querySelector('.sub-toggle'); if (b) b.setAttribute('aria-expanded', 'false');
      });
      if (except !== langMenu && langMenu) { langMenu.classList.remove('open'); langBtn.setAttribute('aria-expanded', 'false'); }
    };
    items.forEach(function (it) {
      var btn = it.querySelector('.sub-toggle');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = !it.classList.contains('open');
        closeAll(it);
        it.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
      // Bàn phím: mở bảng khi tiêu điểm vào mục, đóng khi rời khỏi mục.
      it.addEventListener('focusout', function (e) {
        if (!it.contains(e.relatedTarget)) { it.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
      });
    });
    // Bấm vào một section/trang con: đóng bảng (và đóng menu điện thoại — app.js chỉ gắn cho liên kết có sẵn lúc tải).
    header.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a.sub-link, a.nav-top, a.nav-cta');
      if (!a) return;
      closeAll();
      if (a.blur) a.blur();
      if (nav && nav.classList.contains('open') && menuBtn) { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
    });
    if (langBtn) {
      langBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = !langMenu.classList.contains('open');
        closeAll(langMenu);
        langMenu.classList.toggle('open', open);
        langBtn.setAttribute('aria-expanded', String(open));
        if (open) { var cur = langMenu.querySelector('[aria-pressed="true"]'); if (cur) cur.focus(); }
      });
      langMenu.querySelectorAll('[data-lang-option]').forEach(function (b) {
        b.addEventListener('click', function () { langMenu.classList.remove('open'); langBtn.setAttribute('aria-expanded', 'false'); langBtn.focus(); });
      });
      // app.js đặt aria-pressed khi đổi ngôn ngữ → cập nhật nhãn nút và aria-checked.
      var codes = { vi: 'VI', en: 'EN', zh: '中文' };
      var sync = function () {
        var cur = langMenu.querySelector('[data-lang-option][aria-pressed="true"]');
        var code = cur ? cur.getAttribute('data-lang-option') : 'vi';
        header.querySelector('.lang-current').textContent = codes[code] || 'VI';
        langMenu.querySelectorAll('[data-lang-option]').forEach(function (b) { b.setAttribute('aria-checked', b.getAttribute('aria-pressed') === 'true' ? 'true' : 'false'); });
      };
      new MutationObserver(sync).observe(langMenu, { subtree: true, attributes: true, attributeFilter: ['aria-pressed'] });
      sync();
    }
    document.addEventListener('click', function (e) { if (!header.contains(e.target)) closeAll(); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var openItem = header.querySelector('.nav-item.open, .lang-menu.open');
      if (openItem) { closeAll(); var t = openItem.querySelector('.sub-toggle, .lang-btn'); if (t) t.focus(); }
    });
    if (nav) new MutationObserver(function () { document.body.classList.toggle('nav-open', nav.classList.contains('open')); }).observe(nav, { attributes: true, attributeFilter: ['class'] });
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  // Bấm thẻ → mở cửa sổ phát bản chi tiết.
  document.querySelectorAll('.feature-open').forEach(function (btn) {
    var dlg = document.getElementById('feature-' + btn.getAttribute('data-feature'));
    if (!dlg || typeof dlg.showModal !== 'function') return;
    var vid = dlg.querySelector('video');
    btn.addEventListener('click', function () {
      dlg.showModal();
      if (vid) { vid.preload = 'auto'; var p = vid.play(); if (p && p.catch) p.catch(function () {}); }
    });
    dlg.querySelector('.feature-close').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { if (vid) vid.pause(); btn.focus(); });
  });

  // Video "Go AI làm được gì": đứng yên (ảnh tĩnh) mặc định, chỉ chạy khi rê chuột / đưa tiêu điểm vào khối;
  // rời chuột → dừng và trở về ảnh tĩnh. Trên điện thoại: chạm để mở bản phóng lớn.
  var videos = Array.prototype.slice.call(document.querySelectorAll('video.feature-video'));
  if (videos.length) {
    var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
    var canHover = mq('(hover: hover) and (pointer: fine)');
    var reduce = mq('(prefers-reduced-motion: reduce)');
    document.documentElement.classList.toggle('feature-can-hover', canHover && !reduce);
    if (canHover && !reduce) {
      videos.forEach(function (v) {
        var card = v.closest('.feature-open');
        if (!card) return;
        var token = 0;
        var start = function () {
          token++;
          card.classList.add('is-playing');
          v.preload = 'auto';
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        };
        var stop = function () {
          var my = ++token;
          card.classList.remove('is-playing');
          v.pause();
          // load() đưa video về ảnh tĩnh (poster); trì hoãn nhẹ để không giật khi lướt qua nhanh.
          setTimeout(function () { if (my === token) { try { v.currentTime = 0; } catch (e) {} v.load(); } }, 120);
        };
        card.addEventListener('mouseenter', start);
        card.addEventListener('mouseleave', stop);
        card.addEventListener('focus', start);
        card.addEventListener('blur', stop);
      });
    }
  }
})();
