import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name?: string, email?: string): string {
  if (name && name.includes(' ')) {
    const parts = name.split(' ')
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  if (name && name.length >= 2) {
    return name.slice(0, 2).toUpperCase()
  }
  if (email && email.length >= 2) {
    return email.slice(0, 2).toUpperCase()
  }
  return 'ME'
}
