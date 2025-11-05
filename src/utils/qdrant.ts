import { QdrantClient } from "@qdrant/js-client-rest";
import { getEmbed } from "./getEmbed.js";
import { getPayload } from "./getPayload.js";
import type { ContentType } from "../zod/index.js";

const QDRANT_URL = process.env.QDRANT_URL || "";
const QDRANT_API = process.env.QDRANT_API || "";

const client = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API,
});

const COLLECTION = "second_brain";

export const createCollection = async (): Promise<void> => {
  try {
    const existing = await client.getCollections();
    const exists = existing.collections.some((c) => c.name === COLLECTION);

    if (!exists) {
      await client.createCollection(COLLECTION, {
        vectors: {
          size: 1024,
          distance: "Cosine",
        },
      });
      console.log("Collection created:", COLLECTION);
    } else {
      console.log("Collection already exists:", COLLECTION);
    }
  } catch (err) {
    console.error("Error creating collection:", err);
  }
};

export const upsert = async (data: ContentType): Promise<number | null> => {
  try {
    if (!data.id) throw new Error("Content ID is required for upsert.");

    const embeddings = await getEmbed(data);
    if (!embeddings || embeddings.length !== 1024)
      throw new Error("Invalid embedding length");

    const payload = getPayload(data);

    await client.upsert(COLLECTION, {
      wait: true,
      points: [
        {
          id: data.id,
          vector: embeddings,
          payload,
        },
      ],
    });

    console.log("Qdrant upsert successful:", data.id);
    return data.id;
  } catch (e: any) {
    console.error("Error upserting point:", e.message);
    return null;
  }
};

export const searchQuery = async (
  query: string
): Promise<{ id: number; score: number; payload: any }[]> => {
  try {
    const queryVector = await getEmbed(query);
    const res = await client.search(COLLECTION, {
      vector: queryVector,
      limit: 3,
    });

    return res.map((item) => ({
      id: item.id as number,
      score: item.score,
      payload: item.payload,
    }));
  } catch (e: any) {
    console.error("Error in searchQuery:", e.message);
    return [];
  }
};

export const searchDocument = async (
  doc: ContentType
): Promise<{ id: number; score: number; payload: any }[]> => {
  try {
    const docVector = await getEmbed(doc);
    const res = await client.search(COLLECTION, {
      vector: docVector,
      limit: 3,
    });

    return res.map((item) => ({
      id: item.id as number,
      score: item.score,
      payload: item.payload,
    }));
  } catch (e: any) {
    console.error("Error in searchDocument:", e.message);
    return [];
  }
};

export const deletePoint = async (contentId: number): Promise<void> => {
  try {
    await client.delete(COLLECTION, { points: [contentId] });
    console.log("Deleted Qdrant point:", contentId);
  } catch (error: any) {
    console.error("Error deleting point:", error.message);
  }
};
