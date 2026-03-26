import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatLastName(name: string): string {
  if (!name) return '';
  return name.trim().toUpperCase();
}

export function formatFirstName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/(?:^|[\s-])[a-zà-öø-ÿ]/g, (match) => match.toUpperCase());
}
