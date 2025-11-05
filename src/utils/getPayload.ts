import type { ContentType } from "../zod/index.js";

export const getPayload = (data: ContentType) => {
  const { id, title, tags } = data;
  return { id, title, tags };
};
