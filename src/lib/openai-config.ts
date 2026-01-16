/**
 * OpenAI API Configuration
 * 
 * This module handles OpenAI API key management securely.
 * The API key should be stored in environment variables.
 */

/**
 * Gets the OpenAI API key from environment variables
 * @returns The API key or throws an error if not configured
 */
export function getOpenAIApiKey(): string {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file"
    );
  }

  if (apiKey.trim() === "") {
    throw new Error("OpenAI API key is empty. Please check your .env file");
  }

  return apiKey.trim();
}

/**
 * Checks if OpenAI API key is configured
 * @returns true if API key is available, false otherwise
 */
export function isOpenAIConfigured(): boolean {
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    return !!apiKey && apiKey.trim() !== "";
  } catch {
    return false;
  }
}
