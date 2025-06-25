import { z } from "zod";

export interface Message {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export interface User {
  id: number;
  username: string;
  walletAddress?: string;
}

export const insertMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

export const insertUserSchema = z.object({
  username: z.string(),
  walletAddress: z.string().optional(),
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
