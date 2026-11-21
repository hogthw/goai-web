(function () {
  const GOAI_WEBHOOK = 'https://ai-agent-worker.trantansy.workers.dev/chat';
  const LOGO_URL = '/assets/go-ai-logo.png';
  const FALLBACK_AVATAR = 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png';

  const MAX_FAQ_QUESTIONS = 3;
  const MAX_AI_QUESTIONS = 5;
  const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // Tự động reset sau 8 tiếng
  const GOAI_SECRET_TOKEN = 'GO_AI_SECURE_TOKEN_2026_XYZ';
  let lastMessageTime = 0;

  // Khung giờ trực tuyến của trợ lý AI: 07:00 – 24:00 (giờ Việt Nam)
  const ONLINE_FROM_HOUR = 7;
  const GOAI_OFFLINE_SHORT = 'Trợ lý AI nghỉ từ 00:00 đến 07:00 (giờ Việt Nam). Anh/chị vẫn xem được các câu hỏi gợi ý.';
  const GOAI_OFFLINE_MSG = '🌙 Hiện ngoài giờ hoạt động của trợ lý AI (07:00 – 24:00, giờ Việt Nam). Anh/chị vẫn có thể xem các câu hỏi thường gặp bên dưới; tính năng đăng ký mở khóa AI suy luận sẽ hoạt động lại từ 07:00.';
  let goaiLastOnline = null;

  function goaiIsOnline() {
    let h;
    try {
      h = parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hourCycle: 'h23' }).format(new Date()), 10);
    } catch (e) {
      h = (new Date().getUTCHours() + 7) % 24;
    }
    return h >= ONLINE_FROM_HOUR;
  }

  function goaiSyncOnlineState() {
    const online = goaiIsOnline();
    const dot = document.querySelector('#goai-chat-box .goai-online-dot');
    if (dot) {
      dot.classList.toggle('offline', !online);
      dot.title = online ? 'Đang trực tuyến' : 'Ngoài giờ hoạt động (07:00 – 24:00)';
    }
    if (online !== goaiLastOnline) {
      goaiLastOnline = online;
      goaiSyncInputState();
    }
  }

  // 1. Tự động chèn khung HTML Chatbot nếu trên trang chưa có sẵn
  function ensureChatDOM() {
    if (!document.getElementById('goai-chat-btn')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'goai-chat-btn';
      btn.setAttribute('data-tooltip', 'Trợ lý AI');
      btn.setAttribute('aria-label', 'Mở trợ lý Go AI');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', 'goai-chat-box');
      btn.innerHTML = `
        <svg class="goai-ico-chat" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        <svg class="goai-ico-close" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      `;
      document.body.appendChild(btn);
    }

    if (!document.getElementById('goai-teaser')) {
      const teaser = document.createElement('div');
      teaser.id = 'goai-teaser';
      teaser.setAttribute('role', 'status');
      teaser.innerHTML = `
        <span>👋 Cần hỗ trợ? Hỏi Go AI ngay</span>
        <button type="button" aria-label="Đóng lời chào" id="goai-teaser-close">×</button>
      `;
      document.body.appendChild(teaser);
    }

    if (!document.getElementById('goai-chat-box')) {
      const box = document.createElement('div');
      box.id = 'goai-chat-box';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', 'Trợ lý Go AI');
      box.setAttribute('aria-modal', 'false');
      box.innerHTML = `
        <div id="goai-head">
          <div class="goai-head-title">
            <div class="goai-online-dot"></div><span>Trợ lý Go AI</span>
          </div>
          <div class="goai-head-actions">
            <button type="button" class="goai-head-btn" id="goai-reset-btn" title="Làm mới cuộc trò chuyện">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
              Làm mới
            </button>
            <button type="button" class="goai-head-btn goai-close" id="goai-close-btn" aria-label="Đóng">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <div id="goai-body">
          <div id="goai-intro">
            <p class="goai-q">Kính chào Quý khách! Go AI có thể hỗ trợ giải pháp gì cho doanh nghiệp của bạn?</p>
            <div id="goai-options">
              <button type="button" class="goai-opt" data-opt="Tự Động Tác Vụ">Tự Động Tác Vụ</button>
              <button type="button" class="goai-opt" data-opt="Tự Động Quy Trình">Tự Động Quy Trình</button>
              <button type="button" class="goai-opt" data-opt="Tự Động Đa Tác Nhân">Tự Động Đa Tác Nhân</button>
              <button type="button" class="goai-opt goai-opt-ext" data-opt="Bảo mật dữ liệu DCS">Bảo mật dữ liệu DCS ↗</button>
              <button type="button" class="goai-opt" data-opt="Tôi chưa biết bắt đầu từ đâu">Tôi chưa biết bắt đầu từ đâu</button>
              <button type="button" class="goai-opt form-trigger" data-opt="FORM_DIRECT">Đăng ký chuyên gia tư vấn</button>
            </div>
          </div>

          <div id="goai-conversation" style="display:none; flex:1; min-height:0; flex-direction: column;">
            <div id="goai-msgs" aria-live="polite"></div>
            <button type="button" id="goai-scroll-down" aria-label="Xuống tin nhắn mới nhất">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div id="goai-toast" role="status"></div>
            <div id="goai-input-area">
              <input id="goai-inp" disabled enterkeyhint="send" placeholder="🔒 Chọn gợi ý (0/3) hoặc đăng ký" autocomplete="off" aria-label="Nhập câu hỏi">
              <button type="button" id="goai-send-btn" disabled aria-label="Gửi">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
          </div>
        </div>

        <div id="goai-confirm" role="alertdialog" aria-label="Xác nhận làm mới">
          <div class="goai-confirm-card">
            <p>Bạn có chắc muốn làm mới để bắt đầu lại cuộc trò chuyện từ đầu?</p>
            <div class="goai-confirm-actions">
              <button type="button" class="goai-cf-cancel" id="goai-cf-cancel-btn">Hủy</button>
              <button type="button" class="goai-cf-ok" id="goai-cf-ok-btn">Làm mới</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(box);
    }
  }

  // CSS sửa lỗi chữ bị giãn cách (justify) và vỡ dòng trong khung chat
  function ensureStyle() {
    if (document.getElementById('goai-fix-style')) return;
    const st = document.createElement('style');
    st.id = 'goai-fix-style';
    st.textContent = `
      #goai-chat-box .goai-msg,
      #goai-chat-box .goai-msg * {
        text-align: left !important;
        text-align-last: left !important;
        text-justify: auto !important;
        word-spacing: normal !important;
        letter-spacing: normal !important;
        hyphens: none !important;
        -webkit-hyphens: none !important;
        word-break: normal !important;
        overflow-wrap: break-word !important;
      }
      #goai-chat-box .goai-suggestion-chips button { text-align: left !important; }
      #goai-send-btn.goai-send-locked { cursor: pointer !important; opacity: 1 !important; }
      #goai-chat-box .goai-bot-avatar { object-fit: contain !important; padding: 3px !important; box-sizing: border-box !important; background: #fff !important; }
      #goai-chat-box .goai-online-dot.offline { background: #ef4444 !important; animation: none !important; box-shadow: 0 0 0 3px rgba(239,68,68,.25) !important; }
    `;
    document.head.appendChild(st);
  }

  function goaiEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  let goaiSid = localStorage.getItem('goai_sid');
  let chatHistory = JSON.parse(localStorage.getItem('goai_chat_history_v2') || '[]');
  let faqCount = parseInt(localStorage.getItem('goai_faq_count') || '0', 10);
  let aiCount = parseInt(localStorage.getItem('goai_ai_count') || '0', 10);

  // Kiểm tra hạn 8 tiếng
  function goaiCheckSessionExpiry(resetDOM = false) {
    const savedTs = parseInt(localStorage.getItem('goai_session_ts') || '0', 10);
    const now = Date.now();
    if (savedTs > 0 && (now - savedTs > SESSION_TTL_MS)) {
      ['goai_sid', 'goai_chat_history_v2', 'goai_faq_count', 'goai_ai_count', 'goai_lead_submitted', 'goai_chat_open', 'goai_session_ts'].forEach(k => localStorage.removeItem(k));
      sessionStorage.removeItem('goai_pending_q');
      chatHistory = [];
      faqCount = 0;
      aiCount = 0;
      goaiSid = 'sess-' + Math.random().toString(36).slice(2) + now;
      localStorage.setItem('goai_sid', goaiSid);
      localStorage.setItem('goai_session_ts', String(now));

      if (resetDOM) {
        const msgsEl = document.getElementById('goai-msgs');
        if (msgsEl) msgsEl.innerHTML = '';
        const introEl = document.getElementById('goai-intro');
        const convEl = document.getElementById('goai-conversation');
        const bodyEl = document.getElementById('goai-body');
        if (introEl && convEl && bodyEl) {
          introEl.style.display = 'block';
          convEl.style.display = 'none';
          bodyEl.classList.remove('in-chat');
        }
        goaiSyncInputState();
      }
      return true;
    }
    if (!savedTs) localStorage.setItem('goai_session_ts', String(now));
    if (!goaiSid) {
      goaiSid = 'sess-' + Math.random().toString(36).slice(2) + now;
      localStorage.setItem('goai_sid', goaiSid);
    }
    return false;
  }

  goaiCheckSessionExpiry(false);
  setInterval(() => goaiCheckSessionExpiry(true), 60000);

  function goaiScrollBottom() {
    const m = document.getElementById('goai-msgs');
    if (!m) return;
    const jump = () => { m.scrollTop = m.scrollHeight; };
    requestAnimationFrame(() => {
      jump();
      m.scrollTo({ top: m.scrollHeight, behavior: 'smooth' });
    });
    setTimeout(jump, 350);
  }

  function goaiShowConversation() {
    const intro = document.getElementById('goai-intro');
    const conv = document.getElementById('goai-conversation');
    const body = document.getElementById('goai-body');
    if (intro) intro.style.display = 'none';
    if (conv) conv.style.display = 'flex';
    if (body) body.classList.add('in-chat');
  }

  function goaiAskedList() {
    return chatHistory.filter(m => m.role === 'user').map(m => String(m.text).slice(0, 120)).slice(-30);
  }

  function parseSuggestions(reply) {
    if (!reply) return null;
    const match = reply.match(/\[SUGGESTIONS:\s*([^\]]+)\]?/i);
    if (!match) return null;
    return match[1].split('|').map(s => s.trim()).filter(s => s.length > 0 && s.length < 120);
  }

  function stripSuggestionTag(reply) {
    if (!reply) return '';
    return reply.replace(/\[SUGGESTIONS:\s*[^\]]*\]?/gi, '').trim();
  }

  function renderSuggestionChips(suggestions, maxChips = 4) {
    if (!suggestions || suggestions.length === 0) return "";
    let html = '<div class="goai-suggestion-chips">';
    suggestions.slice(0, maxChips).forEach(q => {
      html += `<button type="button" data-q="${goaiEsc(q)}" onclick="window.goaiSelect(this.dataset.q, true)">${goaiEsc(q)}</button>`;
    });
    html += '</div>';
    return html;
  }

  function goaiIsFormSubmitted() {
    return localStorage.getItem('goai_lead_submitted') === 'true';
  }

  function goaiSyncInputState() {
    const inp = document.getElementById('goai-inp');
    const btn = document.getElementById('goai-send-btn');
    if (!inp || !btn) return;

    btn.classList.remove('goai-send-locked');
    btn.title = 'Gửi';
    btn.setAttribute('aria-label', 'Gửi');

    if (!goaiIsOnline()) {
      // Ngoài 07:00 – 24:00: chỉ cho xem FAQ tĩnh, không mở khóa / không hỏi AI
      inp.disabled = true;
      btn.disabled = false;
      btn.classList.add('goai-send-locked');
      btn.title = 'Trợ lý AI đang nghỉ (07:00 – 24:00)';
      btn.setAttribute('aria-label', 'Trợ lý AI đang nghỉ (07:00 – 24:00)');
      inp.value = '';
      inp.placeholder = '🌙 Ngoài giờ (07:00–24:00) – chọn câu hỏi gợi ý';
      inp.style.cursor = 'not-allowed';
      return;
    }

    if (!goaiIsFormSubmitted()) {
      inp.disabled = true;
      btn.disabled = false; // mũi tên dẫn tới form đăng ký khi AI chưa mở khóa
      btn.classList.add('goai-send-locked');
      btn.title = 'Điền form tư vấn để mở khóa AI suy luận';
      btn.setAttribute('aria-label', 'Điền form tư vấn để mở khóa AI suy luận');
      inp.value = '';
      inp.placeholder = `🔒 Chọn gợi ý (${faqCount}/${MAX_FAQ_QUESTIONS}) hoặc đăng ký`;
      inp.style.cursor = "not-allowed";
    } else {
      if (aiCount >= MAX_AI_QUESTIONS) {
        inp.disabled = true;
        btn.disabled = true;
        inp.value = '';
        inp.placeholder = "Đã hết 5 lượt hỏi AI";
        inp.style.cursor = "not-allowed";
      } else {
        inp.disabled = false;
        btn.disabled = false;
        inp.style.cursor = "text";
        const left = MAX_AI_QUESTIONS - aiCount;
        inp.placeholder = `Nhập câu hỏi (còn ${left} lượt)...`;
      }
    }
  }

  let goaiToastTimer = null;
  function goaiToast(msg) {
    const t = document.getElementById('goai-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(goaiToastTimer);
    goaiToastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  function goaiLockedHint() {
    const inp = document.getElementById('goai-inp');
    if (!inp || !inp.disabled) return;
    const area = document.getElementById('goai-input-area');
    if (area) {
      area.classList.remove('shake');
      void area.offsetWidth;
      area.classList.add('shake');
    }
    goaiToast(!goaiIsOnline() ? GOAI_OFFLINE_SHORT : goaiIsFormSubmitted()
      ? 'Anh/chị đã dùng hết lượt hỏi AI. Chuyên gia sẽ liên hệ trực tiếp.'
      : 'Chọn câu hỏi gợi ý hoặc đăng ký chuyên gia để mở khóa nhập tự do.');
  }

  function goaiHideTeaser(remember = true) {
    const t = document.getElementById('goai-teaser');
    if (t) t.classList.remove('show');
    if (remember) sessionStorage.setItem('goai_teaser_seen', '1');
  }

  function goaiSetOpen(open, animate = true) {
    const box = document.getElementById('goai-chat-box');
    const btn = document.getElementById('goai-chat-btn');
    if (!box || !btn) return;
    clearTimeout(box._t);
    btn.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Đóng trợ lý Go AI' : 'Mở trợ lý Go AI');
    box.classList.remove('opening', 'closing');
    if (open) {
      goaiCheckSessionExpiry(true);
      goaiHideTeaser();
      box.style.display = 'flex';
      if (animate) { void box.offsetWidth; box.classList.add('opening'); }
      goaiScrollBottom();
    } else if (animate) {
      box.classList.add('closing');
      box._t = setTimeout(() => { box.style.display = 'none'; box.classList.remove('closing'); }, 200);
    } else {
      box.style.display = 'none';
    }
  }

  function goaiToggle() {
    ensureChatDOM();
    const box = document.getElementById('goai-chat-box');
    if (!box) return;
    const willOpen = box.style.display !== 'flex' || box.classList.contains('closing');
    goaiSetOpen(willOpen);
    localStorage.setItem('goai_chat_open', willOpen);
    if (willOpen) {
      const inp = document.getElementById('goai-inp');
      if (inp && !inp.disabled && window.innerWidth > 480 && chatHistory.length > 0) setTimeout(() => inp.focus(), 350);
    } else {
      const btn = document.getElementById('goai-chat-btn');
      if (btn) btn.focus({ preventScroll: true });
    }
  }

  function goaiResetChat() {
    const cf = document.getElementById('goai-confirm');
    if (cf) cf.classList.add('show');
  }
  function goaiCloseConfirm() {
    const cf = document.getElementById('goai-confirm');
    if (cf) cf.classList.remove('show');
  }
  function goaiConfirmReset() {
    ['goai_sid', 'goai_chat_history_v2', 'goai_faq_count', 'goai_ai_count', 'goai_lead_submitted', 'goai_chat_open', 'goai_session_ts'].forEach(k => localStorage.removeItem(k));
    sessionStorage.removeItem('goai_pending_q');
    location.reload();
  }

  function getFormHTML() {
    return `
    <div class="goai-inline-form">
        <input type="text" class="f-honeypot" style="position:absolute; left:-9999px;" tabindex="-1" autocomplete="off">
        <input type="text" class="f-name" placeholder="Họ & tên *" required autocomplete="name">
        <input type="tel" class="f-phone" placeholder="Số điện thoại *" required autocomplete="tel" inputmode="tel">
        <input type="email" class="f-email" placeholder="Địa chỉ Email (có chứa @) *" required autocomplete="email">
        <input type="text" class="f-company" placeholder="Tên công ty / Doanh nghiệp *" required autocomplete="organization">
        <div style="display:flex; gap:8px;">
            <input type="text" class="f-title" placeholder="Chức danh *" required style="flex:1;">
            <input type="text" class="f-industry" placeholder="Ngành nghề *" required style="flex:1;">
        </div>
        <div style="display:flex; gap:8px;">
            <select class="f-size" required style="flex:1;">
                <option value="" disabled selected>Quy mô DN *</option>
                <option value="Dưới 50 nhân sự">Dưới 50</option>
                <option value="50 - 200 nhân sự">50 - 200</option>
                <option value="Trên 200 nhân sự">Trên 200</option>
            </select>
            <select class="f-province" required style="flex:1;">
                <option value="" disabled selected>Tỉnh/TP *</option>
                <option value="Hồ Chí Minh">TP. Hồ Chí Minh</option>
                <option value="Hà Nội">Hà Nội</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
                <option value="Bình Dương">Bình Dương</option>
                <option value="Đồng Nai">Đồng Nai</option>
                <option value="Hải Phòng">Hải Phòng</option>
                <option value="Cần Thơ">Cần Thơ</option>
                <option value="Bà Rịa - Vũng Tàu">Bà Rịa - Vũng Tàu</option>
                <option value="Khác">Tỉnh/TP Khác</option>
            </select>
        </div>
        <select class="f-needs" required>
            <option value="" disabled selected>Use case ưu tiên (Chọn) *</option>
            <option value="Tự động tác vụ">Tự động tác vụ</option>
            <option value="Tự động quy trình">Tự động quy trình</option>
            <option value="Tự động đa tác nhân">Tự động đa tác nhân</option>
            <option value="Bảo mật dữ liệu">Bảo mật dữ liệu</option>
            <option value="Tư vấn tổng thể">Tư vấn tổng thể</option>
            <option value="Khác">Khác...</option>
        </select>
        <textarea class="f-note" placeholder="Mô tả thêm nhu cầu của bạn..." rows="2"></textarea>
        <div class="goai-error-msg"></div>
        <button type="button" onclick="window.goaiSubmitLeadForm(this)">Gửi yêu cầu & Mở khóa AI</button>
    </div>`;
  }

  function goaiOpenFormDirect() {
    goaiShowConversation();
    if (!goaiIsOnline()) {
      goaiAddMsgAndSave('bot', GOAI_OFFLINE_MSG);
      return;
    }
    localStorage.setItem('goai_chat_open', 'true');
    goaiAddMsgAndSave('user', "Đăng ký chuyên gia tư vấn");
    goaiAddMsgAndSave('bot', 'Để chuyên gia Go AI chuẩn bị giải pháp và mở khóa AI suy luận chuyên sâu, vui lòng điền thông tin bên dưới:', getFormHTML());
  }

  // Nút mũi tên khi AI chưa mở khóa: đưa khách tới form tư vấn (không tạo form trùng)
  function goaiFocusLeadForm() {
    goaiShowConversation();
    if (!goaiIsOnline()) { goaiOpenFormDirect(); return; }
    const fields = document.querySelectorAll('#goai-msgs .goai-inline-form .f-name');
    if (fields.length) {
      const f = fields[fields.length - 1];
      f.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(() => f.focus({ preventScroll: true }), 350);
      return;
    }
    goaiOpenFormDirect();
  }

  function goaiSelect(text, isSuggestionChip = false) {
    if (goaiCheckSessionExpiry(true)) return;
    goaiShowConversation();
    localStorage.setItem('goai_chat_open', 'true');

    if (text === 'FORM_DIRECT' || text.includes("Đăng ký chuyên gia tư vấn") || text.includes("Đăng ký tư vấn")) {
      goaiOpenFormDirect();
      return;
    }

    if (!goaiIsFormSubmitted()) {
      if (faqCount >= MAX_FAQ_QUESTIONS && goaiIsOnline()) {
        goaiAddMsgAndSave('user', text);
        const typingId = "typing-" + Date.now();
        renderMessageToDOM('bot', '<div class="goai-typing"><div class="goai-dot"></div><div class="goai-dot"></div><div class="goai-dot"></div></div>', "", typingId);

        setTimeout(() => {
          if (document.getElementById(typingId)) document.getElementById(typingId).remove();
          goaiAddMsgAndSave(
            'bot',
            'Anh/chị đã sử dụng hết 3 lượt hỏi câu hỏi mẫu nhanh. Để chuyên gia Go AI chuẩn bị giải pháp chuyên sâu và mở khóa bộ não AI suy luận trực tiếp, vui lòng để lại thông tin bên dưới:',
            getFormHTML()
          );
          goaiSyncInputState();
        }, 1000);
        return;
      }

      const online = goaiIsOnline();
      if (online) { // ngoài giờ: FAQ tĩnh không tính lượt
        faqCount++;
        localStorage.setItem('goai_faq_count', faqCount);
      }
      goaiSyncInputState();
      goaiSendFAQ(text, online);
    } else {
      if (isSuggestionChip) {
        goaiSendFAQ(text, false);
      } else {
        goaiSend(text);
      }
    }
  }

  function goaiSendFAQ(text, counted = false) {
    goaiAddMsgAndSave('user', text);
    const typingId = "typing-" + Date.now();
    renderMessageToDOM('bot', '<div class="goai-typing"><div class="goai-dot"></div><div class="goai-dot"></div><div class="goai-dot"></div></div>', "", typingId);

    const startTime = Date.now();

    fetch(GOAI_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goai-secret': GOAI_SECRET_TOKEN
      },
      body: JSON.stringify({
        secret: GOAI_SECRET_TOKEN,
        action: 'faq',
        asked: goaiAskedList(),
        message: text,
        sessionId: goaiSid
      })
    }).then(async res => {
      let data = null;
      try { data = await res.json(); } catch (_) { data = null; }
      if (!res.ok || !data) throw new Error('HTTP ' + res.status);
      const elapsed = Date.now() - startTime;
      const delayRemaining = Math.max(0, 1200 - elapsed);

      setTimeout(() => {
        if (document.getElementById(typingId)) document.getElementById(typingId).remove();

        let botReply = data.reply || "Xin lỗi, nội dung đang được cập nhật.";
        let dynamicSuggestions = data.suggestions || parseSuggestions(botReply);
        botReply = stripSuggestionTag(botReply);

        let extraHTML = "";
        if (!goaiIsFormSubmitted() && faqCount >= MAX_FAQ_QUESTIONS && goaiIsOnline()) {
          extraHTML = '<div class="goai-suggestion-chips"><button type="button" onclick="window.goaiOpenFormDirect()">👉 Đăng ký chuyên gia tư vấn (Mở khóa AI)</button></div>';
        } else if (dynamicSuggestions && dynamicSuggestions.length > 0) {
          extraHTML = renderSuggestionChips(dynamicSuggestions, 3);
        }

        goaiAddMsgAndSave('bot', botReply.trim(), extraHTML);
        goaiSyncInputState();
      }, delayRemaining);
    }).catch(() => {
      const elapsed = Date.now() - startTime;
      const delayRemaining = Math.max(0, 1200 - elapsed);
      setTimeout(() => {
        if (document.getElementById(typingId)) document.getElementById(typingId).remove();
        if (counted && faqCount > 0) { faqCount--; localStorage.setItem('goai_faq_count', faqCount); }
        goaiAddMsgAndSave('bot', "Đã xảy ra lỗi kết nối. Lượt hỏi của bạn chưa bị trừ, vui lòng thử lại.");
        goaiSyncInputState();
      }, delayRemaining);
    });
  }

  function goaiSubmitLeadForm(btnElement) {
    const formDiv = btnElement.closest('.goai-inline-form') || btnElement.parentElement;
    const errorMsgDiv = formDiv.querySelector('.goai-error-msg');

    if (formDiv.querySelector('.f-honeypot') && formDiv.querySelector('.f-honeypot').value) return;

    if (!goaiIsOnline()) {
      errorMsgDiv.innerText = 'Ngoài giờ hoạt động (07:00 – 24:00). Vui lòng quay lại từ 07:00 để mở khóa AI suy luận.';
      errorMsgDiv.style.display = 'block';
      return;
    }

    if (goaiIsFormSubmitted()) {
      errorMsgDiv.innerText = "Anh/chị đã gửi thông tin. AI Suy Luận đã được mở khóa!";
      errorMsgDiv.style.display = 'block';
      return;
    }

    const inputs = formDiv.querySelectorAll('input:not(.f-honeypot), select');
    inputs.forEach(el => el.classList.remove('error-input'));
    errorMsgDiv.style.display = 'none';

    const name = formDiv.querySelector('.f-name').value.trim();
    const phoneRaw = formDiv.querySelector('.f-phone').value;
    const emailRaw = formDiv.querySelector('.f-email').value;
    const company = formDiv.querySelector('.f-company').value.trim();
    const title = formDiv.querySelector('.f-title').value.trim();
    const industry = formDiv.querySelector('.f-industry').value.trim();
    const size = formDiv.querySelector('.f-size').value;
    const province = formDiv.querySelector('.f-province').value;
    const needs = formDiv.querySelector('.f-needs').value;
    const note = formDiv.querySelector('.f-note').value.trim();

    if (!name || !phoneRaw.trim() || !emailRaw.trim() || !company || !title || !industry || !size || !province || !needs) {
      inputs.forEach(el => { if (!el.value.trim()) el.classList.add('error-input'); });
      errorMsgDiv.innerText = "Vui lòng điền đầy đủ các thông tin bắt buộc (*).";
      errorMsgDiv.style.display = 'block';
      const firstErr = formDiv.querySelector('.error-input');
      if (firstErr) firstErr.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    let cleanPhone = phoneRaw.replace(/\D/g, '');
    if (cleanPhone.length < 9 || cleanPhone.length > 11) {
      formDiv.querySelector('.f-phone').classList.add('error-input');
      errorMsgDiv.innerText = "Số điện thoại phải là chữ số (nhập từ 9 đến 11 số).";
      errorMsgDiv.style.display = 'block';
      return;
    }

    let cleanEmail = emailRaw.replace(/[^\x21-\x7E]/g, '').toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.') || cleanEmail.indexOf('@') >= cleanEmail.lastIndexOf('.')) {
      formDiv.querySelector('.f-email').classList.add('error-input');
      errorMsgDiv.innerText = "Email không hợp lệ (Vui lòng điền đúng định dạng có ký tự @).";
      errorMsgDiv.style.display = 'block';
      return;
    }

    btnElement.innerText = "Đang gửi dữ liệu...";
    btnElement.disabled = true;

    const payloadData = {
      secret: GOAI_SECRET_TOKEN,
      action: 'submit_lead',
      sessionId: goaiSid,
      pageUrl: location.href,
      lead_data: { name, phone: cleanPhone, email: cleanEmail, company, title, industry, size, province, needs, note }
    };

    fetch(GOAI_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goai-secret': GOAI_SECRET_TOKEN
      },
      body: JSON.stringify(payloadData)
    }).then(async res => {
      const data = await res.json();
      if (!res.ok && data.reply) throw new Error(data.reply);
      return data;
    }).then(data => {
      localStorage.setItem('goai_lead_submitted', 'true');
      localStorage.setItem('goai_ai_count', '0');
      localStorage.setItem('goai_session_ts', String(Date.now()));
      aiCount = 0;

      goaiAddMsgAndSave('user', "Tôi đã điền form đăng ký tư vấn.");
      formDiv.innerHTML = "<p style='color:#059669; font-weight:600; text-align:center; margin:10px 0;'>✔️ Gửi thành công! Đã kích hoạt quyền hỏi AI suy luận (5 lượt).</p>";
      if (chatHistory.length >= 2) {
        chatHistory[chatHistory.length - 2].customHTML = formDiv.innerHTML;
        localStorage.setItem('goai_chat_history_v2', JSON.stringify(chatHistory));
      }

      let rawReply = data.reply || "Cảm ơn anh/chị. Đã mở khóa AI Suy Luận! Anh/chị có tối đa 5 câu hỏi phân tích chuyên sâu.";
      let welcomeSuggs = data.suggestions || parseSuggestions(rawReply) || [
        "Doanh nghiệp của bạn đang ở đâu?",
        "AI First Business là gì?",
        "Bảo mật dữ liệu doanh nghiệp là gì?",
        "Bảo mật lấy dữ liệu làm trung tâm – DCS là gì?"
      ];
      let cleanReply = stripSuggestionTag(rawReply);
      let chipsHTML = renderSuggestionChips(welcomeSuggs, 4);

      goaiAddMsgAndSave('bot', cleanReply, chipsHTML);

      goaiSyncInputState();
      goaiScrollBottom();
      const inp = document.getElementById('goai-inp');
      if (inp) inp.focus();
    }).catch(e => {
      btnElement.innerText = "Gửi yêu cầu & Mở khóa AI";
      btnElement.disabled = false;
      errorMsgDiv.innerText = (e.message.startsWith('HTTP') || e.message.includes('fetch')) ? 'Lỗi kết nối máy chủ. Vui lòng thử lại.' : e.message;
      errorMsgDiv.style.display = 'block';
    });
  }

  async function goaiSend(textOverride) {
    if (goaiCheckSessionExpiry(true)) return;
    if (!goaiIsOnline()) { goaiToast(GOAI_OFFLINE_SHORT); return; }
    const inp = document.getElementById('goai-inp');
    const text = String(textOverride !== undefined ? textOverride : (inp ? inp.value : '')).trim();
    if (!text) return;

    if (!goaiIsFormSubmitted()) {
      goaiOpenFormDirect();
      return;
    }

    if (aiCount >= MAX_AI_QUESTIONS) {
      goaiSyncInputState();
      goaiAddMsgAndSave('bot', '🔒 Anh/chị đã sử dụng hết 5 lượt hỏi suy luận chuyên sâu của AI. Chuyên gia Go AI sẽ liên hệ hỗ trợ trực tiếp theo thông tin đã đăng ký. Xin cảm ơn!');
      return;
    }

    const now = Date.now();
    if (now - lastMessageTime < 2000) return;
    lastMessageTime = now;

    if (inp) inp.value = '';
    goaiAddMsgAndSave('user', text);

    const typingId = "typing-" + Date.now();
    const typingHTML = '<div class="goai-typing"><div class="goai-dot"></div><div class="goai-dot"></div><div class="goai-dot"></div></div>';
    renderMessageToDOM('bot', typingHTML, "", typingId);

    try {
      const res = await fetch(GOAI_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goai-secret': GOAI_SECRET_TOKEN
        },
        body: JSON.stringify({
          secret: GOAI_SECRET_TOKEN,
          action: 'chat',
          asked: goaiAskedList(),
          message: text,
          sessionId: goaiSid,
          pageUrl: location.href
        })
      });

      if (document.getElementById(typingId)) document.getElementById(typingId).remove();

      const data = await res.json();
      if (!res.ok && data.reply) throw new Error(data.reply);

      if (data.counted === true) {
        aiCount = (typeof data.used === 'number') ? data.used : aiCount + 1;
        localStorage.setItem('goai_ai_count', aiCount);
      } else if (data.counted === undefined && !data.offTopic) {
        aiCount++;
        localStorage.setItem('goai_ai_count', aiCount);
      }
      goaiSyncInputState();

      let botReply = data.reply || 'Xin lỗi, tôi chưa tìm thấy dữ liệu phù hợp trong tài liệu.';
      let extraHTML = "";
      let dynamicSuggestions = data.suggestions || parseSuggestions(botReply);
      botReply = stripSuggestionTag(botReply);

      if (dynamicSuggestions && dynamicSuggestions.length > 0 && aiCount < MAX_AI_QUESTIONS) {
        extraHTML = renderSuggestionChips(dynamicSuggestions, 3);
      }

      if (aiCount >= MAX_AI_QUESTIONS || data.limitReached || botReply.includes("hết **5 lượt**")) {
        aiCount = MAX_AI_QUESTIONS;
        localStorage.setItem('goai_ai_count', aiCount);
        goaiSyncInputState();
      }

      goaiAddMsgAndSave('bot', botReply.trim(), extraHTML);
    } catch (e) {
      if (document.getElementById(typingId)) document.getElementById(typingId).remove();
      let errorMsg = (e instanceof TypeError || e.name === 'SyntaxError' || e.message.startsWith('HTTP') || e.message.includes('fetch')) ? 'Đã xảy ra lỗi kết nối. Lượt hỏi của bạn chưa bị trừ.' : e.message;
      goaiAddMsgAndSave('bot', errorMsg);
    }
  }

  function goaiAddMsgAndSave(role, text, customHTML = "") {
    let cleanText = text || "";
    if (role === 'bot' && cleanText.includes('[SUGGESTIONS:')) {
      const s = parseSuggestions(cleanText);
      cleanText = stripSuggestionTag(cleanText);
      if (s && !customHTML) customHTML = renderSuggestionChips(s, 4);
    }
    chatHistory.push({ role, text: cleanText, customHTML });
    localStorage.setItem('goai_chat_history_v2', JSON.stringify(chatHistory));
    renderMessageToDOM(role, cleanText, customHTML);
  }

  function renderMessageToDOM(role, text, customHTML = "", id = "") {
    const container = document.getElementById('goai-msgs');
    if (!container) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'goai-msg-wrapper ' + role;
    if (id) wrapper.id = id;

    if (role === 'bot') {
      const avatar = document.createElement('img');
      avatar.src = LOGO_URL;
      avatar.alt = 'Go AI';
      avatar.className = 'goai-bot-avatar';
      avatar.onerror = function () { this.onerror = null; this.src = FALLBACK_AVATAR; };
      wrapper.appendChild(avatar);
    }

    const msgDiv = document.createElement('div');
    msgDiv.className = 'goai-msg ' + role;

    if (text.includes('goai-dot')) {
      msgDiv.innerHTML = text;
    } else if (role === 'user') {
      msgDiv.innerHTML = goaiEsc(text).replace(/\n/g, "<br>");
    } else {
      msgDiv.innerHTML = goaiEsc(String(text).replace(/\n{3,}/g, '\n\n')).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    }

    if (customHTML) msgDiv.innerHTML += customHTML;

    wrapper.appendChild(msgDiv);
    container.appendChild(wrapper);
    goaiScrollBottom();
  }

  function goaiInit() {
    ensureStyle();
    ensureChatDOM();
    goaiCheckSessionExpiry(false);

    // Gắn sự kiện click trực tiếp cho nút mở Chatbot và các nút chức năng
    const chatBtn = document.getElementById('goai-chat-btn');
    if (chatBtn) {
      chatBtn.onclick = goaiToggle;
    }
    const closeBtn = document.getElementById('goai-close-btn');
    if (closeBtn) closeBtn.onclick = goaiToggle;

    const resetBtn = document.getElementById('goai-reset-btn');
    if (resetBtn) resetBtn.onclick = goaiResetChat;

    const cancelBtn = document.getElementById('goai-cf-cancel-btn');
    if (cancelBtn) cancelBtn.onclick = goaiCloseConfirm;

    const okBtn = document.getElementById('goai-cf-ok-btn');
    if (okBtn) okBtn.onclick = goaiConfirmReset;

    const scrollDownBtn = document.getElementById('goai-scroll-down');
    if (scrollDownBtn) scrollDownBtn.onclick = goaiScrollBottom;

    const inputArea = document.getElementById('goai-input-area');
    if (inputArea) inputArea.onclick = goaiLockedHint;

    const sendBtn = document.getElementById('goai-send-btn');
    if (sendBtn) sendBtn.onclick = (e) => {
      if (!goaiIsOnline()) {
        e.stopPropagation();
        goaiToast(GOAI_OFFLINE_SHORT);
        return;
      }
      if (!goaiIsFormSubmitted()) {
        e.stopPropagation();
        goaiFocusLeadForm();
        return;
      }
      goaiSend();
    };

    const inpEl = document.getElementById('goai-inp');
    if (inpEl) {
      inpEl.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          goaiSend();
        }
      };
      inpEl.addEventListener('focus', () => setTimeout(goaiScrollBottom, 300));
    }

    // Gắn sự kiện cho các nút gợi ý màn hình đầu
    document.querySelectorAll('#goai-options .goai-opt').forEach(btn => {
      if (!btn.getAttribute('onclick')) {
        btn.onclick = () => {
          const val = btn.getAttribute('data-opt') || btn.textContent.replace('↗', '').trim();
          goaiSelect(val);
        };
      }
    });

    if (localStorage.getItem('goai_chat_open') === 'true') goaiSetOpen(true, false);

    if (chatHistory.length > 0) {
      goaiShowConversation();
      chatHistory.forEach(msg => {
        let cleanText = msg.text || '';
        let customHTML = msg.customHTML || '';
        if (msg.role === 'bot' && cleanText.includes('[SUGGESTIONS:')) {
          const suggs = parseSuggestions(cleanText);
          cleanText = stripSuggestionTag(cleanText);
          if (suggs && !customHTML) customHTML = renderSuggestionChips(suggs, 4);
        }
        renderMessageToDOM(msg.role, cleanText, customHTML);
      });
    }
    goaiSyncInputState();

    window.addEventListener('resize', goaiScrollBottom);

    goaiSyncOnlineState();
    setInterval(goaiSyncOnlineState, 30000);

    const msgs = document.getElementById('goai-msgs');
    const down = document.getElementById('goai-scroll-down');
    if (msgs && down) {
      msgs.addEventListener('scroll', () => {
        const far = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight > 120;
        down.classList.toggle('show', far);
      }, { passive: true });
    }

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const cf = document.getElementById('goai-confirm');
      if (cf && cf.classList.contains('show')) { goaiCloseConfirm(); return; }
      const box = document.getElementById('goai-chat-box');
      if (box && box.style.display === 'flex') goaiToggle();
    });
  }

  // Xuất các hàm ra window để tương thích với cả thuộc tính onclick trong HTML
  window.goaiToggle = goaiToggle;
  window.goaiResetChat = goaiResetChat;
  window.goaiCloseConfirm = goaiCloseConfirm;
  window.goaiConfirmReset = goaiConfirmReset;
  window.goaiSelect = goaiSelect;
  window.goaiSend = goaiSend;
  window.goaiOpenFormDirect = goaiOpenFormDirect;
  window.goaiFocusLeadForm = goaiFocusLeadForm;
  window.goaiSubmitLeadForm = goaiSubmitLeadForm;
  window.goaiScrollBottom = goaiScrollBottom;
  window.goaiLockedHint = goaiLockedHint;
  window.goaiHideTeaser = goaiHideTeaser;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', goaiInit);
  } else {
    goaiInit();
  }
})();