import { CohereClientV2 } from 'cohere-ai';
import dotenv from "dotenv"

dotenv.config();

const COHERE_API_KEY = process.env.COHERE_API_KEY || ""

export const cohere = new CohereClientV2({ token: COHERE_API_KEY });
