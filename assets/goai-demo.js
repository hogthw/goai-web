/* Go AI v2.1 — demo tương tác cho 6 trang Giải pháp theo phòng ban.
   Chỉ chạy trong trình duyệt, dữ liệu minh họa, không gửi dữ liệu đi đâu. */
(function () {
  'use strict';
  var root = document.querySelector('[data-goai-demo]');
  if (!root) return;

  /* ---------- tiện ích ---------- */
  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  var money = function (n) { return n.toLocaleString('vi-VN') + ' ₫'; };
  var ICON = {
    ai: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="4"/><path d="M12 4v4"/><circle cx="9" cy="14" r="1.2" fill="currentColor"/><circle cx="15" cy="14" r="1.2" fill="currentColor"/></svg>',
    human: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4.2 4-6.6 8-6.6s7.2 2.4 8 6.6z"/></svg>',
    ok: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    warn: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 7v6M12 17h.01"/></svg>'
  };
  function btn(label, onclick, kind) { return h('button', { type: 'button', class: 'dm-btn' + (kind ? ' ' + kind : ''), onclick: onclick }, label); }
  function choice(opts, onpick, cls) {
    var wrap = h('div', { class: 'dm-choices ' + (cls || ''), role: 'group' });
    opts.forEach(function (o, i) {
      var b = h('button', { type: 'button', class: 'dm-choice', 'aria-pressed': 'false' },
        o.tag ? h('span', { class: 'dm-tag ' + (o.tagKind || '') }, o.tag) : null,
        h('strong', null, o.title), o.sub ? h('small', null, o.sub) : null);
      b.addEventListener('click', function () {
        wrap.querySelectorAll('.dm-choice').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        onpick(o, i);
      });
      wrap.appendChild(b);
    });
    return wrap;
  }
  function note(kind, text) { return h('div', { class: 'dm-note ' + kind, role: kind === 'warn' ? 'alert' : null }, h('span', { class: 'dm-note-ic', html: ICON[kind === 'warn' ? 'warn' : kind === 'ok' ? 'ok' : 'ai'] }), h('span', null, text)); }
  function table(head, rows, opts) {
    opts = opts || {};
    return h('div', { class: 'dm-table-wrap' }, h('table', { class: 'dm-table' },
      h('thead', null, h('tr', null, head.map(function (c) { return h('th', null, c); }))),
      h('tbody', null, rows.map(function (r, i) {
        return h('tr', { class: opts.rowClass ? opts.rowClass(r, i) : null }, r.map(function (c) { return h('td', null, c); }));
      }))));
  }
  function bars(items) { // [{label, value, max, kind}]
    return h('div', { class: 'dm-bars' }, items.map(function (it) {
      return h('div', { class: 'dm-bar-row' }, h('span', { class: 'dm-bar-label' }, it.label),
        h('span', { class: 'dm-bar-track' }, h('i', { class: it.kind || '', style: 'width:' + Math.round(100 * it.value / it.max) + '%' })),
        h('span', { class: 'dm-bar-val' }, it.text || String(it.value)));
    }));
  }
  function typeInto(el, text, done) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { el.textContent = text; if (done) done(); return; }
    var i = 0; el.textContent = '';
    var t = setInterval(function () { i += 3; el.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(t); if (done) done(); } }, 16);
  }

  /* ---------- 6 kịch bản ---------- */
  var DEMOS = {};

  DEMOS['ban-hang'] = {
    title: 'Trợ lý Bán hàng', subtitle: 'Từ khách hàng tiềm năng đến báo giá nháp',
    steps: ['Phân loại khách hàng', 'Soạn báo giá nháp', 'Duyệt và cập nhật CRM'],
    run: [
      function (A) {
        A.heading('Chọn một khách hàng tiềm năng vừa gửi yêu cầu', 'Go AI đọc nội dung, chấm mức độ quan tâm và chỉ ra thông tin còn thiếu.');
        var leads = [
          { title: 'Công ty Minh Phát', sub: 'Form website · “Cần báo giá 50 tài khoản phần mềm kế toán, triển khai trong tháng 12.”', tag: 'Website',
            score: 86, level: 'Nóng', kind: 'hot', missing: ['Mã số thuế để xuất hóa đơn'], items: [['Gói phần mềm kế toán (tài khoản/năm)', 50, 1800000], ['Đào tạo triển khai (buổi)', 2, 3500000]] },
          { title: 'Chị Lan · Cửa hàng Lan Anh', sub: 'Tin nhắn Facebook · “Bên mình giá bao nhiêu vậy ạ?”', tag: 'Facebook',
            score: 34, level: 'Lạnh', kind: 'cold', missing: ['Sản phẩm quan tâm', 'Số lượng', 'Thời gian cần'], items: null },
          { title: 'Công ty Hòa Bình Logistics', sub: 'Email · “Muốn xem demo cho 200 nhân sự, cần quyết định trước 30/11.”', tag: 'Email',
            score: 72, level: 'Ấm', kind: 'warm', missing: ['Người ra quyết định', 'Ngân sách dự kiến'], items: [['Gói phần mềm nhân sự (tài khoản/năm)', 200, 950000], ['Buổi demo trực tuyến', 1, 0]] }
        ];
        var out = h('div', { class: 'dm-result' });
        add(A.work, [choice(leads, function (l) {
          A.state.lead = l;
          out.innerHTML = '';
          A.log('ai', 'Đọc yêu cầu của ' + l.title + ', đối chiếu lịch sử trong CRM.');
          A.log(l.kind === 'cold' ? 'warn' : 'ok', 'Chấm điểm ' + l.score + '/100 · mức “' + l.level + '”.');
          out.appendChild(h('div', { class: 'dm-panel' },
            h('div', { class: 'dm-score' }, h('span', { class: 'dm-score-num ' + l.kind }, String(l.score)), h('span', null, h('strong', null, 'Mức quan tâm: ' + l.level), h('small', null, 'Dựa trên nhu cầu rõ ràng, số lượng và thời hạn trong tin nhắn'))),
            h('p', { class: 'dm-label' }, 'Thông tin còn thiếu'),
            h('ul', { class: 'dm-list' }, l.missing.map(function (m) { return h('li', null, m); }))));
          out.appendChild(A.nextBtn(l.items ? 'Soạn báo giá nháp →' : 'Soạn tin nhắn hỏi thêm →'));
        }, 'cols-3'), out]);
      },
      function (A) {
        var l = A.state.lead;
        if (!l.items) {
          A.heading('Thông tin chưa đủ để báo giá', 'Go AI soạn tin nhắn hỏi thêm thay vì đoán giá. Bạn có thể sửa trước khi gửi.');
          var ta = h('textarea', { class: 'dm-textarea', rows: 5, 'aria-label': 'Tin nhắn nháp' });
          A.work.appendChild(ta);
          typeInto(ta, 'Chào chị Lan, cảm ơn chị đã quan tâm đến sản phẩm của Go AI. Để báo giá chính xác, chị cho em xin thêm: (1) sản phẩm chị đang quan tâm, (2) số lượng dự kiến và (3) thời gian cần sử dụng nhé. Em sẽ gửi báo giá ngay khi nhận được thông tin ạ.');
          A.log('ai', 'Soạn tin nhắn hỏi 3 thông tin còn thiếu.');
          A.work.appendChild(note('info', 'Go AI không tự đưa ra mức giá khi dữ liệu chưa đủ.'));
          A.work.appendChild(A.nextBtn('Chuyển nhân viên duyệt →'));
          return;
        }
        A.heading('Báo giá nháp cho ' + l.title, 'Chọn mức chiết khấu đề xuất. Go AI tự tính lại và kiểm tra quy định phê duyệt.');
        var box = h('div');
        var render = function (pct) {
          box.innerHTML = '';
          var sub = l.items.reduce(function (s, it) { return s + it[1] * it[2]; }, 0);
          var disc = Math.round(sub * pct / 100), vat = Math.round((sub - disc) * 0.08);
          box.appendChild(table(['Hạng mục', 'SL', 'Đơn giá', 'Thành tiền'], l.items.map(function (it) { return [it[0], String(it[1]), it[2] ? money(it[2]) : 'Miễn phí', money(it[1] * it[2])]; })));
          box.appendChild(h('div', { class: 'dm-kv' },
            h('span', null, 'Tạm tính'), h('b', null, money(sub)),
            h('span', null, 'Chiết khấu ' + pct + '%'), h('b', null, '−' + money(disc)),
            h('span', null, 'Thuế GTGT (ví dụ 8%)'), h('b', null, money(vat)),
            h('span', { class: 'big' }, 'Tổng cộng'), h('b', { class: 'big' }, money(sub - disc + vat))));
          if (pct > 5) box.appendChild(note('warn', 'Chiết khấu trên 5% cần Trưởng phòng Kinh doanh phê duyệt trước khi gửi khách.'));
          A.state.pct = pct;
        };
        A.work.appendChild(h('p', { class: 'dm-label' }, 'Mức chiết khấu'));
        A.work.appendChild(choice([{ title: '0%', sub: 'Giá niêm yết' }, { title: '5%', sub: 'Trong quyền nhân viên' }, { title: '10%', sub: 'Cần cấp trên duyệt' }], function (o) {
          render(parseInt(o.title, 10)); A.log('ai', 'Tính lại báo giá với chiết khấu ' + o.title + '.');
          if (!A.work.querySelector('.dm-next')) A.work.appendChild(A.nextBtn('Gửi duyệt →'));
        }, 'cols-3 compact'));
        A.work.appendChild(box);
      },
      function (A) {
        var l = A.state.lead;
        A.heading('Nhân viên kiểm tra và quyết định', 'Go AI chỉ gửi đi sau khi có người duyệt, rồi tự cập nhật CRM và đặt lịch nhắc.');
        var done = h('div');
        A.work.appendChild(h('p', { class: 'dm-label' }, 'Nhắc gọi lại sau'));
        var days = 2;
        A.work.appendChild(choice([{ title: '1 ngày' }, { title: '2 ngày' }, { title: '3 ngày' }], function (o) { days = parseInt(o.title, 10); }, 'cols-3 compact'));
        A.work.querySelector('.dm-choice:nth-child(2)').setAttribute('aria-pressed', 'true');
        add(A.work, [h('div', { class: 'dm-actions' },
          btn(A.state.pct > 5 ? 'Trưởng phòng duyệt & gửi' : 'Duyệt & gửi khách', function () {
            A.log('human', (A.state.pct > 5 ? 'Trưởng phòng' : 'Nhân viên') + ' đã duyệt nội dung.');
            A.log('ok', 'Đã gửi ' + (l.items ? 'báo giá' : 'tin nhắn') + ' cho ' + l.title + '.');
            A.log('ai', 'Cập nhật CRM và đặt lịch nhắc sau ' + days + ' ngày.');
            done.innerHTML = '';
            done.appendChild(h('div', { class: 'dm-panel crm' },
              h('p', { class: 'dm-label' }, 'Thẻ khách hàng trong CRM'),
              h('div', { class: 'dm-kv' }, h('span', null, 'Khách hàng'), h('b', null, l.title), h('span', null, 'Giai đoạn'), h('b', null, l.items ? 'Đã gửi báo giá' : 'Đang hỏi nhu cầu'),
                h('span', null, 'Mức quan tâm'), h('b', null, l.level + ' · ' + l.score + '/100'), h('span', null, 'Việc tiếp theo'), h('b', null, 'Gọi lại sau ' + days + ' ngày'))));
            A.finish();
          }, 'primary'),
          btn('Yêu cầu sửa lại', function () { A.log('human', 'Nhân viên yêu cầu chỉnh lại nội dung.'); A.go(1); }, 'ghost')), done]);
      }
    ]
  };

  DEMOS['marketing'] = {
    title: 'Trợ lý Tiếp thị', subtitle: 'Từ chủ đề đến bài đăng nháp đúng thương hiệu',
    steps: ['Chọn chủ đề và kênh', 'Tạo bản nháp', 'Duyệt và đo hiệu quả'],
    run: [
      function (A) {
        A.heading('Chọn chủ đề và kênh đăng', 'Go AI tổng hợp câu hỏi khách hàng hay hỏi và từ khóa liên quan trước khi viết.');
        var topics = [
          { title: 'Ra mắt gói Cao Cấp', sub: 'Giới thiệu dịch vụ mới', key: 'goi', insights: ['Khách hay hỏi: “Khác gói Cơ Bản ở điểm nào?”', 'Từ khóa: tự động hóa quy trình, tích hợp phần mềm', 'Nên có ví dụ thời gian tiết kiệm cụ thể'] },
          { title: 'Mẹo tự động hóa báo giá', sub: 'Bài chia sẻ kiến thức', key: 'meo', insights: ['Khách hay hỏi: “Bắt đầu từ đâu khi chưa có CRM?”', 'Từ khóa: báo giá nhanh, mẫu báo giá', 'Bài dạng danh sách 3–5 bước được đọc nhiều hơn'] },
          { title: 'Hội thảo AI ngày 20/11', sub: 'Thông báo sự kiện', key: 'su-kien', insights: ['Khách hay hỏi: “Có xem lại được không?”', 'Từ khóa: hội thảo, chuyển đổi AI, miễn phí', 'Cần nêu rõ thời gian, địa điểm, cách đăng ký'] }
        ];
        var channels = [{ title: 'Facebook', key: 'fb' }, { title: 'Email', key: 'email' }, { title: 'Blog website', key: 'blog' }];
        var res = h('div', { class: 'dm-result' });
        var tryNext = function () {
          if (!A.state.topic || !A.state.channel) return;
          res.innerHTML = '';
          A.log('ai', 'Tổng hợp phản hồi khách hàng và từ khóa cho “' + A.state.topic.title + '”.');
          res.appendChild(h('div', { class: 'dm-panel' }, h('p', { class: 'dm-label' }, 'Go AI tìm được'), h('ul', { class: 'dm-list ai' }, A.state.topic.insights.map(function (s) { return h('li', null, s); }))));
          res.appendChild(A.nextBtn('Tạo bản nháp →'));
        };
        A.work.appendChild(h('p', { class: 'dm-label' }, 'Chủ đề'));
        A.work.appendChild(choice(topics, function (o) { A.state.topic = o; tryNext(); }, 'cols-3'));
        A.work.appendChild(h('p', { class: 'dm-label' }, 'Kênh'));
        A.work.appendChild(choice(channels, function (o) { A.state.channel = o; tryNext(); }, 'cols-3 compact'));
        A.work.appendChild(res);
      },
      function (A) {
        A.heading('Chọn giọng văn', 'Go AI viết theo hướng dẫn thương hiệu và tự kiểm tra trước khi gửi duyệt.');
        var T = A.state.topic.key, C = A.state.channel.key;
        var text = {
          goi: { pro: 'Go AI ra mắt gói Cao Cấp: tự động hóa trọn một quy trình, từ tiếp nhận yêu cầu đến báo cáo, tích hợp với phần mềm doanh nghiệp đang dùng. Đăng ký tư vấn để được đánh giá quy trình phù hợp.', fri: 'Quy trình nào trong công ty bạn đang “ngốn” nhiều giờ nhất? Gói Cao Cấp của Go AI giúp tự động hóa trọn quy trình đó và vẫn để con người duyệt ở bước quan trọng. Nhắn Go AI để cùng chọn quy trình đầu tiên nhé!', short: 'Gói Cao Cấp đã có mặt: tự động hóa trọn một quy trình, kết nối phần mềm sẵn có. Đăng ký tư vấn ngay.' },
          meo: { pro: '3 bước tự động hóa báo giá cho doanh nghiệp vừa và nhỏ: (1) chuẩn hóa mẫu báo giá, (2) gom thông tin khách hàng về một nơi, (3) để AI soạn bản nháp và nhân viên duyệt trước khi gửi.', fri: 'Mất cả buổi chỉ để làm một bảng báo giá? Thử 3 bước này: chuẩn hóa mẫu, gom thông tin khách về một chỗ, rồi để AI soạn nháp cho bạn duyệt. Nhanh hơn hẳn mà vẫn chắc chắn!', short: 'Báo giá nhanh hơn với 3 bước: mẫu chuẩn, dữ liệu tập trung, AI soạn nháp và người duyệt.' },
          'su-kien': { pro: 'Hội thảo “Chuyển đổi AI cho doanh nghiệp Việt Nam” diễn ra ngày 20/11, trực tuyến và miễn phí. Chương trình gồm ví dụ triển khai thực tế và phần hỏi đáp. Đăng ký để nhận đường dẫn tham dự và bản ghi.', fri: 'Hẹn bạn ngày 20/11 tại hội thảo trực tuyến miễn phí về chuyển đổi AI! Có ví dụ thật, có hỏi đáp trực tiếp, và có cả bản ghi nếu bạn bận. Đăng ký ngay để giữ chỗ nhé!', short: 'Hội thảo AI miễn phí ngày 20/11, trực tuyến, có bản ghi. Đăng ký để giữ chỗ.' }
        };
        var heads = { fb: 'Bài đăng Facebook', email: 'Email gửi khách hàng', blog: 'Đoạn mở đầu bài blog' };
        var out = h('div');
        A.work.appendChild(choice([{ title: 'Chuyên nghiệp', key: 'pro' }, { title: 'Thân thiện', key: 'fri' }, { title: 'Ngắn gọn', key: 'short' }], function (o) {
          out.innerHTML = '';
          A.log('ai', 'Viết ' + heads[C].toLowerCase() + ', giọng ' + o.title.toLowerCase() + '.');
          var p = h('div', { class: 'dm-draft' });
          out.appendChild(h('div', { class: 'dm-panel' }, h('p', { class: 'dm-label' }, heads[C] + ' · bản nháp'), p,
            h('ul', { class: 'dm-checklist' },
              h('li', { class: 'ok' }, 'Đúng tên thương hiệu “Go AI”'),
              h('li', { class: 'ok' }, 'Có lời kêu gọi hành động'),
              h('li', { class: C === 'fb' && o.key !== 'short' ? 'ok' : 'ok' }, 'Độ dài phù hợp kênh ' + A.state.channel.title),
              T === 'su-kien' ? h('li', { class: 'warn' }, 'Cần kiểm tra lại ngày giờ sự kiện') : h('li', { class: 'warn' }, 'Cần kiểm tra số liệu trước khi đăng'))));
          typeInto(p, text[T][o.key]);
          if (!A.work.querySelector('.dm-next')) A.work.appendChild(A.nextBtn('Gửi duyệt →'));
        }, 'cols-3 compact'));
        A.work.appendChild(out);
      },
      function (A) {
        A.heading('Trưởng phòng duyệt, Go AI theo dõi kết quả', 'Sau khi đăng, Go AI tổng hợp số liệu từ các kênh vào một báo cáo.');
        var res = h('div');
        add(A.work, [h('div', { class: 'dm-actions' },
          btn('Duyệt và lên lịch đăng', function () {
            A.log('human', 'Trưởng phòng Tiếp thị đã duyệt bản nháp.');
            A.log('ai', 'Lên lịch đăng 9:00 sáng mai trên ' + A.state.channel.title + '.');
            A.log('ok', 'Tổng hợp báo cáo 7 ngày sau khi đăng.');
            res.innerHTML = '';
            res.appendChild(h('div', { class: 'dm-panel' }, h('p', { class: 'dm-label' }, 'Báo cáo mẫu sau 7 ngày (số liệu minh họa)'),
              bars([{ label: 'Lượt tiếp cận', value: 12400, max: 12400, text: '12.400' }, { label: 'Lượt nhấp', value: 620, max: 12400, text: '620 · 5,0%', kind: 'b' }, { label: 'Đăng ký tư vấn', value: 38, max: 12400, text: '38', kind: 'g' }]),
              h('p', { class: 'dm-small' }, 'Gợi ý của Go AI: lần sau thử giọng “Thân thiện” cho Facebook để so sánh tỷ lệ nhấp.')));
            A.finish();
          }, 'primary'),
          btn('Yêu cầu sửa', function () { A.log('human', 'Trưởng phòng yêu cầu viết lại.'); A.go(1); }, 'ghost')), res]);
      }
    ]
  };

  DEMOS['nhan-su'] = {
    title: 'Trợ lý Nhân sự', subtitle: 'Sàng lọc hồ sơ sơ bộ theo tiêu chí do bạn chọn',
    steps: ['Chọn vị trí', 'Chọn tiêu chí sàng lọc', 'Mời phỏng vấn'],
    run: [
      function (A) {
        A.heading('Chọn vị trí cần tuyển', 'Go AI soạn mô tả công việc ngắn và đề xuất tiêu chí sàng lọc.');
        var roles = [
          { title: 'Nhân viên kinh doanh', sub: '2 người · Hà Nội', jd: 'Tìm kiếm và chăm sóc khách hàng doanh nghiệp, tư vấn giải pháp phần mềm, đạt chỉ tiêu doanh số hằng tháng.' },
          { title: 'Kế toán tổng hợp', sub: '1 người · TP.HCM', jd: 'Hạch toán, đối chiếu công nợ, lập báo cáo thuế hằng tháng và báo cáo tài chính cuối năm.' },
          { title: 'Lập trình viên', sub: '1 người · Làm từ xa', jd: 'Xây dựng và bảo trì tích hợp giữa phần mềm doanh nghiệp và các tác nhân AI.' }
        ];
        var res = h('div', { class: 'dm-result' });
        add(A.work, [choice(roles, function (o) {
          A.state.role = o; res.innerHTML = '';
          A.log('ai', 'Soạn mô tả công việc cho vị trí ' + o.title + '.');
          var p = h('p', { class: 'dm-draft' });
          res.appendChild(h('div', { class: 'dm-panel' }, h('p', { class: 'dm-label' }, 'Mô tả công việc (bản nháp)'), p));
          typeInto(p, o.jd);
          res.appendChild(A.nextBtn('Sàng lọc 6 hồ sơ →'));
        }, 'cols-3'), res]);
      },
      function (A) {
        A.heading('Bật/tắt tiêu chí để xem thứ hạng thay đổi', 'Hồ sơ đã được ẩn tên để giảm thiên kiến. Đây chỉ là sàng lọc sơ bộ.');
        var crit = [
          { key: 'kn', label: 'Kinh nghiệm từ 2 năm', w: 35, on: true },
          { key: 'cm', label: 'Chuyên môn đúng ngành', w: 30, on: true },
          { key: 'ta', label: 'Tiếng Anh giao tiếp', w: 20, on: false },
          { key: 'gn', label: 'Có thể đi làm ngay', w: 15, on: false }
        ];
        var cands = [
          { id: 'Ứng viên A', kn: 1, cm: 1, ta: 0, gn: 1 }, { id: 'Ứng viên B', kn: 1, cm: 0, ta: 1, gn: 1 },
          { id: 'Ứng viên C', kn: 0, cm: 1, ta: 1, gn: 1 }, { id: 'Ứng viên D', kn: 1, cm: 1, ta: 1, gn: 0 },
          { id: 'Ứng viên E', kn: 0, cm: 0, ta: 1, gn: 1 }, { id: 'Ứng viên F', kn: 1, cm: 1, ta: 0, gn: 0 }
        ];
        var list = h('div');
        var render = function () {
          var active = crit.filter(function (c) { return c.on; });
          var total = active.reduce(function (s, c) { return s + c.w; }, 0) || 1;
          var ranked = cands.map(function (c) { return { c: c, s: Math.round(100 * active.reduce(function (s, k) { return s + (c[k.key] ? k.w : 0); }, 0) / total) }; })
            .sort(function (a, b) { return b.s - a.s || (a.c.id < b.c.id ? -1 : 1); });
          A.state.ranked = ranked;
          list.innerHTML = '';
          list.appendChild(h('ol', { class: 'dm-rank' }, ranked.map(function (r, i) {
            return h('li', { class: i < 3 ? 'top' : '' }, h('span', { class: 'dm-rank-name' }, r.c.id),
              h('span', { class: 'dm-bar-track' }, h('i', { style: 'width:' + r.s + '%' })), h('b', null, r.s + '%'));
          })));
        };
        A.work.appendChild(h('div', { class: 'dm-toggles' }, crit.map(function (c) {
          var id = 'crit-' + c.key;
          var input = h('input', { type: 'checkbox', id: id });
          input.checked = c.on;
          input.addEventListener('change', function () { c.on = input.checked; render(); A.log('ai', (c.on ? 'Thêm' : 'Bỏ') + ' tiêu chí “' + c.label + '”, xếp hạng lại 6 hồ sơ.'); });
          return h('label', { class: 'dm-toggle', for: id }, input, h('span', null, c.label + ' · ' + c.w + ' điểm'));
        })));
        A.work.appendChild(list); render();
        A.log('ai', 'Đọc 6 hồ sơ, ẩn họ tên và ảnh.');
        A.work.appendChild(note('info', 'Quyết định tuyển dụng luôn thuộc về bộ phận nhân sự và người quản lý.'));
        A.work.appendChild(A.nextBtn('Mời 3 ứng viên đầu →'));
      },
      function (A) {
        var top = A.state.ranked.slice(0, 3).map(function (r) { return r.c.id; });
        A.heading('Chọn khung giờ phỏng vấn', 'Go AI soạn thư mời cho ' + top.join(', ') + ' và giữ lịch với người phỏng vấn.');
        var res = h('div');
        add(A.work, [choice([{ title: 'Thứ Ba', sub: '9:00 – 11:00' }, { title: 'Thứ Tư', sub: '14:00 – 16:00' }, { title: 'Thứ Sáu', sub: '9:00 – 11:00' }], function (o) {
          res.innerHTML = '';
          A.log('ai', 'Kiểm tra lịch trống của người phỏng vấn: ' + o.title + ' ' + o.sub + '.');
          var p = h('div', { class: 'dm-draft' });
          res.appendChild(h('div', { class: 'dm-panel' }, h('p', { class: 'dm-label' }, 'Thư mời phỏng vấn (bản nháp)'), p));
          typeInto(p, 'Chào bạn, cảm ơn bạn đã ứng tuyển vị trí ' + A.state.role.title + '. Chúng tôi trân trọng mời bạn tham gia phỏng vấn vào ' + o.title + ', khung giờ ' + o.sub + '. Vui lòng xác nhận tham dự bằng cách trả lời email này.');
          if (!res.querySelector('.dm-actions')) res.appendChild(h('div', { class: 'dm-actions' }, btn('HR duyệt & gửi thư mời', function () {
            A.log('human', 'Chuyên viên HR đã duyệt thư mời.');
            A.log('ok', 'Đã gửi 3 thư mời, giữ lịch ' + o.title + ' ' + o.sub + '.');
            A.finish();
          }, 'primary')));
        }, 'cols-3 compact'), res]);
      }
    ]
  };

  DEMOS['tai-chinh-ke-toan'] = {
    title: 'Trợ lý Kế toán', subtitle: 'Trích xuất và đối chiếu hóa đơn đầu vào',
    steps: ['Trích xuất hóa đơn', 'Đối chiếu ba bên', 'Chuyển duyệt'],
    run: [
      function (A) {
        A.heading('Chọn một hóa đơn vừa nhận qua email', 'Go AI đọc hóa đơn và trích xuất các trường cần hạch toán.');
        var inv = [
          { title: 'Công ty Linh kiện Phú An', sub: 'HĐ 0001245 · Linh kiện điện tử', no: '0001245', tax: '0312xxxx89', date: '28/10/2026', qty: 100, recv: 96, price: 450000, po: 'PO-1021' },
          { title: 'Công ty Vận tải Sao Mai', sub: 'HĐ 0000873 · Phí vận chuyển tháng 10', no: '0000873', tax: '0105xxxx21', date: '31/10/2026', qty: 12, recv: 12, price: 1500000, po: 'PO-1033' },
          { title: 'Công ty Văn phòng phẩm Hồng Hà', sub: 'HĐ 0004410 · Giấy in, mực in', no: '0004410', tax: '0101xxxx77', date: '30/10/2026', qty: 40, recv: 40, price: 120000, po: 'PO-1029' }
        ];
        var res = h('div', { class: 'dm-result' });
        add(A.work, [choice(inv, function (o) {
          A.state.inv = o; res.innerHTML = '';
          var sub = o.qty * o.price, vat = Math.round(sub * 0.1);
          A.log('ai', 'Trích xuất hóa đơn số ' + o.no + ' của ' + o.title + '.');
          res.appendChild(table(['Trường', 'Giá trị trích xuất'], [['Số hóa đơn', o.no], ['Mã số thuế bên bán', o.tax], ['Ngày hóa đơn', o.date], ['Số lượng', String(o.qty)], ['Tiền trước thuế', money(sub)], ['Thuế GTGT 10%', money(vat)], ['Tổng thanh toán', money(sub + vat)]]));
          res.appendChild(A.nextBtn('Đối chiếu với đơn hàng →'));
        }, 'cols-3'), res]);
      },
      function (A) {
        var o = A.state.inv, ok = o.qty === o.recv;
        A.heading('Đối chiếu ba bên', 'So khớp hóa đơn với đơn đặt hàng ' + o.po + ' và phiếu nhập kho.');
        A.log('ai', 'Đối chiếu hóa đơn ' + o.no + ' với ' + o.po + ' và phiếu nhập kho.');
        A.work.appendChild(table(['Thông tin', 'Đơn đặt hàng', 'Phiếu nhập kho', 'Hóa đơn', ''], [
          ['Số lượng', String(o.qty), String(o.recv), String(o.qty), ok ? '✓' : '✗'],
          ['Đơn giá', money(o.price), '—', money(o.price), '✓'],
          ['Nhà cung cấp', o.title, o.title, o.title, '✓']
        ], { rowClass: function (r) { return r[4] === '✗' ? 'bad' : ''; } }));
        if (ok) {
          A.log('ok', 'Khớp đủ 3 bên, không có chênh lệch.');
          A.work.appendChild(note('ok', 'Hóa đơn khớp với đơn hàng và phiếu nhập kho.'));
          A.work.appendChild(A.nextBtn('Chuẩn bị bút toán →'));
        } else {
          A.log('warn', 'Lệch số lượng: hóa đơn ' + o.qty + ', thực nhập ' + o.recv + '.');
          A.work.appendChild(note('warn', 'Chênh lệch ' + (o.qty - o.recv) + ' sản phẩm (' + money((o.qty - o.recv) * o.price) + ' trước thuế). Chọn cách xử lý:'));
          A.work.appendChild(choice([{ title: 'Gửi email hỏi nhà cung cấp', sub: 'Go AI soạn sẵn nội dung' }, { title: 'Ghi nhận theo thực nhập', sub: 'Chờ hóa đơn điều chỉnh' }], function (c, i) {
            A.state.fix = i;
            A.log('human', 'Kế toán chọn: ' + c.title.toLowerCase() + '.');
            if (!A.work.querySelector('.dm-next')) A.work.appendChild(A.nextBtn('Chuẩn bị bút toán →'));
          }, 'cols-2'));
        }
      },
      function (A) {
        var o = A.state.inv, q = (o.qty === o.recv || A.state.fix === 0) ? o.qty : o.recv;
        var sub = q * o.price, vat = Math.round(sub * 0.1);
        A.heading('Bút toán đề xuất', 'Go AI chỉ chuẩn bị. Việc ghi sổ và thanh toán do người có thẩm quyền quyết định.');
        A.work.appendChild(table(['Nợ / Có', 'Tài khoản', 'Số tiền'], [['Nợ', '156 · Hàng hóa (ví dụ)', money(sub)], ['Nợ', '1331 · Thuế GTGT được khấu trừ', money(vat)], ['Có', '331 · Phải trả người bán', money(sub + vat)]]));
        if (A.state.fix === 0) A.work.appendChild(note('info', 'Đang chờ nhà cung cấp phản hồi; bút toán tạm lập theo hóa đơn.'));
        A.work.appendChild(h('div', { class: 'dm-actions' }, btn('Kế toán trưởng duyệt', function () {
          A.log('human', 'Kế toán trưởng đã duyệt bút toán.');
          A.log('ok', 'Lưu chứng từ, lên lịch thanh toán theo hạn công nợ.');
          A.finish();
        }, 'primary'), btn('Trả lại kiểm tra', function () { A.log('human', 'Kế toán trưởng yêu cầu kiểm tra lại.'); A.go(1); }, 'ghost')));
      }
    ]
  };

  DEMOS['van-hanh'] = {
    title: 'Trợ lý Vận hành', subtitle: 'Phân loại yêu cầu và cảnh báo việc trễ hạn',
    steps: ['Phân loại yêu cầu', 'Theo dõi và xử lý ngoại lệ', 'Báo cáo cuối ngày'],
    run: [
      function (A) {
        A.heading('5 yêu cầu vừa gửi đến bộ phận vận hành', 'Bấm để Go AI phân loại, đặt mức ưu tiên và giao đúng người phụ trách.');
        var reqs = [
          ['#101', 'Máy in tầng 3 không in được', 'Thiết bị', 'Trung bình', 'Anh Tuấn · IT'],
          ['#102', 'Xin cấp quyền thư mục dự án mới', 'Tài khoản', 'Thấp', 'Chị Hoa · IT'],
          ['#103', 'Kho báo thiếu 20 thùng hàng giao chiều nay', 'Kho vận', 'Cao', 'Anh Minh · Kho'],
          ['#104', 'Điều hòa phòng họp lớn hỏng', 'Cơ sở vật chất', 'Trung bình', 'Anh Hùng · Hành chính'],
          ['#105', 'Đặt xe đón khách hàng sáng thứ Hai', 'Hành chính', 'Thấp', 'Chị Ngọc · Hành chính']
        ];
        var box = h('div');
        var raw = function () { return table(['Mã', 'Nội dung', 'Loại', 'Ưu tiên', 'Phụ trách'], reqs.map(function (r) { return [r[0], r[1], '—', '—', '—']; })); };
        box.appendChild(raw());
        A.work.appendChild(box);
        var b = btn('Phân loại tự động', function () {
          box.innerHTML = '';
          box.appendChild(table(['Mã', 'Nội dung', 'Loại', 'Ưu tiên', 'Phụ trách'], reqs.map(function (r) {
            return [r[0], r[1], h('span', { class: 'dm-chip' }, r[2]), h('span', { class: 'dm-chip pri-' + (r[3] === 'Cao' ? 'hi' : r[3] === 'Thấp' ? 'lo' : 'mid') }, r[3]), r[4]];
          })));
          A.log('ai', 'Phân loại 5 yêu cầu, giao cho 5 người phụ trách.');
          A.log('warn', 'Yêu cầu #103 ưu tiên cao: ảnh hưởng đơn giao chiều nay.');
          b.remove();
          A.work.appendChild(A.nextBtn('Theo dõi tiến độ →'));
        }, 'primary');
        A.work.appendChild(h('div', { class: 'dm-actions' }, b));
      },
      function (A) {
        A.heading('Bảng theo dõi trong ngày', 'Bấm “Mô phỏng 4 giờ” để xem Go AI cảnh báo yêu cầu sắp trễ hạn.');
        var cols = { 'Mới': ['#102', '#105'], 'Đang xử lý': ['#101', '#103', '#104'], 'Hoàn thành': [] };
        var board = h('div', { class: 'dm-board' });
        var draw = function (late) {
          board.innerHTML = '';
          Object.keys(cols).forEach(function (k) {
            board.appendChild(h('div', { class: 'dm-col' }, h('p', { class: 'dm-label' }, k + ' · ' + cols[k].length), cols[k].map(function (id) {
              return h('div', { class: 'dm-ticket' + (late && id === '#104' ? ' late' : '') }, h('b', null, id), late && id === '#104' ? h('small', null, 'Quá hạn 2 giờ') : null);
            })));
          });
        };
        draw(false);
        A.work.appendChild(board);
        var res = h('div');
        var sim = btn('Mô phỏng 4 giờ', function () {
          cols = { 'Mới': ['#105'], 'Đang xử lý': ['#104'], 'Hoàn thành': ['#101', '#102', '#103'] };
          draw(true); sim.remove();
          A.log('ok', '#101, #102, #103 đã hoàn thành.');
          A.log('warn', '#104 quá hạn xử lý 2 giờ (cam kết 4 giờ).');
          res.appendChild(note('warn', 'Yêu cầu #104 “Điều hòa phòng họp lớn hỏng” đã quá hạn. Chọn cách xử lý:'));
          res.appendChild(choice([{ title: 'Nhắc người phụ trách', sub: 'Gửi tin nhắn cho anh Hùng' }, { title: 'Chuyển cấp quản lý', sub: 'Báo Trưởng phòng Hành chính' }], function (c) {
            A.state.esc = c.title;
            A.log('human', 'Điều phối viên chọn: ' + c.title.toLowerCase() + '.');
            if (!A.work.querySelector('.dm-next')) A.work.appendChild(A.nextBtn('Xem báo cáo cuối ngày →'));
          }, 'cols-2'));
        }, 'primary');
        A.work.appendChild(h('div', { class: 'dm-actions' }, sim));
        A.work.appendChild(res);
      },
      function (A) {
        A.heading('Báo cáo cuối ngày', 'Go AI tổng hợp tự động và gửi trưởng bộ phận lúc 17:30.');
        A.log('ai', 'Tổng hợp số liệu trong ngày.');
        A.work.appendChild(h('div', { class: 'dm-panel' },
          bars([{ label: 'Hoàn thành', value: 4, max: 5, text: '4/5', kind: 'g' }, { label: 'Đúng hạn', value: 3, max: 4, text: '3/4' }, { label: 'Quá hạn', value: 1, max: 5, text: '1', kind: 'r' }]),
          h('p', { class: 'dm-small' }, 'Ngoại lệ: #104 (' + (A.state.esc || 'đã nhắc') + '). Nguyên nhân chờ linh kiện. Đề xuất: lập danh sách nhà cung cấp dự phòng.')));
        A.work.appendChild(h('div', { class: 'dm-actions' }, btn('Gửi báo cáo', function () { A.log('ok', 'Đã gửi báo cáo cho Trưởng phòng Vận hành.'); A.finish(); }, 'primary')));
      }
    ]
  };

  DEMOS['cham-soc-khach-hang'] = {
    title: 'Trợ lý Chăm sóc khách hàng', subtitle: 'Trả lời nhanh, chuyển đúng người khi nhạy cảm',
    steps: ['Chọn tin nhắn', 'Go AI tra cứu và soạn trả lời', 'Nhân viên quyết định'],
    run: [
      function (A) {
        A.heading('Chọn một tin nhắn khách hàng', 'Go AI nhận diện ý định, mức độ nhạy cảm và tìm thông tin trong nguồn được phép.');
        var msgs = [
          { title: 'Hỏi chính sách đổi trả', sub: '“Mua áo bị chật thì đổi size được không shop?”', tag: 'Câu hỏi', intent: 'Hỏi chính sách', sensitive: false,
            src: ['Chính sách đổi trả · mục 2.1: đổi size trong 7 ngày, còn tem mác'], reply: 'Dạ, sản phẩm được đổi size miễn phí trong 7 ngày kể từ khi nhận hàng, với điều kiện còn nguyên tem mác. Anh/chị cho em xin mã đơn hàng để em tạo yêu cầu đổi ngay nhé.' },
          { title: 'Hỏi tình trạng đơn hàng', sub: '“Đơn A1023 của mình đến đâu rồi?”', tag: 'Câu hỏi', intent: 'Tra cứu đơn hàng', sensitive: false,
            src: ['Hệ thống đơn hàng · A1023: đang giao, dự kiến 14:00–17:00 hôm nay'], reply: 'Dạ, đơn A1023 đang trên đường giao và dự kiến đến trong khoảng 14:00–17:00 hôm nay. Shipper sẽ gọi trước khi giao ạ.' },
          { title: 'Khiếu nại giao trễ', sub: '“Giao trễ 5 ngày rồi, tôi muốn hoàn tiền ngay!”', tag: 'Nhạy cảm', tagKind: 'warn', intent: 'Khiếu nại · yêu cầu hoàn tiền', sensitive: true,
            src: ['Hệ thống đơn hàng · A0988: trễ 5 ngày do kho', 'Quy định: hoàn tiền do nhân viên cấp 2 quyết định'], reply: 'Dạ, em rất xin lỗi vì đơn hàng đã giao trễ 5 ngày. Em đã chuyển yêu cầu hoàn tiền của anh/chị cho trưởng nhóm chăm sóc khách hàng, anh/chị sẽ nhận phản hồi trong vòng 2 giờ ạ.' }
        ];
        var res = h('div', { class: 'dm-result' });
        add(A.work, [choice(msgs, function (m) {
          A.state.msg = m; res.innerHTML = '';
          A.log('ai', 'Nhận diện ý định: ' + m.intent + '.');
          if (m.sensitive) A.log('warn', 'Phát hiện nội dung nhạy cảm: khiếu nại kèm yêu cầu hoàn tiền.');
          res.appendChild(A.nextBtn('Tra cứu và soạn trả lời →'));
        }, 'cols-3'), res]);
      },
      function (A) {
        var m = A.state.msg;
        A.heading(m.sensitive ? 'Trường hợp nhạy cảm: không tự trả lời' : 'Bản trả lời nháp kèm nguồn', m.sensitive ? 'Go AI đề xuất chuyển người phụ trách và soạn lời xin lỗi tạm thời.' : 'Mỗi câu trả lời đều ghi rõ nguồn để nhân viên kiểm tra.');
        A.log('ai', 'Tìm thấy ' + m.src.length + ' nguồn thông tin liên quan.');
        A.work.appendChild(h('div', { class: 'dm-panel' }, h('p', { class: 'dm-label' }, 'Nguồn đã dùng'), h('ul', { class: 'dm-list src' }, m.src.map(function (s) { return h('li', null, s); }))));
        if (m.sensitive) A.work.appendChild(note('warn', 'Khiếu nại có yêu cầu hoàn tiền phải do nhân viên cấp 2 xử lý.'));
        var ta = h('textarea', { class: 'dm-textarea', rows: 4, 'aria-label': 'Trả lời nháp, có thể chỉnh sửa' });
        A.work.appendChild(h('p', { class: 'dm-label' }, 'Trả lời nháp (bạn có thể sửa)'));
        A.work.appendChild(ta);
        typeInto(ta, m.reply);
        A.state.ta = ta;
        A.work.appendChild(A.nextBtn('Chuyển nhân viên →'));
      },
      function (A) {
        var m = A.state.msg;
        A.heading('Nhân viên chọn cách xử lý', 'Go AI ghi nhận kết quả vào phiếu hỗ trợ và gửi khảo sát hài lòng khi phiếu đóng.');
        var res = h('div');
        var finish = function (who, status) {
          A.log('human', who);
          A.log('ok', 'Cập nhật phiếu hỗ trợ: ' + status + '.');
          res.innerHTML = '';
          res.appendChild(h('div', { class: 'dm-panel' }, h('div', { class: 'dm-kv' }, h('span', null, 'Phiếu'), h('b', null, '#CS-2041'), h('span', null, 'Trạng thái'), h('b', null, status), h('span', null, 'Thời gian phản hồi'), h('b', null, '2 phút'))));
          A.finish();
        };
        add(A.work, [h('div', { class: 'dm-actions' },
          !m.sensitive ? btn('Gửi trả lời', function () { finish('Nhân viên đã kiểm tra và gửi trả lời.', 'Đã trả lời · chờ khách xác nhận'); }, 'primary') : null,
          btn('Chuyển trưởng nhóm', function () { finish('Nhân viên chuyển cho trưởng nhóm CSKH.', 'Đã chuyển cấp · hạn phản hồi 2 giờ'); }, m.sensitive ? 'primary' : 'ghost'),
          btn('Sửa nội dung', function () { A.state.ta && A.state.ta.focus(); A.go(1); A.log('human', 'Nhân viên chỉnh sửa nội dung trả lời.'); }, 'ghost')), res]);
      }
    ]
  };

  /* ---------- khung demo ---------- */
  var key = root.getAttribute('data-goai-demo');
  var D = DEMOS[key];
  if (!D) return;
  var state = {}, step = 0, clock = 9 * 60 + 2;
  var stepper = h('ol', { class: 'dm-steps' }, D.steps.map(function (s, i) { return h('li', null, h('span', { class: 'dm-step-n' }, String(i + 1)), h('span', { class: 'dm-step-t' }, s)); }));
  var work = h('div', { class: 'dm-work', tabindex: '-1' });
  var logList = h('ol', { class: 'dm-log-list', 'aria-live': 'polite' });
  var resetBtn = h('button', { type: 'button', class: 'dm-reset' }, '↺ Làm lại');
  var shell = h('div', { class: 'dm-shell' },
    h('div', { class: 'dm-top' },
      h('span', { class: 'dm-dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
      h('span', { class: 'dm-title' }, h('b', null, 'Go AI · ' + D.title), h('small', null, D.subtitle)),
      h('span', { class: 'dm-badge' }, 'Bản trải nghiệm'), resetBtn),
    stepper,
    h('div', { class: 'dm-body' }, work, h('aside', { class: 'dm-log', 'aria-label': 'Nhật ký Go AI' }, h('p', { class: 'dm-log-h' }, 'Nhật ký Go AI'), logList,
      h('div', { class: 'dm-legend' }, h('span', { class: 'ai', html: ICON.ai + ' Go AI' }), h('span', { class: 'human', html: ICON.human + ' Con người' })))));
  root.appendChild(shell);

  var A = {
    state: state, work: work,
    heading: function (t, sub) { work.appendChild(h('h3', { class: 'dm-h' }, t)); if (sub) work.appendChild(h('p', { class: 'dm-sub' }, sub)); },
    log: function (kind, text) {
      clock += 1 + (logList.children.length % 3);
      var hh = Math.floor(clock / 60), mm = clock % 60;
      logList.appendChild(h('li', { class: kind }, h('span', { class: 'dm-log-ic', html: ICON[kind] }), h('span', null, h('time', null, (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm), text)));
      logList.scrollTop = logList.scrollHeight;
    },
    nextBtn: function (label) { return h('div', { class: 'dm-actions' }, btn(label, function () { A.go(step + 1); }, 'primary dm-next')); },
    go: function (i) { step = i; draw(); },
    finish: function () {
      stepper.querySelectorAll('li').forEach(function (li) { li.className = 'done'; });
      if (work.querySelector('.dm-finish')) return;
      work.appendChild(h('div', { class: 'dm-finish' },
        h('p', null, h('b', null, 'Hoàn tất demo. '), 'Trong triển khai thật, Go AI kết nối với phần mềm doanh nghiệp đang dùng và các bước duyệt do bạn quy định.'),
        h('div', { class: 'dm-actions' }, h('a', { class: 'dm-btn primary', href: '#buoc-tiep-theo' }, 'Đăng ký tư vấn cho quy trình này →'), btn('Thử lại', function () { reset(); }, 'ghost'))));
      work.querySelectorAll('button.dm-btn').forEach(function (b) { if (!b.closest('.dm-finish')) b.disabled = true; });
    }
  };
  function draw() {
    work.innerHTML = '';
    stepper.querySelectorAll('li').forEach(function (li, i) { li.className = i < step ? 'done' : i === step ? 'on' : ''; li.setAttribute('aria-current', i === step ? 'step' : 'false'); });
    D.run[step](A);
    if (draw.started) work.focus({ preventScroll: true });
    draw.started = true;
  }
  function reset() {
    Object.keys(state).forEach(function (k) { delete state[k]; });
    logList.innerHTML = ''; clock = 9 * 60 + 2; step = 0; draw();
  }
  resetBtn.addEventListener('click', reset);
  draw();
})();
