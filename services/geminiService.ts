import { GoogleGenAI, Modality, Type } from "@google/genai";

// Helper function to initialize the AI client on demand.
// This prevents the app from crashing on load if the API key isn't set.
const getAiClient = () => {
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
        // This user-friendly error will be displayed in the UI.
        throw new Error("API Key ไม่ได้ตั้งค่า โปรดตั้งค่า Environment Variable ชื่อ API_KEY ใน Vercel");
    }
    return new GoogleGenAI({ apiKey: API_KEY });
};

interface ImagePart {
  base64: string;
  mimeType: string;
}

export interface Bubble {
  box: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  text: string;
}

export interface EditedBubble extends Bubble {
    newText: string;
}


export async function generateMangaFromImage(
  images: ImagePart[],
  prompt: string
): Promise<string> {
  try {
    const ai = getAiClient(); // Initialize client just-in-time
    const imageParts = images.map(image => ({
      inlineData: {
        data: image.base64,
        mimeType: image.mimeType,
      },
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          ...imageParts,
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    // Check for safety blocks from the API response
    const blockReason = response.promptFeedback?.blockReason;
    if (blockReason) {
      if (blockReason === 'SAFETY') {
        throw new Error('คำขอของคุณถูกปฏิเสธเนื่องจากนโยบายความปลอดภัย โปรดลองใช้รูปภาพหรือคำอธิบายอื่น');
      }
      throw new Error(`การสร้างภาพถูกบล็อกด้วยเหตุผล: ${blockReason}. โปรดปรับแก้คำขอของคุณ`);
    }
    
    if (!response.candidates || response.candidates.length === 0) {
        throw new Error("AI ไม่สามารถสร้างผลลัพธ์ได้ โปรดลองอีกครั้งด้วยรูปภาพหรือคำสั่งที่แตกต่าง");
    }

    // Find and return the generated image
    for (const part of response.candidates[0].content?.parts || []) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
    }
    
    // Handle cases where an image was expected but not returned
    const returnedText = response.text?.trim();
    if (returnedText) {
      throw new Error(`AI ไม่ได้ส่งคืนรูปภาพ แต่ตอบกลับเป็นข้อความแทน: "${returnedText}"`);
    }

    throw new Error("AI ไม่ได้ส่งคืนรูปภาพตามที่คาดไว้ โปรดลองอีกครั้ง");

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    
    if (error instanceof Error) {
        // Pass up the specific, user-friendly error messages we created above.
        // For other generic errors from the SDK, this will pass their message along.
        throw error;
    }
    
    // Fallback for unknown error types
    throw new Error("เกิดข้อผิดพลาดที่ไม่รู้จักในการสร้างมังงะ");
  }
}

export async function detectTextBubbles(image: ImagePart): Promise<Bubble[]> {
    try {
        const ai = getAiClient(); // Initialize client just-in-time
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [{
                    inlineData: {
                        data: image.base64,
                        mimeType: image.mimeType
                    }
                }, {
                    text: "Analyze this image to identify all speech bubbles or text boxes. For each one, provide its bounding box coordinates (x1, y1, x2, y2 as percentages of image dimensions from 0.0 to 1.0) and the exact text content inside it. Return the output as a JSON object matching the provided schema."
                }]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            box: {
                                type: Type.OBJECT,
                                properties: {
                                    x1: { type: Type.NUMBER },
                                    y1: { type: Type.NUMBER },
                                    x2: { type: Type.NUMBER },
                                    y2: { type: Type.NUMBER },
                                },
                                required: ["x1", "y1", "x2", "y2"],
                            },
                            text: { type: Type.STRING },
                        },
                        required: ["box", "text"],
                    },
                },
            },
        });
        
        const jsonStr = response.text.trim();
        const bubbles = JSON.parse(jsonStr) as Bubble[];
        return bubbles;
    } catch (error) {
        console.error("Error detecting text bubbles:", error);
        if (error instanceof Error && error.message.includes("API Key")) {
            throw error;
        }
        throw new Error("ไม่สามารถตรวจจับช่องคำพูดในภาพได้");
    }
}

export async function editTextInImage(image: ImagePart, bubbles: EditedBubble[]): Promise<string> {
    try {
        const ai = getAiClient(); // Initialize client just-in-time
        const editInstructions = bubbles.map((bubble, index) => 
            `Region ${index + 1}:
- Bounding Box (percentages): x1=${bubble.box.x1.toFixed(4)}, y1=${bubble.box.y1.toFixed(4)}, x2=${bubble.box.x2.toFixed(4)}, y2=${bubble.box.y2.toFixed(4)}
- Original Text: "${bubble.text}"
- New Text: "${bubble.newText}"`
        ).join('\n\n');

        const prompt = `You are an expert image in-painting specialist. Your task is to replace text within specific regions of the provided image.

**CRITICAL INSTRUCTIONS:**
1.  **Preserve Style:** You MUST perfectly preserve the original art style, font style, color, texture, and background within each bounding box. The edit should be seamless and undetectable.
2.  **Modify ONLY Text:** Do NOT alter any part of the image outside the provided bounding boxes.
3.  **Accuracy:** Replace the original text with the new text exactly as provided.

Here are the regions to modify:
${editInstructions}

The final output must be only the modified image. Do not output any text.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{
                    inlineData: {
                        data: image.base64,
                        mimeType: image.mimeType
                    }
                }, {
                    text: prompt
                }]
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const blockReason = response.promptFeedback?.blockReason;
        if (blockReason) {
            if (blockReason === 'SAFETY') {
                throw new Error('คำขอแก้ไขของคุณถูกปฏิเสธเนื่องจากนโยบายความปลอดภัย');
            }
            throw new Error(`การแก้ไขภาพถูกบล็อกด้วยเหตุผล: ${blockReason}.`);
        }
        
        if (!response.candidates || response.candidates.length === 0) {
            throw new Error("AI ไม่สามารถแก้ไขภาพได้ โปรดลองอีกครั้ง");
        }

        for (const part of response.candidates[0].content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        
        const returnedText = response.text?.trim();
        if (returnedText) {
          throw new Error(`AI ไม่ได้ส่งคืนรูปภาพที่แก้ไข แต่ตอบกลับเป็นข้อความแทน: "${returnedText}"`);
        }

        throw new Error("AI ไม่ได้ส่งคืนรูปภาพที่แก้ไขตามที่คาดไว้");
        
    } catch (error) {
        console.error("Error editing image:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("เกิดข้อผิดพลาดที่ไม่รู้จักระหว่างการแก้ไขข้อความในภาพ");
    }
}
