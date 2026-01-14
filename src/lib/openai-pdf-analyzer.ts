import type { PriorityLevel } from "@/hooks/usePrioritization";
import { getOpenAIApiKey } from "./openai-config";

export interface PDFAnalysisResult {
  priority: PriorityLevel;
  keywordsCount: number;
  sentiment: "low" | "mid" | "high";
  reasoning: string;
}

/**
 * Analyzes an image file (JPG, PNG) using OpenAI Vision API to determine priority
 * based on keyword spotting and sentiment detection
 * 
 * @param file - The image file to analyze (JPG, JPEG, or PNG)
 * @param apiKey - Optional API key. If not provided, will use VITE_OPENAI_API_KEY from env
 * @returns Analysis result with priority, keywords count, sentiment, and reasoning
 */
export async function analyzeImageWithOpenAI(
  file: File,
  apiKey?: string
): Promise<PDFAnalysisResult> {
  // Use provided API key or get from environment
  const openAIApiKey = apiKey || getOpenAIApiKey();
  // Convert image to base64
  const base64 = await fileToBase64(file);
  
  // Determine MIME type for the data URL
  const mimeType = file.type || "image/jpeg";

  // Prepare the prompt for OpenAI
  const prompt = `Analyze this image document and determine its priority level (low, medium, or high) based on:
1. Keyword spotting: Count relevant business keywords (deals, contracts, proposals, meetings, opportunities, revenue, price, quantity, etc.)
2. Sentiment detection: Analyze the overall sentiment (low, mid, high)

Return a JSON object with:
- priority: "low", "medium", or "high"
- keywordsCount: number of relevant keywords found
- sentiment: "low", "mid", or "high"
- reasoning: brief explanation

Priority rules:
- No keywords or low sentiment: low priority
- Some keywords (1-5) or mid sentiment: medium priority
- Many keywords (6+) or high sentiment: high priority

Return ONLY valid JSON, no other text.`;

  try {
    // Call OpenAI Vision API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o", // GPT-4o has excellent vision capabilities
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to analyze image");
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse JSON response
    const analysis = JSON.parse(content) as {
      priority: string;
      keywordsCount: number;
      sentiment: string;
      reasoning: string;
    };

    // Validate and normalize priority
    const priority = normalizePriority(analysis.priority);
    const sentiment = normalizeSentiment(analysis.sentiment);

    return {
      priority,
      keywordsCount: analysis.keywordsCount || 0,
      sentiment,
      reasoning: analysis.reasoning || "",
    };
  } catch (error: any) {
    console.error("Error analyzing image:", error);
    throw new Error(`Failed to analyze image: ${error.message}`);
  }
}

/**
 * Analyzes a PDF file using OpenAI API to determine priority
 * based on keyword spotting and sentiment detection
 * 
 * @deprecated Use analyzeImageWithOpenAI instead for better performance with JPG/PNG images
 * @param file - The PDF file to analyze
 * @param apiKey - Optional API key. If not provided, will use VITE_OPENAI_API_KEY from env
 * @returns Analysis result with priority, keywords count, sentiment, and reasoning
 */
export async function analyzePDFWithOpenAI(
  file: File,
  apiKey?: string
): Promise<PDFAnalysisResult> {
  // Use provided API key or get from environment
  const openAIApiKey = apiKey || getOpenAIApiKey();
  // Convert PDF to base64
  const base64 = await fileToBase64(file);

  // Prepare the prompt for OpenAI
  const prompt = `Analyze this PDF document and determine its priority level (low, medium, or high) based on:
1. Keyword spotting: Count relevant business keywords (deals, contracts, proposals, meetings, opportunities, revenue, price, quantity, etc.)
2. Sentiment detection: Analyze the overall sentiment (low, mid, high)

Return a JSON object with:
- priority: "low", "medium", or "high"
- keywordsCount: number of relevant keywords found
- sentiment: "low", "mid", or "high"
- reasoning: brief explanation

Priority rules:
- No keywords or low sentiment: low priority
- Some keywords (1-5) or mid sentiment: medium priority
- Many keywords (6+) or high sentiment: high priority

Return ONLY valid JSON, no other text.`;

  try {
    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o", // or "gpt-4-turbo" for better PDF handling
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to analyze PDF");
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse JSON response
    const analysis = JSON.parse(content) as {
      priority: string;
      keywordsCount: number;
      sentiment: string;
      reasoning: string;
    };

    // Validate and normalize priority
    const priority = normalizePriority(analysis.priority);
    const sentiment = normalizeSentiment(analysis.sentiment);

    return {
      priority,
      keywordsCount: analysis.keywordsCount || 0,
      sentiment,
      reasoning: analysis.reasoning || "",
    };
  } catch (error: any) {
    console.error("Error analyzing PDF:", error);
    throw new Error(`Failed to analyze PDF: ${error.message}`);
  }
}

/**
 * Converts a File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix if present
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Normalizes priority string to PriorityLevel
 */
function normalizePriority(priority: string): PriorityLevel {
  const normalized = priority.toLowerCase().trim();
  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized as PriorityLevel;
  }
  return "medium"; // Default
}

/**
 * Normalizes sentiment string
 */
function normalizeSentiment(sentiment: string): "low" | "mid" | "high" {
  const normalized = sentiment.toLowerCase().trim();
  if (normalized === "low" || normalized === "mid" || normalized === "medium" || normalized === "high") {
    if (normalized === "medium") return "mid";
    return normalized as "low" | "mid" | "high";
  }
  return "mid"; // Default
}

/**
 * Alternative: Use OpenAI's vision API with PDF text extraction
 * This is a fallback if the image approach doesn't work
 * 
 * @param text - The extracted text from the PDF
 * @param apiKey - Optional API key. If not provided, will use VITE_OPENAI_API_KEY from env
 * @returns Analysis result with priority, keywords count, sentiment, and reasoning
 */
export async function analyzePDFTextWithOpenAI(
  text: string,
  apiKey?: string
): Promise<PDFAnalysisResult> {
  // Use provided API key or get from environment
  const openAIApiKey = apiKey || getOpenAIApiKey();
  const prompt = `Analyze this document text and determine its priority level (low, medium, or high) based on:
1. Keyword spotting: Count relevant business keywords (deals, contracts, proposals, meetings, opportunities, revenue, etc.)
2. Sentiment detection: Analyze the overall sentiment (low, mid, high)

Return a JSON object with:
- priority: "low", "medium", or "high"
- keywordsCount: number of relevant keywords found
- sentiment: "low", "mid", or "high"
- reasoning: brief explanation

Priority rules:
- No keywords or low sentiment: low priority
- Some keywords (1-5) or mid sentiment: medium priority
- Many keywords (6+) or high sentiment: high priority

Document text:
${text.substring(0, 4000)} // Limit to avoid token limits

Return ONLY valid JSON, no other text.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to analyze PDF text");
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const analysis = JSON.parse(content) as {
      priority: string;
      keywordsCount: number;
      sentiment: string;
      reasoning: string;
    };

    return {
      priority: normalizePriority(analysis.priority),
      keywordsCount: analysis.keywordsCount || 0,
      sentiment: normalizeSentiment(analysis.sentiment),
      reasoning: analysis.reasoning || "",
    };
  } catch (error: any) {
    console.error("Error analyzing PDF text:", error);
    throw new Error(`Failed to analyze PDF text: ${error.message}`);
  }
}
