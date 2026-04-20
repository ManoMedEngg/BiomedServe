import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const fetchICDescription = async (icNumber: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a detailed pin description and functional overview for the integrated circuit (IC) part number: ${icNumber}. 
      As a technical expert, provide the most accurate information available up to April 2026.
      Include:
      1. Pins and their functions (Full pinout table).
      2. Manufacturer (if known).
      3. Typical applications.
      4. Standard package information (e.g. DIP, SOIC, TO-220).
      Format the response clearly in Markdown with headings and tables.`,
      config: {
        systemInstruction: "You are an expert electronics engineer providing datasheet-style pin descriptions for ICs. Be precise and include technical specifications where possible.",
      }
    });

    return response.text;
  } catch (error) {
    console.error("Error fetching IC description:", error);
    throw error;
  }
};
