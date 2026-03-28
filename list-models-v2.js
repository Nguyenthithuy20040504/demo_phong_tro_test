require('dotenv').config();
const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log("DANH SÁCH MODEL KHẢ DỤNG CHO PHÍM MỚI:");
    if (data.models) {
      data.models.forEach(m => console.log(`- ${m.name}`));
    } else {
      console.log("Không tìm thấy model nào hoặc có lỗi:", data);
    }
  } catch (error) {
    console.error("Lỗi kết nối:", error);
  }
}

listModels();
