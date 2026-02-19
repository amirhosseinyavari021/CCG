// /home/cando/CCG/server/utils/env.js
import dotenv from "dotenv";

// Load .env reliably for ALL modules (PM2 doesn't load it by default)
dotenv.config({ path: process.env.DOTENV_PATH || "/home/cando/CCG/.env" });

// No exports needed. Side-effect only.
