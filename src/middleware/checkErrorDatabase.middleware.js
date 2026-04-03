// Hàm check lỗi tổng quát
const checkDatabaseError = (error, context) => {
  console.error(`--- LỖI TẠI: ${context} ---`);
  console.error("Thông báo:", error.message);

  if (error.code) {
    console.error("Mã lỗi PostgreSQL:", error.code);
    // Một số mã lỗi phổ biến:
    // 23505: Trùng Unique key
    // 42P01: Bảng không tồn tại
    // 42703: Cột không tồn tại (Có thể bạn chưa thêm cột 'level')
    // 28P01: Sai mật khẩu/user
  }

  if (error.stack) {
    console.error("Vị trí dòng lỗi trong code:", error.stack.split("\n")[1]);
  }
  console.error("-----------------------------------");
};

export default checkDatabaseError;
