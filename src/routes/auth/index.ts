import express, { application } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { SigninSchema, SignupSchema } from "../../zod/index.js";


const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "";


router.post("/signup", async (req, res) => {
    const result = SignupSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            message: "Invalid input data",
            errors: result.error,
        });
    }

    const { username, password } = result.data;

    try {
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            return res.status(409).json({
                message: "Username already taken",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: { username, password: hashedPassword },
        });

        return res.status(201).json({
            message: "User created successfully",
        });
    } catch (error) {
        console.error("Signup Error:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

router.post("/signin", async (req, res) => {
    const result = SigninSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            message: "Invalid input data",
            errors: result.error
        });
    }

    const { username, password } = result.data;

    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        const token = jwt.sign(
            { userId: user.id },
            JWT_SECRET
        );

        return res.status(200).json({
            message: "Signin successful",
            token,
            user: {
                id: user.id,
                username: user.username,
            },
        });
    } catch (error) {
        console.error("Signin Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
