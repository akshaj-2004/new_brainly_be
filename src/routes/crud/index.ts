import express from "express";

import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { ContentSchema } from "../../zod/index.js";
import { getEmbed } from "../../utils/getEmbed.js";
import { getPayload } from "../../utils/getPayload.js";
import { deletePoint, searchQuery, upsert } from "../../utils/qdrant.js";


const prisma = new PrismaClient()
const router = express.Router();

router.post("/content", authMiddleware, async (req, res) => {
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const result = ContentSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({
            error: "Invalid input",
            details: result.error,
        });
    }

    const { title, link, type, tags, description} = result.data;

    try {
        const createdLink = await prisma.link.create({
            data: {
                hash: link,
                userId,
            },
        });

        const uniqueTags = [...new Set(tags?.map((t) => t.trim().toLowerCase()))]
        const existingTags = await prisma.tag.findMany({
            where: {
                title: { in: uniqueTags }
            }
        })
        const existingTagTitles = existingTags.map((t) => t.title)
        const newTagTitles = uniqueTags.filter((t) => !existingTagTitles.includes(t))

        const createdTags = await Promise.all(
            newTagTitles.map((title) => prisma.tag.create({ data: { title } }))
        );

        const allTags = [...existingTags, ...createdTags];
        const connectTags = allTags.map((t) => ({ id: t.id }));

        const createdContent = await prisma.content.create({
            data: {
                title,
                type,
                userId,
                linkId: createdLink.id,
                description,
                tags: {
                    connect: connectTags,
                },
            },
            include: {
                link: true,
                user: true,
                tags: true,
            },
        });

        const vector = await getEmbed({
            id: createdContent.id,
            title: createdContent.title,
            tags: createdContent.tags.map((t) => t.title),
            type: createdContent.type,
            link: createdContent.link.hash,
            description: createdContent.description
        });

        const payload = getPayload({
            id: createdContent.id,
            title: createdContent.title,
            tags: createdContent.tags.map((t) => t.title),
            type: createdContent.type,
            link: createdContent.link.hash,
            description: createdContent.description
        });

        await upsert({
            id: createdContent.id,
            title: createdContent.title,
            tags: createdContent.tags.map((t) => t.title),
            type: createdContent.type,
            link: createdContent.link.hash,
            description: createdContent.description
        });

        return res.status(201).json({
            message: "Content created successfully",
            content: createdContent,
        });
    } catch (e: any) {
        console.error(e);
        return res.status(500).json({
            error: "Internal server error",
            details: e.message,
        });
    }
});

router.get('/content', authMiddleware, async (req, res) => {
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized: Missing user ID" });
    }

    try {
        const content = await prisma.content.findMany({
            where: { userId },
            include: {
                user: true,
                link: true,
                tags: true,
            },
            orderBy: { id: 'desc' }
        });

        if (!content || content.length === 0) {
            return res.status(404).json({ message: "No content found for this user." });
        }

        return res.status(200).json({
            success: true,
            count: content.length,
            data: content,
        });

    } catch (error) {
        console.error("Error fetching content:", error);

        return res.status(500).json({
            error: "Internal Server Error",
            details: error
        });
    }
});

router.delete('/content/:id', authMiddleware, async (req, res) => {
    const userId = req.userId;
    if (!req.params.id) {
        return res.status(401).json({ error: "Please specify content id" })
    }
    const contentId = parseInt(req.params.id);

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const content = await prisma.content.findUnique({
            where: { id: contentId },
            include: { link: true, tags: true },
        });

        if (!content || content.userId !== userId) {
            return res.status(404).json({ error: "Content not found or access denied" });
        }

        await deletePoint(contentId)

        await prisma.content.delete({
            where: { id: contentId },
        });

        const linkUsedElsewhere = await prisma.content.findFirst({
            where: { linkId: content.linkId },
        });

        if (!linkUsedElsewhere) {
            await prisma.link.delete({
                where: { id: content.linkId },
            });
        }

        return res.status(200).json({ message: "Content deleted successfully" });

    } catch (error) {
        console.error("Error deleting content:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            details: error
        });
    }
});

router.post("/search", authMiddleware, async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { query } = req.body;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Invalid or missing query" });
  }

  try {
    const searchResults = await searchQuery(query);
    const matchedIds = searchResults.map((r) => r.id);

    const matchedContents = await prisma.content.findMany({
      where: { id: { in: matchedIds }, userId },
      include: { link: true, tags: true },
    });

    const rankedResults = matchedContents.sort((a, b) => {
      const scoreA = searchResults.find((r) => r.id === a.id)?.score ?? 0;
      const scoreB = searchResults.find((r) => r.id === b.id)?.score ?? 0;
      return scoreB - scoreA;
    });

    return res.status(200).json({
      success: true,
      query,
      results: rankedResults,
    });
  } catch (e: any) {
    console.error("Error in semantic search:", e);
    return res.status(500).json({
      error: "Internal Server Error",
      details: e.message || e,
    });
  }
});



router.post('/brain/share',  (req, res) => {
    
});

router.get('/brain/:shareLink', authMiddleware, (req, res) => {

});


export default router;
