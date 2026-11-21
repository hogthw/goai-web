import { normalizePhone, validPhone, validCompanyEmail, validateLead } from './validation.js?v=32';
// Chuẩn hóa khóa tra cứu (khoảng trắng, nbsp, Unicode) + gộp bản dịch bổ sung.
const normKey = s => String(s).replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim().normalize('NFC');
const translations = { en:{}, zh:{} };
// v2.5.6: từ điển EN/中文 (~260 KB) chỉ tải khi khách chuyển sang ngôn ngữ đó → khách xem tiếng Việt không phải tải.
let dictionaryPromise = null;
function loadDictionaries() {
  dictionaryPromise ||= Promise.all([import('./i18n.js?v=32'), import('./i18n-extra.js?v=32')]).then(([base, extra]) => {
    for (const lang of ['en','zh']) for (const [k,v] of Object.entries(base.translations[lang])) translations[lang][normKey(k)] = v;
    for (const [vi,en,zh] of extra.extraRows) { translations.en[normKey(vi)] = en; translations.zh[normKey(vi)] = zh; }
  }).catch(error => { dictionaryPromise = null; throw error; });
  return dictionaryPromise;
}

// Chỉ nhận URL cùng nguồn (chống chuyển hướng mở / javascript: nếu phản hồi bị can thiệp).
function sameOriginUrl(value) {
  try { const u = new URL(String(value), location.href); return (u.protocol === 'https:' || u.protocol === 'http:') && u.origin === location.origin ? u.href : ''; } catch (e) { return ''; }
}
// Đặt nội dung có định dạng tối giản từ thuộc tính data-*: chỉ giữ chữ, <br>, <b>, <strong>, <em>; loại bỏ mọi thẻ/thuộc tính khác.
const RICH_TAGS = new Set(['BR','B','STRONG','EM']);
function setRichText(element, html) {
  const doc = new DOMParser().parseFromString('<body>' + String(html) + '</body>', 'text/html');
  const out = document.createDocumentFragment();
  const walk = (from, to) => from.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) { to.appendChild(document.createTextNode(node.nodeValue)); return; }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (!RICH_TAGS.has(node.tagName)) { walk(node, to); return; } /* thẻ lạ: bỏ thẻ, giữ chữ bên trong */
    const clean = document.createElement(node.tagName.toLowerCase());
    walk(node, clean); to.appendChild(clean);
  });
  walk(doc.body, out);
  element.replaceChildren(out);
}

const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#nav-links');
menu?.addEventListener('click', () => {
  if (!nav) return;
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded',String(open)); nav.classList.toggle('open',open);
});
nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  if (!menu || !nav) return;
  nav.classList.remove('open');
  menu.setAttribute('aria-expanded','false');
}));

// ===== Chuyển ngôn ngữ Việt / Anh / Hoa (tiếng Việt là mặc định) =====
// v2.4: nhớ ngôn ngữ giữa các trang, dịch cả <title>, meta, thuộc tính, thông báo động và báo thiếu bản dịch.
const LANGS = ['vi','en','zh'];
const langKey = 'goai_lang';
const languageButtons = [...document.querySelectorAll('[data-lang-option]')];
const ogLocales = { vi:'vi_VN', en:'en_US', zh:'zh_CN' };
function readStoredLang() {
  try { const v = localStorage.getItem(langKey); if (LANGS.includes(v)) return v; } catch (e) { /* bỏ qua */ }
  const m = document.cookie.match(/(?:^|;\s*)goai_lang=(vi|en|zh)/);
  return m ? m[1] : null;
}
function storeLang(lang) {
  try { localStorage.setItem(langKey, lang); } catch (e) { /* bỏ qua */ }
  try { document.cookie = 'goai_lang=' + lang + ';path=/;max-age=31536000;SameSite=Lax' + (location.protocol === 'https:' ? ';Secure' : ''); } catch (e) { /* bỏ qua */ }
}
let currentLanguage = 'vi';
const originalDocumentTitle = document.title;
const translate = (text, language = currentLanguage) => {
  if (language === 'vi') return text;
  const key = normKey(text);
  return translations[language]?.[key] || text;
};
// Tiêu đề / mô tả: thử cả chuỗi, sau đó từng đoạn ngăn cách bởi " — ".
const translateSentence = (text, language) => {
  if (language === 'vi') return text;
  const whole = translations[language]?.[normKey(text)];
  if (whole) return whole;
  return text.split(' — ').map(part => translate(part, language)).join(' — ');
};
const translatedTextNodes = [];
const registeredTextNodes = new WeakSet();
const VN_CHARS = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
window.GOAI_I18N_MISSING = window.GOAI_I18N_MISSING || [];
function registerTextNode(node) {
  if (registeredTextNodes.has(node)) return;
  const parent = node.parentElement;
  if (!parent || parent.closest('script,style,noscript,[data-vi][data-en]')) return;
  const original = normKey(node.nodeValue);
  if (!original) return;
  if (!translations.en[original] && !translations.zh[original]) {
    // Ghi lại chuỗi tiếng Việt chưa có bản dịch để dễ rà soát (xem console khi thêm ?i18n-debug vào URL).
    if (VN_CHARS.test(original) && !window.GOAI_I18N_MISSING.includes(original)) window.GOAI_I18N_MISSING.push(original);
    return;
  }
  const record = { node, original, leading: node.nodeValue.match(/^\s*/)?.[0] || '', trailing: node.nodeValue.match(/\s*$/)?.[0] || '' };
  registeredTextNodes.add(node);
  translatedTextNodes.push(record);
  if (currentLanguage !== 'vi') node.nodeValue = record.leading + translate(original) + record.trailing;
}
const attrNames = ['placeholder','title','aria-label','alt'];
const translatedAttributes = [];
const registeredAttributes = new WeakSet();
function registerAttributes(root) {
  const list = root.nodeType === Node.ELEMENT_NODE ? [root, ...root.querySelectorAll('[placeholder],[title],[aria-label],[alt]')] : [];
  list.forEach(element => attrNames.forEach(name => {
    if (!element.hasAttribute(name)) return;
    const mark = element.getAttribute(name);
    const original = normKey(mark);
    if (!original || registeredAttributes.has(element) && element.__goaiAttrs?.has(name)) return;
    (element.__goaiAttrs ||= new Set()).add(name);
    registeredAttributes.add(element);
    translatedAttributes.push({ element, name, original });
    if (currentLanguage !== 'vi') element.setAttribute(name, translate(original));
  }));
}
// <title> và các thẻ meta hiển thị khi chia sẻ / tìm kiếm.
const metaTargets = [...document.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"]')]
  .map(element => ({ element, original: element.getAttribute('content') || '' }));
const ogLocaleMeta = document.querySelector('meta[property="og:locale"]');
// Thông báo động (trạng thái biểu mẫu...) được ghi nhớ khóa tiếng Việt để dịch lại khi đổi ngôn ngữ.
function say(element, viText) {
  if (!element) return;
  element.dataset.i18nKey = viText;
  element.textContent = translate(viText);
}
let languageRequest = 0;
async function setLanguage(language, options = {}) {
  const lang = LANGS.includes(language) ? language : 'vi';
  const request = ++languageRequest;
  if (lang !== 'vi') {
    try { await loadDictionaries(); } catch (error) { console.warn('[GoAI] không tải được bản dịch:', error); return; }
    if (request !== languageRequest) return; /* khách đã bấm ngôn ngữ khác trong lúc tải */
    registerDocument();
  }
  currentLanguage = lang;
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
  document.querySelectorAll('[data-vi][data-en]').forEach(element => {
    setRichText(element, element.dataset[lang] || translate(element.dataset.vi, lang) || element.dataset.vi);
  });
  translatedTextNodes.forEach(({node,original,leading,trailing}) => { if (node.isConnected) node.nodeValue = leading + translate(original,lang) + trailing; });
  translatedAttributes.forEach(({element,name,original}) => { if (element.isConnected) element.setAttribute(name,translate(original,lang)); });
  document.querySelectorAll('[data-i18n-key]').forEach(element => { element.textContent = translate(element.dataset.i18nKey, lang); });
  document.title = translateSentence(originalDocumentTitle, lang);
  metaTargets.forEach(({element,original}) => element.setAttribute('content', translateSentence(original, lang)));
  ogLocaleMeta?.setAttribute('content', ogLocales[lang]);
  // Thông báo kiểm tra hợp lệ cũ (đã dịch theo ngôn ngữ trước) được xóa để tính lại theo ngôn ngữ mới.
  document.querySelectorAll('input,select,textarea').forEach(field => { try { field.setCustomValidity(''); } catch (e) { /* bỏ qua */ } });
  languageButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.langOption === lang)));
  if (!options.silent) storeLang(lang);
  try {
    const next = new URL(location.href);
    if (lang === 'vi') next.searchParams.delete('lang'); else next.searchParams.set('lang',lang);
    history.replaceState({},'',next);
  } catch (e) { /* bỏ qua */ }
}
languageButtons.forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.langOption)));
{
  const fromUrl = new URLSearchParams(location.search).get('lang');
  setLanguage(LANGS.includes(fromUrl) ? fromUrl : (readStoredLang() || 'vi'), { silent: !LANGS.includes(fromUrl) });
}
// Khi trình duyệt chặn localStorage/cookie, giữ ngôn ngữ bằng tham số ?lang ở các liên kết nội bộ.
document.addEventListener('click', event => {
  const link = event.target.closest?.('a[href]');
  if (!link || currentLanguage === 'vi') return;
  try {
    const url = new URL(link.getAttribute('href'), location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash && !url.search) return;
    if (/\.(pdf|zip|png|jpe?g|webp|svg|docx?|xlsx?)$/i.test(url.pathname)) return;
    url.searchParams.set('lang', currentLanguage);
    link.setAttribute('href', url.pathname + url.search + url.hash);
  } catch (e) { /* bỏ qua */ }
}, true);

// Ghi nhận nội dung có sẵn và nội dung tạo sau khi trang tải để giữ đúng ngôn ngữ đã chọn (chỉ chạy khi đã có từ điển).
const domObserver = new MutationObserver(mutations => mutations.forEach(mutation => mutation.addedNodes.forEach(added => {
  if (added.nodeType === Node.TEXT_NODE) return registerTextNode(added);
  if (added.nodeType !== Node.ELEMENT_NODE) return;
  const dynamicWalker = document.createTreeWalker(added, NodeFilter.SHOW_TEXT);
  while (dynamicWalker.nextNode()) registerTextNode(dynamicWalker.currentNode);
  registerAttributes(added);
})));
let documentRegistered = false;
function registerDocument() {
  if (documentRegistered) return;
  documentRegistered = true;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) registerTextNode(walker.currentNode);
  registerAttributes(document.body);
  domObserver.observe(document.body, { childList: true, subtree: true });
  if (/[?&]i18n-debug\b/.test(location.search)) console.warn('[i18n] Chuỗi chưa có bản dịch:', window.GOAI_I18N_MISSING);
}

// Đồng ý cookie: không bật tùy chọn trước khi có lựa chọn chủ động.
const cookiePanel = document.querySelector('#cookie-consent');
const cookieKey = 'goai_cookie_consent_v1';
// Một số trình duyệt in-app / chế độ riêng tư chặn localStorage: luôn bọc try/catch để trang không bị lỗi.
function readConsent() { try { return localStorage.getItem(cookieKey); } catch (e) { return null; } }
function saveConsent(choice) { try { localStorage.setItem(cookieKey, choice); } catch (e) { /* bỏ qua */ } }
function openCookiePanel() {
  if (!cookiePanel) return;
  cookiePanel.hidden = false;
  document.body.classList.add('cookie-choice-open');
  // Đưa tiêu điểm vào khung thông báo (không vào nút) để trình đọc màn hình đọc nội dung mà không hiện viền focus khi mở trang.
  cookiePanel.setAttribute('tabindex','-1');
  cookiePanel.focus({preventScroll:true});
}
function closeCookiePanel(choice) {
  saveConsent(choice);
  if (cookiePanel) cookiePanel.hidden = true;
  document.body.classList.remove('cookie-choice-open');
  document.dispatchEvent(new CustomEvent('goai:cookie-consent',{detail:{choice}}));
}
if (cookiePanel && !readConsent()) openCookiePanel();
document.querySelectorAll('[data-cookie-choice]').forEach(button => button.addEventListener('click', () => closeCookiePanel(button.dataset.cookieChoice)));
document.querySelectorAll('[data-cookie-settings]').forEach(button => button.addEventListener('click', openCookiePanel));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && nav?.classList.contains('open')) {
    /* FIXED: menu có thể là null nếu .menu-toggle không tồn tại trong DOM → dùng optional chaining */
    nav.classList.remove('open'); menu?.setAttribute('aria-expanded','false'); menu?.focus();
  }
});

/* ------------------------------------------------------------------
 * v1.1.0 — Gửi biểu mẫu → Google Apps Script → Google Sheet (+ email báo).
 *  - Địa chỉ Web App + khóa nằm trong /form-config.js (window.GOAI_FORM), sửa bằng Notepad.
 *  - Gửi fetch POST text/plain + JSON (không cần preflight CORS), đọc { ok, code, field, message }.
 *  - Nút Gửi xám cho tới khi đủ ô bắt buộc + ô đồng ý; lỗi hiện ngay dưới từng ô.
 *  - Khi khách tắt JavaScript: form gửi thường tới /gui-form/ → _redirects (307) → Apps Script.
 *  - Chưa điền URL: biểu mẫu tư vấn báo liên hệ Zalo/điện thoại; cổng khảo sát vẫn chuyển tới khảo sát.
 * ------------------------------------------------------------------ */
class LeadError extends Error {
  constructor(vi, status, field, code) { super(vi); this.vi = vi; this.status = status || 0; this.field = field || ''; this.code = code || ''; }
}
const SURVEY_PATHS = { 'ear': '/ai-readiness/ear/start/', 'den-tin-hieu': '/khao-sat-san-sang-tu-dong-hoa/' };
const WEBAPP_URL_RE = /^https:\/\/script\.google\.com\/(?:a\/macros\/[A-Za-z0-9.\-]+|macros)\/s\/[A-Za-z0-9_\-]+\/exec$/;
function formConfig() {
  const cfg = window.GOAI_FORM || {};
  const url = String(cfg.url || '').trim();
  return { url: WEBAPP_URL_RE.test(url) ? url : '', secret: String(cfg.secret || '').trim() };
}
const NOT_READY_MSG = 'Website hiện chưa nhận yêu cầu qua biểu mẫu. Vui lòng liên hệ trực tiếp qua Zalo hoặc điện thoại (nút ở góc phải màn hình).';
async function submitLead(payload) {
  const cfg = formConfig();
  if (!cfg.url) {
    if (payload && payload.type === 'khao-sat' && SURVEY_PATHS[payload.survey]) return { ok: true, redirect: SURVEY_PATHS[payload.survey] };
    throw new LeadError(NOT_READY_MSG, 0, '', 'not_configured');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  let res;
  try {
    res = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...payload, secret: cfg.secret }),
      credentials: 'omit', cache: 'no-store', redirect: 'follow', signal: controller.signal
    });
  } catch (error) {
    throw new LeadError('Không kết nối được tới hệ thống. Vui lòng kiểm tra mạng rồi thử lại; nội dung bạn nhập vẫn được giữ.', 0, '', 'network');
  } finally { clearTimeout(timer); }
  let data = null;
  try { data = await res.json(); } catch (error) { data = null; }
  if (!data || typeof data !== 'object') throw new LeadError('Chưa nhận được phản hồi hợp lệ từ hệ thống. Vui lòng thử lại sau ít phút.', res.status, '', 'bad_response');
  if (!data.ok) throw new LeadError(String(data.message || 'Chưa gửi được thông tin. Vui lòng thử lại.'), res.status, String(data.field || ''), String(data.code || ''));
  return data;
}

/* Kiểm tra từng ô phía trình duyệt (Apps Script kiểm tra lại toàn bộ). */
const FIELD_RULES = {
  name: v => !v.trim() ? 'Vui lòng nhập họ và tên.' : v.trim().length > 150 ? 'Họ và tên tối đa 150 ký tự.' : '',
  company: v => !v.trim() ? 'Vui lòng nhập tên công ty.' : v.trim().length > 150 ? 'Tên công ty tối đa 150 ký tự.' : '',
  email: v => {
    const s = v.trim();
    if (!s) return 'Vui lòng nhập email công ty.';
    if (s.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return 'Email chưa đúng định dạng.';
    return validCompanyEmail(s) ? '' : 'Vui lòng dùng email theo tên miền công ty (không dùng Gmail, Yahoo, Outlook…).';
  },
  phone: v => !v.trim() ? 'Vui lòng nhập số điện thoại.' : validPhone(v) ? '' : 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0. Ví dụ: 0912345678.',
  position: v => v.trim().length > 150 ? 'Chức vụ tối đa 150 ký tự.' : '',
  need: v => v ? '' : 'Vui lòng chọn nhu cầu chính.',
  survey: v => v ? '' : 'Vui lòng chọn khảo sát.',
  message: v => v.length > 4000 ? 'Nội dung tối đa 4000 ký tự.' : '',
  consent: (v, el) => el.checked ? '' : 'Vui lòng đánh dấu đồng ý xử lý dữ liệu để gửi.'
};

function setupLeadForm(formEl, opts) {
  formEl.noValidate = true; // tự hiện lỗi tiếng Việt thay cho bong bóng của trình duyệt
  const cfg = formConfig();
  if (cfg.url) formEl.action = cfg.url;
  if (formEl.elements.secret) formEl.elements.secret.value = cfg.secret;
  if (formEl.elements.page) formEl.elements.page.value = location.pathname;
  const status = formEl.querySelector(opts.statusSelector);
  const button = formEl.querySelector('button[type="submit"]');
  const touched = new Set();
  const errorEls = {};

  // Ô báo lỗi đặt ngay dưới từng ô (ô đồng ý: ngay dưới dòng đồng ý).
  const fieldNames = ['name', 'company', 'email', 'phone', 'position', 'need', 'survey', 'message', 'consent'];
  for (const name of fieldNames) {
    const el = formEl.elements[name];
    if (!el || el.type === 'hidden') continue;
    const id = (formEl.id || 'form') + '-err-' + name;
    const err = document.createElement('small');
    err.className = 'field-error'; err.id = id; err.hidden = true; err.setAttribute('aria-live', 'polite');
    const host = name === 'consent' ? el.closest('label') : el;
    host.insertAdjacentElement('afterend', err);
    el.setAttribute('aria-describedby', [el.getAttribute('aria-describedby'), id].filter(Boolean).join(' '));
    errorEls[name] = err;
  }
  const hint = document.createElement('small');
  hint.className = 'submit-hint';
  button.insertAdjacentElement('afterend', hint);

  const isActive = name => {
    const el = formEl.elements[name];
    if (!el) return false;
    if (name === 'survey') return !el.disabled && !el.closest('[hidden]');
    return true;
  };
  const errorFor = name => {
    const el = formEl.elements[name];
    if (!el || !isActive(name)) return '';
    return FIELD_RULES[name](el.value || '', el);
  };
  const show = (name, message) => {
    const el = formEl.elements[name], err = errorEls[name];
    if (!el || !err) return;
    if (message) { say(err, message); err.hidden = false; el.setAttribute('aria-invalid', 'true'); }
    else { err.textContent = ''; delete err.dataset.i18nKey; err.hidden = true; el.removeAttribute('aria-invalid'); }
  };
  let busy = false;
  const refresh = () => {
    let allOk = true;
    for (const name of Object.keys(errorEls)) {
      const msg = errorFor(name);
      if (msg) allOk = false;
      show(name, touched.has(name) ? msg : '');
    }
    button.disabled = busy || !allOk;
    button.setAttribute('aria-disabled', String(button.disabled));
    if (!busy && !allOk) say(hint, 'Điền đủ các ô có dấu * và đánh dấu đồng ý để bật nút gửi.');
    else { hint.textContent = ''; delete hint.dataset.i18nKey; }
    hint.hidden = busy || allOk;
    return allOk;
  };
  const touch = name => { if (errorEls[name]) touched.add(name); };
  formEl.addEventListener('input', e => { if (e.target.name && (touched.has(e.target.name) || e.target.type === 'checkbox')) touch(e.target.name); refresh(); });
  formEl.addEventListener('change', e => { touch(e.target.name); refresh(); });
  formEl.addEventListener('focusout', e => {
    const el = e.target;
    if (!el.name || !errorEls[el.name]) return;
    if (el.name === 'phone' && el.value && validPhone(el.value)) el.value = normalizePhone(el.value);
    if (el.name === 'email') el.value = el.value.trim();
    if (el.value || el.type === 'checkbox' || el.tagName === 'SELECT') touch(el.name);
    refresh();
  });
  // Khách bấm Back: trang có thể được khôi phục từ bộ nhớ đệm với nút đang "Đang gửi…".
  window.addEventListener('pageshow', event => { if (event.persisted) { busy = false; refresh(); } });

  formEl.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const raw = Object.fromEntries(new FormData(formEl));
    if (raw.website && String(raw.website).trim() !== '') { // bẫy bot: giả vờ thành công, không gửi
      say(status, opts.successMessage); status.dataset.kind = 'success'; return;
    }
    Object.keys(errorEls).forEach(touch);
    if (!refresh()) {
      const first = Object.keys(errorEls).find(n => errorFor(n));
      if (first) formEl.elements[first].focus();
      return;
    }
    const type = opts.typeFor();
    const payload = { type, page: location.pathname, website: '' };
    for (const name of fieldNames) {
      const el = formEl.elements[name];
      if (!el || !isActive(name)) continue;
      payload[name] = name === 'consent' ? true : name === 'phone' ? normalizePhone(el.value) : String(el.value || '').trim();
    }
    if (formEl.elements.mode) payload.mode = formEl.elements.mode.value;
    busy = true; refresh(); formEl.setAttribute('aria-busy', 'true');
    status.dataset.kind = ''; say(status, opts.sendingMessage(type));
    try {
      const result = await submitLead(payload);
      if (type === 'khao-sat') {
        const redirectUrl = sameOriginUrl(result.redirect || SURVEY_PATHS[payload.survey]);
        if (!redirectUrl) throw new LeadError('Đã ghi nhận thông tin nhưng chưa mở được khảo sát. Vui lòng tải lại trang và thử lại.', 200);
        say(status, 'Đã ghi nhận. Đang chuyển tới khảo sát…'); status.dataset.kind = 'success';
        location.assign(redirectUrl);
        setTimeout(() => { busy = false; formEl.removeAttribute('aria-busy'); refresh(); }, 1500);
        return;
      }
      say(status, opts.successMessage); status.dataset.kind = 'success';
      formEl.reset(); touched.clear(); opts.afterReset?.();
    } catch (err) {
      const known = err instanceof LeadError;
      if (known && err.field && errorEls[err.field]) { touched.add(err.field); show(err.field, err.vi); formEl.elements[err.field].focus(); }
      say(status, known ? (err.field && errorEls[err.field] ? 'Vui lòng kiểm tra lại ô được đánh dấu.' : err.vi) : 'Chưa gửi được thông tin. Vui lòng thử lại; nội dung bạn nhập vẫn được giữ nguyên.');
      status.dataset.kind = 'error';
      busy = false; formEl.removeAttribute('aria-busy');
      refresh();
      if (known && err.field && errorEls[err.field]) show(err.field, err.vi); // giữ lỗi máy chủ cho tới khi khách sửa ô
      return;
    }
    busy = false; formEl.removeAttribute('aria-busy'); refresh();
  });
  refresh();
  return { refresh };
}

const form = document.querySelector('#contact-form');
if (form) {
  const params = new URLSearchParams(location.search);
  const choice = params.get('goi');
  if (['co-ban','cao-cap','doanh-nghiep'].includes(choice)) form.elements.need.value = choice;
  else if (params.get('nguon') === 'den-tin-hieu') form.elements.need.value = 'danh-gia-ai';
  setupLeadForm(form, {
    statusSelector: '#form-status',
    typeFor: () => 'lien-he',
    sendingMessage: () => 'Đang gửi yêu cầu…',
    successMessage: 'Cảm ơn bạn. Go AI đã nhận được yêu cầu tư vấn của bạn.'
  });
}

// Tab dùng chung (phòng ban, cấp độ Go AI, sách): chuột, cảm ứng, bàn phím; mỗi lúc chỉ mở một nội dung.
function setupTabs(selector, { vertical = false } = {}) {
  const tabs = [...document.querySelectorAll(selector + ' [role="tab"]')];
  const select = (tab, focus = false) => {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(item.getAttribute('aria-controls')); /* aria-controls trỏ ID không tồn tại thì bỏ qua */
      if (panel) panel.hidden = !selected;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      const forward = ['ArrowRight', ...(vertical ? ['ArrowDown'] : [])];
      const backward = ['ArrowLeft', ...(vertical ? ['ArrowUp'] : [])];
      let next;
      if (forward.includes(event.key)) next = (index + 1) % tabs.length;
      else if (backward.includes(event.key)) next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); select(tabs[next], true); }
    });
  });
}
setupTabs('.department-tabs');
setupTabs('.service-tabs', { vertical: true });

const nextStepForm = document.querySelector('#next-step-form');
if (nextStepForm) {
 const params = new URLSearchParams(location.search);
 /* Khảo sát mặc định: ưu tiên thuộc tính data-survey của trang (/ai-readiness/ear/, /ai-readiness/khao-sat-den-tin-hieu/), sau đó mới tới ?khao-sat= cũ */
 const selected = nextStepForm.dataset.survey || params.get('khao-sat');
 const surveyField = nextStepForm.querySelector('.survey-choice-field');
 const surveySelect = nextStepForm.elements.survey;
 const submitLabel = nextStepForm.querySelector('.next-step-submit-label');
 let controller = null;
 const setMode = mode => {
  const isSurvey = mode === 'survey';
  surveyField.hidden = !isSurvey;
  surveySelect.disabled = !isSurvey;
  surveySelect.required = isSurvey;
  if (isSurvey) nextStepForm.elements.need.value = 'danh-gia-ai';
  say(submitLabel, isSurvey ? 'Tiếp tục làm khảo sát' : 'Gửi yêu cầu tư vấn');
  controller?.refresh();
 };
 if (['ear','den-tin-hieu'].includes(selected)) {
  nextStepForm.elements.mode.value = 'survey';
  surveySelect.value = selected;
 }
 setMode(nextStepForm.elements.mode.value);
 [...nextStepForm.querySelectorAll('input[name="mode"]')].forEach(radio => radio.addEventListener('change', () => setMode(radio.value)));
 controller = setupLeadForm(nextStepForm, {
  statusSelector: '#next-step-status',
  typeFor: () => nextStepForm.elements.mode.value === 'survey' ? 'khao-sat' : 'tu-van',
  sendingMessage: type => type === 'khao-sat' ? 'Đang ghi nhận thông tin…' : 'Đang gửi yêu cầu…',
  successMessage: 'Cảm ơn bạn. Go AI đã nhận được yêu cầu tư vấn.',
  afterReset: () => {
   const mode = nextStepForm.elements.mode.value; // form.reset() trả về lựa chọn mặc định của trang
   if (mode === 'survey' && ['ear','den-tin-hieu'].includes(selected)) surveySelect.value = selected;
   setMode(mode);
  }
 });
}

// Lợi ích: mở bằng chuột, Enter/Space; Escape đóng và trả focus về nút.
document.querySelectorAll('[data-dialog]').forEach(button => {
 const dialog=document.getElementById(button.dataset.dialog);
 if(!dialog) return;
 button.addEventListener('click',()=>{ if(typeof dialog.showModal==='function') dialog.showModal(); else dialog.setAttribute('open',''); });
 /* Bấm vào backdrop → target là chính <dialog>; nhưng phần đệm bên trong hộp cũng có target là <dialog> nên phải kiểm tra thêm tọa độ. */
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog) return;
  const r=dialog.getBoundingClientRect();
  if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) dialog.close();
});
 dialog.addEventListener('close',()=>button.focus());
});

setupTabs('.books-tabs');

/* Tiêu đề đầu trang (.page-hero h1): máy tính / máy tính bảng ≥ 761px hiển thị trên MỘT dòng,
   cỡ chữ lớn nhất còn vừa khung. Nếu tiêu đề quá dài (chữ sẽ nhỏ hơn mức tối thiểu) thì tự xuống dòng.
   Điện thoại giữ nguyên cách hiển thị cũ. Tự tính lại khi đổi ngôn ngữ, đổi cỡ cửa sổ, tải xong phông chữ. */
(function fitHeroTitles(){
 const titles=[...document.querySelectorAll('.page-hero h1')];
 if(!titles.length) return;
 const rem=()=>parseFloat(getComputedStyle(document.documentElement).fontSize)||16;
 const MAX=3.25, MIN=1.6;           /* đơn vị rem */
 function fit(h){
  if(window.innerWidth<761){ h.style.fontSize=''; h.removeAttribute('data-fit'); return; }
  h.setAttribute('data-fit','one');
  const avail=h.clientWidth; if(!avail) return;
  let size=MAX*rem();
  h.style.fontSize=size+'px';
  for(let i=0;i<3 && h.scrollWidth>avail+0.5;i++){
   size=Math.floor(size*avail/h.scrollWidth*0.99*2)/2;
   h.style.fontSize=size+'px';
  }
  if(h.scrollWidth>avail+0.5 || size<MIN*rem()){ /* quá dài: dùng cỡ tối thiểu và cho phép xuống dòng */
   h.removeAttribute('data-fit'); h.style.fontSize=(MIN*rem())+'px';
  }
 }
 let raf=0;
 const run=()=>{ cancelAnimationFrame(raf); raf=requestAnimationFrame(()=>titles.forEach(fit)); };
 run();
 window.addEventListener('resize',run);
 window.addEventListener('load',run);
 if(document.fonts&&document.fonts.ready) document.fonts.ready.then(run);
 const mo=new MutationObserver(run);
 titles.forEach(h=>mo.observe(h,{childList:true,characterData:true,subtree:true}));
})();
