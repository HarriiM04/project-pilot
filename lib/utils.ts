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

export interface AgencyDetails {
  logo: string
  name: string
  email?: string
}

export function parseAgencyDetails(profile?: { full_name?: string | null; avatar_url?: string | null } | null): AgencyDetails | null {
  if (!profile) return null
  const logo = profile.avatar_url || ''
  if (!logo) return null

  try {
    if (profile.full_name && (profile.full_name.startsWith('{') || profile.full_name.startsWith('['))) {
      const parsed = JSON.parse(profile.full_name)
      if (parsed && parsed.agencyName) {
        return {
          logo,
          name: parsed.agencyName,
          email: parsed.agencyEmail || undefined,
        }
      }
    }
  } catch (e) {
    // fallback
  }

  if (profile.full_name) {
    return {
      logo,
      name: profile.full_name,
    }
  }

  return null
}
