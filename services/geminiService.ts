import { GoogleGenAI, SchemaType } from "@google/genai";

// Helper to get closest supported aspect ratio
function getClosestAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  const supportedRatios = [
    { label: "1:1", value: 1.0 },
    { label: "3:4", value: 0.75 },
    { label: "4:3", value: 1.333 },
    { label: "9:16", value: 0.5625 },
    { label: "16:9", value: 1.778 },
  ];

  // Find the ratio with the minimum difference
  const closest = supportedRatios.reduce((prev, curr) => {
    return (Math.abs(curr.value - ratio) < Math.abs(prev.value - ratio) ? curr : prev);
  });

  return closest.label;
}

// Helper to resize and compress image to avoid payload limits
const resizeImage = (base64Str: string, maxWidth = 1024): Promise<{base64: string, width: number, height: number}> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Resize if too large
      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Compress to JPEG at 0.85 quality
        resolve({
          base64: canvas.toDataURL('image/jpeg', 0.85),
          width: width,
          height: height
        });
      } else {
        resolve({ base64: base64Str, width, height });
      }
    };
    img.onerror = () => {
      // Fallback to original if loading fails
      resolve({ base64: base64Str, width: 1024, height: 1024 }); 
    };
  });
};

export interface RoomAnalysisResult {
  styleId: string;
  curtainTypeKeyword: string; // e.g., 'S-Curve', 'Roller'
  colorId: string;
  layerId: string;
  reasoning: string;
}

export async function analyzeRoomSettings(imageBase64: string): Promise<RoomAnalysisResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const { base64: optimizedImage } = await resizeImage(imageBase64, 800);
    const cleanBase64 = optimizedImage.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const prompt = `
      Analyze this interior image and recommend the best curtain design.
      
      Available Styles (choose one ID):
      - 'minimalist' (Minimalist/Muji)
      - 'scandinavian' (Scandinavian)
      - 'luxury' (Modern Luxury)
      - 'modern-classic' (Modern Classic)
      - 'loft' (Loft/Industrial)
      - 'tropical' (Tropical/Resort)
      - 'contemporary' (Contemporary)
      - 'mid-century' (Mid-Century Modern)

      Available Curtain Types (choose keyword):
      - 'S-Curve' (Modern, wave)
      - 'Pleated' (Classic, pleated)
      - 'Eyelet' (Rings)
      - 'Roller' (Blinds, flat)
      - 'Wooden' (Blinds, wood slats)
      - 'Vertical' (Blinds, vertical slats)
      - 'Roman' (Folded fabric)
      - 'Bamboo' (Natural, woven)
      - 'Sheer' (Sheer only)
      - 'Louis' (Luxury swags)

      Available Colors (choose one ID):
      - 'white', 'cream', 'beige', 'light-grey', 'dark-grey', 'black', 'navy', 'light-blue', 'brown', 'gold', 'green', 'pink'

      Available Layers (choose one ID):
      - '1-layer'
      - '2-layer' (Only if curtain type is fabric like S-Curve, Pleated, Eyelet. Blinds must be 1-layer)

      Return valid JSON with the following structure:
      {
        "styleId": "string",
        "curtainTypeKeyword": "string",
        "colorId": "string",
        "layerId": "string",
        "reasoning": "short string explaining why in Thai"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error("No analysis received");
    
    return JSON.parse(text) as RoomAnalysisResult;
  } catch (error) {
    console.error("Analysis failed", error);
    throw error;
  }
}

export async function generateCurtainDesign(
  imageBase64: string,
  stylePrompt: string,
  colorPrompt: string,
  layerPrompt: string
): Promise<string> {
  // Use the standard environment API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // 1. Optimize image before sending and get dimensions
    const { base64: optimizedImage, width, height } = await resizeImage(imageBase64);
    
    // Calculate best aspect ratio
    const aspectRatio = getClosestAspectRatio(width, height);
    
    // 2. Remove header for API
    const cleanBase64 = optimizedImage.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    // 3. Construct intelligent prompt
    // If the style involves blinds, ignore the layer prompt (usually "single layer") 
    // to prevent the AI from drawing fabric drapes over the blinds.
    const isBlind = stylePrompt.toLowerCase().includes('blind') || 
                    stylePrompt.toLowerCase().includes('shade') ||
                    stylePrompt.toLowerCase().includes('slats');
    
    const effectiveLayerPrompt = isBlind ? '' : layerPrompt;

    const prompt = `
      Task: Generate a photorealistic image of this room with new window treatments.
      Instructions:
      1. Detect the windows in the image.
      2. Apply the following design: ${colorPrompt} ${effectiveLayerPrompt}, ${stylePrompt}.
      3. Maintain the original furniture, floor, lighting, and perspective of the room.
      4. Ensure the window treatments look natural with correct lighting and shadows.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          // IMPORTANT: Image part must come first for editing tasks
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        }
      }
    });

    // Extract the generated image from the response
    if (response.candidates && response.candidates[0].content.parts) {
      // Check for image part
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      
      // If no image found, check for text refusal/explanation
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.warn("Model returned text instead of image:", part.text);
          throw new Error(`AI Response: ${part.text}`);
        }
      }
    }

    throw new Error("No image generated.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}