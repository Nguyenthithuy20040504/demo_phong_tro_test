const apiKey = "AIzaSyD2IL92gi65BXDrRsCR5T-oaWkA0OgyIIw";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log("DANH SÁCH MODEL KHẢ DỤNG:");
    if (data.models) {
      data.models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods})`));
    } else {
      console.log("Không tìm thấy model nào hoặc có lỗi:", data);
    }
  } catch (error) {
    console.error("Lỗi kết nối:", error);
  }
}

listModels();
