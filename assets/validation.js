// Dùng chung giữa trình duyệt và máy chủ. Không xác minh chủ sở hữu/OTP.
export function normalizePhone(value) {
  /* Khớp với máy chủ (functions.php): bỏ khoảng trắng, -, (, ), +, . rồi 84xxxxxxxxx → 0xxxxxxxxx */
  let phone = String(value ?? '').replace(/[\s\-().+]/g, '');
  if (/^84[0-9]{9}$/.test(phone)) phone = '0' + phone.slice(2);
  return phone;
}
export function validPhone(value) { return /^0[0-9]{9}$/.test(normalizePhone(value)); }
export function validCompanyEmail(value) {
  const email = String(value ?? '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const personal = ['gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.com.vn', 'outlook.com', 'hotmail.com', 'live.com', 'icloud.com', 'proton.me', 'protonmail.com', 'aol.com'];
  return !personal.includes(email.split('@')[1].toLowerCase());
}
export function validateLead(raw) {
  /* FIXED: Kiểm tra honeypot riêng — trường 'website' phải trống. Nếu có giá trị thì bot đang điền form. */
  if (raw.website && String(raw.website).trim() !== '') return { error: null, honeypot: true };
  const data = {};
  /* FIXED: Loại bỏ 'website' khỏi danh sách key; honeypot không được gửi lên server trong payload thật. */
  for (const key of ['name','company','email','phone','position','need','message','source']) data[key] = String(raw[key] ?? '').trim();
  data.phone = normalizePhone(data.phone);
  if (!data.name || !data.company) return { error: 'Vui lòng nhập họ tên và công ty.' };
  if (!validCompanyEmail(data.email)) return { error: 'Vui lòng nhập email theo tên miền công ty.' };
  if (!validPhone(data.phone)) return { error: 'Vui lòng nhập số điện thoại gồm 10 chữ số, bắt đầu bằng 0.' };
  if (!data.need) return { error: 'Vui lòng chọn nhu cầu chính.' };
  if (raw.consent !== true && raw.consent !== 'on') return { error: 'Vui lòng xác nhận đồng ý để gửi yêu cầu tư vấn.' };
  /* FIXED: Chỉ kiểm tra .length trên string, tránh kiểm tra trên boolean (consent: true). */
  if (Object.values(data).some(v => typeof v === 'string' && v.length > 4000)) return { error: 'Nội dung quá dài. Vui lòng rút gọn.' };
  return { data: { ...data, consent: true } };
}
