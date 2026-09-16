import { z } from 'zod';

export const registerSchema = z.object({
  // Unicode letters are allowed so Vietnamese usernames (e.g. "thư") work end to end.
  username: z.string().min(3).max(50).regex(/^[\p{L}\p{N}_]+$/u, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100)
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().min(1).optional(),
  displayName: z.string().min(1).max(100).optional(),
}).refine((d) => !d.confirmPassword || d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username or email is required").max(255).optional(),
  email: z.string().min(1).max(255).optional(),
  login: z.string().min(1).max(255).optional(),
  password: z.string().min(1, "Password is required"),
}).refine((d) => Boolean(d.username || d.email || d.login), {
  message: "Username or email is required",
  path: ["username"],
});
