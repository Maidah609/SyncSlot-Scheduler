import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  // Write-permission check: temporary comment added by Codex.
  return twMerge(clsx(inputs));
}
