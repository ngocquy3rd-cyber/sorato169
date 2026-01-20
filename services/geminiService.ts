
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  /**
   * Mở rộng ảnh thành 16:9 và TỰ ĐỘNG XÓA LOGO/VĂN BẢN RÁC.
   */
  async standardizeImage(base64Data: string, mimeType: string): Promise<string> {
    try {
      // Luôn khởi tạo instance mới để đảm bảo dùng đúng API Key hiện tại
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image', 
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: "Action: Clean and outpaint. 1. Remove all logos, text overlays, and watermarks. 2. Expand the image to 16:9 aspect ratio naturally. 3. Ensure a high-quality, professional finish without any artifacts from the original graphics.",
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      });

      let resultBase64 = '';
      
      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            resultBase64 = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (!resultBase64) {
        throw new Error("AI did not return an image. It might have been blocked by safety filters.");
      }

      return resultBase64;
    } catch (error: any) {
      console.error("Gemini Image API error:", error);
      throw error;
    }
  }

  async translateTitle(text: string): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate this Vietnamese title to catchy English for a YouTube thumbnail (MAX 5-7 words, UPPERCASE): "${text}"`,
      });

      return response.text?.trim() || text;
    } catch (error) {
      console.error("Translation error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
