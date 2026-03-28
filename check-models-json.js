require('dotenv').config();
const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
  const fs = require('fs');
  try {
    const response = await fetch(url);
    const data = await response.json();
    fs.writeFileSync('all-models-info.json', JSON.stringify(data, null, 2));
    console.log("Đã lưu toàn bộ thông tin model vào all-models-info.json");
  } catch (error) {
    console.error("Lỗi:", error);
  }
}

listModels();
