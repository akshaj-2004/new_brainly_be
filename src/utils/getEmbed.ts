import type { ContentType } from "../zod/index.js";
import { cohere } from "./cohere.js";

export const getEmbed = async (
  data?: ContentType | string
): Promise<number[]> => {
  if (!data) {
    throw new Error("Invalid data: no content provided");
  }

  let combinedText: string;

  if (typeof data === "string") {
    combinedText = data.trim();
  } else {
    const title = data.title?.trim() || "";
    const description = data.description?.trim() || "";
    const tags = Array.isArray(data.tags) ? data.tags.join(", ") : "";

    // ✅ Build a natural descriptive sentence to improve semantic context
    combinedText = `Title: ${title}. Description: ${description}. Tags: ${tags}.`.trim();
  }

  try {
    const embed = await cohere.embed({
      model: "embed-english-v3.0",
      inputType: "search_document",
      embeddingTypes: ["float"],
      texts: [combinedText],
    });

    const vector = embed.embeddings.float?.[0];
    if (!vector) throw new Error("No embedding vector returned from Cohere");

    return vector;
  } catch (e: any) {
    console.error("Error generating embeddings:", e);
    throw new Error(`Error in getEmbed: ${e.message || e}`);
  }
};
