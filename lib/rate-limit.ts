const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(userId: string, limit: number, windowMs: number = 60000): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(userId)
  
  if (!record || record.resetAt < now) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs })
    return true
  }
  
  if (record.count >= limit) {
    return false
  }
  
  record.count++
  return true
}
