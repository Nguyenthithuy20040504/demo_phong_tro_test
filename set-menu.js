const token = '8729223332:AAGqHbzqGqlKGE_UvhZohu4YUyioVDON3yA';
const url = `https://api.telegram.org/bot${token}/setMyCommands`;
const commands = [
  { command: 'phong', description: 'Tra cứu phòng trống, đang thuê' },
  { command: 'baocao', description: 'Báo cáo doanh thu tháng này' },
  { command: 'thutien', description: 'Xác nhận thu tiền (VD: /thutien HD01)' }
];
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ commands })
}).then(r => r.json()).then(console.log).catch(console.error);
