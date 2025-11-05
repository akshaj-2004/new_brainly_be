import { z } from "zod"

export const SignupSchema = z.object({
  username: z.string().email("Invalid email format"),
  password: z.string().min(3, "Password must be at least 3 characters long"),
});

export const SigninSchema = z.object({
  username: z.string().email("Invalid email format"),
  password: z.string().min(3, "Password must be at least 3 characters long"),
});

export const TagSchema = z.object({
  title: z.string().min(1, "Tag title is required"),
});

export const CreateLinkSchema = z.object({
  hash: z.string().min(1, "Hash is required"),
  userId: z.number(),
});

export const ContentSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, "Title is required"),
  link: z.string().min(1, "Link is necessary"),
  type: z.enum(["Audio", "Video", "Image", "Article"]),
  tags: z.array(z.string()).optional(),
  description: z.string().max(100, "Description must be less than 100 characters"),
});

export type ContentType = z.infer<typeof ContentSchema>
export type TagType = z.infer<typeof TagSchema>