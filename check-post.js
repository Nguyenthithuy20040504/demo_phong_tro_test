const headers = new Headers();
headers.append("Content-Type", "application/json");
const body = JSON.stringify({
  hoTen: "Test Tenant from Script",
  soDienThoai: "0333333333",
  cccd: "001202033333",
  ngaySinh: "2000-01-01",
  gioiTinh: "nam",
  queQuan: "Hanoi",
  toaNhaBanDau: "69d08eac4d5d28507d30ca21" // Guessing a building ID? No, wait. We don't have login session here.
});
