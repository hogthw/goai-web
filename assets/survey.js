/* Go AI — khảo sát Đèn Tín Hiệu (v2.6.0)
 * Tách khỏi trang PHP để bật được Content-Security-Policy nghiêm ngặt (không cần 'unsafe-inline' cho script);
 * các thuộc tính onclick/onkeydown nội tuyến được thay bằng data-action + một bộ lắng nghe ủy quyền. */
(function () {
'use strict';
const APP_ROOT = document.getElementById('app');
if (!APP_ROOT) return;
/* Chỉ chấp nhận đường dẫn cùng nguồn cho nút "Đăng ký tư vấn" */
const CONTACT_URL = (function () {
  const raw = APP_ROOT.dataset.contactUrl || '/contact/?nguon=den-tin-hieu';
  try { const u = new URL(raw, location.href); if (u.origin === location.origin) return u.pathname + u.search + u.hash; } catch (e) { /* bỏ qua */ }
  return '/contact/?nguon=den-tin-hieu';
})();
const PILLARS = [
  {
    name: "Mục tiêu & Phạm vi",
    nextRead: "Chương 3 — đo baseline một quy trình cụ thể",
    questions: [
      {
        text: "Đã chọn đúng một quy trình cụ thể để cải thiện chưa?",
        options: [
          "Mới có ý tưởng chung \"muốn ứng dụng AI\", chưa chọn quy trình cụ thể.",
          "Đã nhắm một phòng ban, nhưng chưa xuống tới tên một quy trình cụ thể.",
          "Đã chọn tên quy trình, nhưng nhiều người còn hiểu khác nhau về phạm vi.",
          "Đã chọn quy trình cụ thể, phạm vi rõ ràng, người liên quan xác nhận.",
          "Phạm vi đã viết thành văn bản ngắn, có điểm bắt đầu/kết thúc rõ, không ai tranh cãi."
        ]
      },
      {
        text: "Đã đo được ít nhất một con số hiện trạng chưa?",
        options: [
          "Chưa đo gì, chỉ có cảm nhận \"việc này chậm/tốn kém\".",
          "Có ước lượng miệng từ một người, chưa ghi lại thành số liệu.",
          "Có số liệu ước lượng bằng công thức tính tay, chưa kiểm tra lại với người thực thi.",
          "Có ít nhất một chỉ số đo thực tế, được người trực tiếp làm xác nhận.",
          "Có từ hai chỉ số trở lên, đo trong khoảng thời gian đủ dài để phản ánh biến động thật."
        ]
      }
    ]
  },
  {
    name: "Bảo trợ & Trách nhiệm",
    nextRead: "AI–Human Decision Rights, Chương 5–10",
    questions: [
      {
        text: "Có người cụ thể chịu trách nhiệm nghiệp vụ cho kết quả cuối cùng?",
        options: [
          "Chưa ai được giao, mặc định \"phòng IT sẽ lo\".",
          "Có người phụ trách kỹ thuật, chưa có người phụ trách nghiệp vụ tương ứng.",
          "Có tên một người nghiệp vụ, nhưng người đó chưa xác nhận nhận vai trò.",
          "Có người nghiệp vụ cụ thể, đã đồng ý, dành thời gian rõ ràng mỗi tuần.",
          "Người đó có KPI/mục tiêu cá nhân gắn trực tiếp với kết quả pilot."
        ]
      },
      {
        text: "Người đó có đủ thẩm quyền quyết định dừng/thay đổi không cần xin lại từ đầu?",
        options: [
          "Mọi thay đổi đều phải trình lên nhiều cấp phê duyệt lại.",
          "Tự quyết được thay đổi nhỏ, nhưng dừng hẳn dự án cần xin phép nhiều người.",
          "Có quyền quyết định trong phạm vi ngân sách nhỏ, chưa rõ ràng bằng văn bản.",
          "Quyền hạn được xác nhận bằng văn bản/email chính thức từ cấp trên.",
          "Quyền hạn thống nhất trong toàn đội từ đầu, không ai bất ngờ khi ra quyết định."
        ]
      }
    ]
  },
  {
    name: "Độ chuẩn hóa Quy trình",
    nextRead: "Chương 3 — phân biệt việc bàn giấy và việc cần phán đoán",
    questions: [
      {
        text: "Quy trình hiện tại đã mô tả thành các bước cụ thể, khớp thực tế chưa?",
        options: [
          "Không có tài liệu mô tả quy trình nào tồn tại.",
          "Có tài liệu cũ, nhưng không ai chắc còn đúng với cách làm hiện tại.",
          "Có tài liệu viết lại gần đây bởi quản lý, chưa hỏi người trực tiếp làm.",
          "Tài liệu đã được người trực tiếp làm xác nhận đúng phần lớn thời gian.",
          "Tài liệu ghi rõ cả các trường hợp ngoại lệ thường gặp, không chỉ luồng chuẩn."
        ]
      },
      {
        text: "Đã phân biệt việc bàn giấy và việc cần phán đoán chưa?",
        options: [
          "Chưa từng nghĩ đến việc phân loại này.",
          "Có ý niệm mơ hồ, chưa viết ra thành danh sách cụ thể.",
          "Đã liệt kê được các bước, phân loại vẫn còn tranh cãi ở một vài bước.",
          "Đã phân loại rõ phần lớn các bước, có đồng thuận của người liên quan.",
          "Đã phân loại toàn bộ, kèm lý do vì sao mỗi bước thuộc loại nào."
        ]
      }
    ]
  },
  {
    name: "Sẵn sàng Dữ liệu",
    nextRead: "Chương 4 — từ quy trình đến hệ thống chạy thật",
    questions: [
      {
        text: "Dữ liệu cần dùng đã được chuẩn hóa, không rải rác chưa đồng bộ?",
        options: [
          "Dữ liệu nằm ở nhiều nơi (excel cá nhân, giấy tờ, hệ thống khác nhau).",
          "Đã gom về một vài nguồn chính, định dạng còn khác nhau giữa các nguồn.",
          "Phần lớn dữ liệu đã ở một hệ thống, một số ngoại lệ vẫn xử lý thủ công.",
          "Dữ liệu đã đồng bộ một nguồn, có kiểm tra định kỳ phát hiện sai lệch.",
          "Dữ liệu đồng bộ tự động, có cảnh báo khi phát hiện bất thường."
        ]
      },
      {
        text: "Có người cụ thể chịu trách nhiệm dữ liệu này luôn đúng và cập nhật?",
        options: [
          "Không ai được giao trách nhiệm này.",
          "Ngầm hiểu là việc của một phòng ban, chưa giao cho cá nhân cụ thể.",
          "Có người phụ trách nhưng chỉ xử lý khi có sự cố, không chủ động rà soát.",
          "Có người chủ động rà soát định kỳ, có lịch rõ ràng.",
          "Có quy trình chính thức, có người thay thế dự phòng khi vắng mặt."
        ]
      }
    ]
  },
  {
    name: "Hạ tầng & Tích hợp",
    nextRead: "Chương 4 — từ quy trình đến hệ thống chạy thật",
    questions: [
      {
        text: "Các hệ thống liên quan trao đổi dữ liệu được không cần nhập tay lại?",
        options: [
          "Phải nhập tay hoàn toàn giữa các hệ thống.",
          "Có thể xuất/nhập file thủ công (excel, csv) giữa các hệ thống.",
          "Một phần đã kết nối tự động, phần còn lại vẫn thủ công.",
          "Phần lớn hệ thống liên quan đã kết nối tự động.",
          "Toàn bộ hệ thống liên quan kết nối tự động, có giám sát lỗi kết nối."
        ]
      },
      {
        text: "Nếu cần dừng/rút lại thay đổi, có cách quay về cách cũ không mất dữ liệu?",
        options: [
          "Chưa từng nghĩ đến kịch bản này.",
          "Có ý tưởng chung nhưng chưa thử nghiệm.",
          "Có kế hoạch trên giấy, chưa diễn tập.",
          "Đã diễn tập việc quay lại cách làm cũ ít nhất một lần.",
          "Có quy trình chính thức, người liên quan đều biết phải làm gì nếu cần dừng."
        ]
      }
    ]
  },
  {
    name: "Con người & Mức độ chấp nhận",
    nextRead: "Chương 9 và case Chương 3",
    questions: [
      {
        text: "Người trực tiếp làm việc này đã được hỏi ý kiến trước khi thiết kế thay đổi?",
        options: [
          "Thay đổi được quyết định hoàn toàn bởi quản lý, chưa hỏi ai.",
          "Có thông báo cho người thực thi biết, chưa thực sự hỏi ý kiến.",
          "Đã hỏi ý kiến một vài người, chưa đại diện đủ cho cả nhóm.",
          "Đã hỏi ý kiến đại diện đủ rộng, ghi nhận phản hồi bằng văn bản.",
          "Người thực thi tham gia trực tiếp vào việc thiết kế lại quy trình."
        ]
      },
      {
        text: "Có nhận diện được lý do cụ thể khiến họ có thể phản đối chưa?",
        options: [
          "Chưa nghĩ tới khả năng có phản đối.",
          "Đoán có thể có phản đối nhưng chưa rõ lý do gì.",
          "Đã nghe một vài lý do phản đối không chính thức, chưa hỏi trực tiếp.",
          "Đã hỏi trực tiếp, ghi nhận ít nhất một lý do cụ thể (lo bảo mật, quen cách cũ...).",
          "Đã có kế hoạch xử lý cụ thể cho từng lý do phản đối đã ghi nhận."
        ]
      }
    ]
  },
  {
    name: "Quản trị & Phân quyền",
    nextRead: "Chương 2 (Agent Necessity Test) và Chương 12",
    questions: [
      {
        text: "Đã xác định AI/hệ thống được NHÌN, ĐỀ XUẤT, TỰ LÀM gì trong quy trình này?",
        options: [
          "Chưa phân biệt ba mức độ này.",
          "Có ý tưởng chung, chưa viết ra cụ thể cho từng bước.",
          "Đã viết ra cho phần lớn các bước, còn một số điểm chưa rõ.",
          "Đã viết đầy đủ, có đồng thuận giữa nghiệp vụ và kỹ thuật.",
          "Đã viết đầy đủ và được rà soát bởi người phụ trách rủi ro."
        ]
      },
      {
        text: "Có xác định trước điều kiện dừng chưa?",
        options: [
          "Chưa nghĩ tới điều kiện dừng.",
          "Có ý tưởng chung \"nếu tệ quá thì dừng\".",
          "Có một vài chỉ số dừng nhưng chưa có ngưỡng cụ thể.",
          "Có ngưỡng cụ thể cho ít nhất hai chỉ số dừng.",
          "Có bộ điều kiện dừng đầy đủ, thống nhất trước khi bắt đầu, có người theo dõi."
        ]
      }
    ]
  },
  {
    name: "Bảo mật & Rủi ro",
    nextRead: "Chương 12 — vận hành an toàn",
    questions: [
      {
        text: "Dữ liệu dùng trong quy trình này đã phân loại theo mức độ nhạy cảm?",
        options: [
          "Chưa từng phân loại dữ liệu.",
          "Có khái niệm chung \"dữ liệu nhạy cảm\" nhưng chưa áp dụng cụ thể.",
          "Đã phân loại một phần dữ liệu liên quan.",
          "Đã phân loại đầy đủ dữ liệu liên quan tới quy trình này.",
          "Có chính sách phân loại áp dụng toàn công ty, không chỉ riêng dự án này."
        ]
      },
      {
        text: "Có quy định rõ loại dữ liệu nào được/không được đưa vào công cụ AI?",
        options: [
          "Chưa có quy định nào, tùy nhân viên tự quyết định.",
          "Có hiểu ngầm trong nhóm nhỏ, chưa viết thành văn bản.",
          "Có văn bản hướng dẫn chung, chưa cụ thể cho quy trình này.",
          "Có hướng dẫn cụ thể cho quy trình này, đã phổ biến tới người liên quan.",
          "Có hướng dẫn cụ thể, có cơ chế kiểm tra tuân thủ định kỳ."
        ]
      }
    ]
  }
];


/* ===== Đa ngôn ngữ (Việt / Anh / Hoa) — dùng chung khóa lưu ngôn ngữ với các trang còn lại ===== */
const LANGS = ['vi','en','zh'];
const SURVEY_T = window.GOAI_SURVEY_I18N || { en:{}, zh:{} };
let lang = 'vi';
const tr = s => (lang === 'vi' ? s : ((SURVEY_T[lang] && SURVEY_T[lang][s]) || s));
const fmt = (s, vars) => tr(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const OG_LOCALES = { vi:'vi_VN', en:'en_US', zh:'zh_CN' };
function readLang(){
  try { const v = localStorage.getItem('goai_lang'); if (LANGS.includes(v)) return v; } catch(e){}
  const m = document.cookie.match(/(?:^|;\s*)goai_lang=(vi|en|zh)/);
  return m ? m[1] : null;
}
function storeLang(l){
  try { localStorage.setItem('goai_lang', l); } catch(e){}
  try { document.cookie = 'goai_lang=' + l + ';path=/;max-age=31536000;SameSite=Lax' + (location.protocol === 'https:' ? ';Secure' : ''); } catch(e){}
}
const BASE_LINKS = { back: document.getElementById('back-link') && document.getElementById('back-link').getAttribute('href') };
const ORIGINAL_TITLE = document.title;
const ORIGINAL_DESC = (document.querySelector('meta[name="description"]') || {}).content || '';
function withLang(href){
  if (!href || lang === 'vi') return href;
  const url = new URL(href, location.href);
  url.searchParams.set('lang', lang);
  return url.pathname + url.search + url.hash;
}
function applyStaticLanguage(){
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
  document.title = tr(ORIGINAL_TITLE);
  const desc = document.querySelector('meta[name="description"]'); if (desc) desc.setAttribute('content', tr(ORIGINAL_DESC));
  const back = document.getElementById('back-link');
  if (back) { back.textContent = tr('← Chọn công cụ khác'); back.setAttribute('href', withLang(BASE_LINKS.back)); }
  const main = document.getElementById('app'); if (main) main.setAttribute('aria-label', tr('Đèn Tín Hiệu'));
  const group = document.querySelector('.survey-lang'); if (group) group.setAttribute('aria-label', tr('Ngôn ngữ'));
  document.querySelectorAll('[data-lang-option]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.langOption === lang)));
}
function setLang(l, silent){
  lang = LANGS.includes(l) ? l : 'vi';
  if (!silent) storeLang(lang);
  applyStaticLanguage();
  try {
    const next = new URL(location.href);
    if (lang === 'vi') next.searchParams.delete('lang'); else next.searchParams.set('lang', lang);
    history.replaceState({}, '', next);
  } catch(e){}
  render({ keepScroll: true });
}
document.querySelectorAll('[data-lang-option]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.langOption)));

const TOTAL_Q = PILLARS.reduce((s,p)=>s+p.questions.length,0); // 16
let flatIndex = []; // maps flat question index -> {pillarIdx, qIdx}
PILLARS.forEach((p, pi)=> p.questions.forEach((q, qi)=> flatIndex.push({pi, qi})));

let screen = "intro"; // intro | quiz | results
let current = 0; // flat question index
let answers = new Array(TOTAL_Q).fill(null);

function render(opts){
  /* v2.6.1: chỉ cuộn lên đầu khi đổi màn hình/câu hỏi. Chọn đáp án hoặc đổi ngôn ngữ giữ nguyên vị trí cuộn và tiêu điểm bàn phím
     (trước đây mỗi lần chọn đáp án trang nhảy lên đầu, và tiêu điểm bàn phím bị mất). */
  const keep = !!(opts && opts.keepScroll);
  const app = document.getElementById('app');
  const y = window.scrollY;
  const active = document.activeElement;
  const focusValue = (keep && active && app.contains(active) && active.dataset && active.dataset.action === 'select') ? active.dataset.value : null;
  if(screen === "intro") app.innerHTML = renderIntro();
  else if(screen === "quiz") app.innerHTML = renderQuiz();
  else app.innerHTML = renderResults();
  if (keep) {
    window.scrollTo(0, y);
    if (focusValue) { const el = app.querySelector('[data-action="select"][data-value="' + focusValue + '"]'); if (el) el.focus({ preventScroll: true }); }
  } else { window.scrollTo(0, 0); }
}

function renderIntro(){
  return `
    <div class="signal">
      <div class="bulb"></div>
      <div class="bulb"></div>
      <div class="bulb"></div>
    </div>
    <div class="eyebrow" style="text-align:center;margin-top:16px;">${tr('AI Automation Thực Chiến — Công cụ đi kèm sách')}</div>
    <h1 style="text-align:center;">${tr('Đèn Tín Hiệu <br>Sẵn Sàng Tự Động Hóa')}</h1>
    <p class="muted" style="text-align:center;">${tr('16 câu hỏi, khoảng 10–15 phút. Trả lời cho <b>một quy trình cụ thể</b> bạn đang cân nhắc tự động hóa — không phải cho cả công ty.')}</p>

    <div class="card">
      <p style="margin:0 0 10px;font-weight:700;font-size:14px;">${tr('Trước khi bắt đầu')}</p>
      <p class="muted" style="margin:0;">${tr('Điểm thấp không phải điểm xấu — nó là thông tin. Mục đích là biết mình đang đứng ở đâu thật, không phải để đạt điểm cao. Nếu chưa làm bài tập đo baseline ở Chương 3, nên làm trước, vì một vài câu hỏi sẽ chính xác hơn sau khi đã thử đo.')}</p>
    </div>

    <div class="pillar-list">
      ${PILLARS.map((p,i)=>`<div class="pillar-row"><span class="pillar-num">${i+1}</span><span>${tr(p.name)}</span></div>`).join('')}
    </div>

    <button class="primary-btn" data-action="start">${tr('Bắt đầu khảo sát')}</button>
  `;
}

function startQuiz(){ screen="quiz"; current=0; render(); }

function renderQuiz(){
  const {pi, qi} = flatIndex[current];
  const pillar = PILLARS[pi];
  const q = pillar.questions[qi];
  const selected = answers[current];
  const pct = Math.round((current)/TOTAL_Q*100);

  return `
    <div class="progress-wrap">
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="progress-label">${current+1}/${TOTAL_Q}</div>
    </div>
    <div class="eyebrow">${fmt('TRỤ CỘT {n} · {name}', {n: pi+1, name: tr(pillar.name).toUpperCase()})}</div>
    <div class="q-block" role="radiogroup" aria-labelledby="q-text">
      <div class="q-index">${fmt('CÂU {n}/2', {n: qi+1})}</div>
      <div class="q-text" id="q-text">${tr(q.text)}</div>
      ${q.options.map((opt,idx)=>`
        <div role="radio" aria-checked="${selected===idx+1?'true':'false'}" tabindex="0" class="opt ${selected===idx+1?'selected':''}" data-action="select" data-value="${idx+1}">
          <div class="opt-num">${idx+1}</div>
          <div class="opt-text">${tr(opt)}</div>
        </div>
      `).join('')}
    </div>
    <div class="nav-row">
      ${current>0 ? `<button class="ghost-btn btn-half" data-action="prev">${tr('Quay lại')}</button>` : ``}
      <button class="primary-btn btn-half" ${selected?'':'disabled aria-disabled="true"'} data-action="next">
        ${current===TOTAL_Q-1 ? tr('Xem kết quả') : tr('Tiếp tục')}
      </button>
    </div>
  `;
}

function selectAnswer(val){
  answers[current] = val;
  render({ keepScroll: true });
}
function nextQ(){
  if(answers[current]==null) return;
  if(current === TOTAL_Q-1){ screen="results"; render(); return; }
  current++; render();
}
function prevQ(){ if(current>0){ current--; render(); } }

function computePillarScores(){
  return PILLARS.map((p, pi)=>{
    const idxs = flatIndex.map((f,i)=> f.pi===pi ? i : -1).filter(i=>i>=0);
    const vals = idxs.map(i=>answers[i]);
    const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
    return {name:p.name, nextRead:p.nextRead, avg};
  });
}

function renderResults(){
  const scores = computePillarScores();
  const minScore = Math.min(...scores.map(s=>s.avg));
  const allGreen = scores.every(s=>s.avg>=4);
  let verdict, verdictColor, verdictText, litClass;
  if(minScore<=2){ verdict="ĐÈN ĐỎ"; verdictColor="var(--red)"; litClass="lit-red";
    verdictText="Dừng lại trước khi nghĩ tới automation. Ít nhất một trụ cột đang ở mức nền tảng chưa có gì — xử lý đúng trụ cột đó trước, đúng bài học từ case Chương 3."; }
  else if(allGreen){ verdict="ĐÈN XANH"; verdictColor="var(--green)"; litClass="lit-green";
    verdictText="Đủ điều kiện chạy pilot. Bước tiếp theo: Chương 4 (kết nối) và Chương 14–15 (thiết kế pilot)."; }
  else { verdict="ĐÈN VÀNG"; verdictColor="var(--yellow)"; litClass="lit-yellow";
    verdictText="Sẵn sàng một phần. Cần chuẩn bị thêm đúng (các) trụ cột yếu nhất trước khi bắt đầu, không cần dàn trải cả 8 trụ cột cùng lúc."; }

  const sorted = [...scores].sort((a,b)=>a.avg-b.avg);
  const weakest = sorted.slice(0,2);

  function fillClass(v){ return v<=2?'fill-red': v<4?'fill-yellow':'fill-green'; }

  return `
    <div class="signal">
      <div class="bulb ${litClass==='lit-red'?'lit-red':''}"></div>
      <div class="bulb ${litClass==='lit-yellow'?'lit-yellow':''}"></div>
      <div class="bulb ${litClass==='lit-green'?'lit-green':''}"></div>
    </div>
    <div class="verdict-title" style="color:${verdictColor}">${tr(verdict)}</div>
    <p class="verdict-sub muted">${tr(verdictText)}</p>

    <div class="divider"></div>
    <p style="font-weight:700;font-size:14px;margin-bottom:14px;">${tr('Điểm theo 8 trụ cột')}</p>
    ${scores.map(s=>`
      <div class="bar-row">
        <div class="bar-head"><span class="name">${tr(s.name)}</span><span class="score">${s.avg.toFixed(1)}/5</span></div>
        <div class="bar-track"><div class="bar-fill ${fillClass(s.avg)}" style="width:${s.avg/5*100}%"></div></div>
      </div>
    `).join('')}

    <div class="next-read">
      <div class="label">${tr('Trụ cột yếu nhất — đọc tiếp')}</div>
      ${weakest.map(w=>`<div class="chap">${tr(w.name)} → ${tr(w.nextRead)}</div>`).join('')}
    </div>

    <div class="cta-note">
      ${tr('Đây là bản tự chấm một người, dùng cho một quy trình cụ thể. Nếu muốn chẩn đoán qua nhiều vai trò (Business Owner, người thực thi, IT, rủi ro) và phát hiện khoảng lệch nhận thức giữa các vai trò — đúng loại sai lầm đã xảy ra trong case Chương 3 — bản khảo sát chuyên sâu là bước tiếp theo, thực hiện cùng đội ngũ tư vấn.')}
    </div>

    <div class="result-actions"><button class="primary-btn" data-action="print">${tr('Lưu hoặc in kết quả')}</button><a class="primary-btn" style="display:block;text-align:center;text-decoration:none;margin-top:12px" href="${withLang(CONTACT_URL)}" target="_top">${tr('Đăng ký tư vấn về kết quả')}</a><p class="muted">${tr('Bạn có thể đăng ký trao đổi chuyên sâu về kết quả đánh giá.')}</p></div><button class="ghost-btn" style="margin-top:18px;" data-action="restart">${tr('Làm lại từ đầu')}</button>
  `;
}

function restart(){ screen="intro"; current=0; answers=new Array(TOTAL_Q).fill(null); render(); }

{
  const fromUrl = new URLSearchParams(location.search).get('lang');
  setLang(LANGS.includes(fromUrl) ? fromUrl : (readLang() || 'vi'), !LANGS.includes(fromUrl));
}

APP_ROOT.addEventListener('click', event => {
  const el = event.target.closest && event.target.closest('[data-action]');
  if (!el || !APP_ROOT.contains(el)) return;
  switch (el.dataset.action) {
    case 'start':   startQuiz(); break;
    case 'select':  selectAnswer(parseInt(el.dataset.value, 10)); break;
    case 'prev':    prevQ(); break;
    case 'next':    nextQ(); break;
    case 'print':   window.print(); break;
    case 'restart': restart(); break;
  }
});
APP_ROOT.addEventListener('keydown', event => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches && event.target.matches('.opt[role="radio"]')) {
    event.preventDefault(); event.target.click();
  }
});
})();
