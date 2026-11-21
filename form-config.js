/*
 * Cấu hình gửi biểu mẫu Go AI → Google Sheet.
 * Sửa bằng Notepad (lưu dạng UTF-8), rồi upload lại lên Cloudflare Pages. Không cần dựng lại website.
 *   url    : URL Ứng dụng web của Google Apps Script, dạng https://script.google.com/macros/s/XXXX/exec
 *            (để trống "" = biểu mẫu chưa gửi đi, khách được hướng dẫn gọi Zalo/điện thoại)
 *   secret : phải TRÙNG với CONFIG.SECRET trong Apps Script
 * Nhớ sửa cả tệp _redirects (dành cho khách tắt JavaScript).
 */
window.GOAI_FORM = {
  url: "https://script.google.com/macros/s/AKfycbw8ZNk2Kjfg5iWYcjjSREacsoQR1jz20I9OLh5oH1oRGQCFwyX-CEovNiqLSZPFYis14Q/exec",
  secret: "goai_zIu6scC8x62iokBy57xlZbeeVPnJrpAFd7BS3yuo"
};
