import { z } from 'zod'

export const loginSchema = z.object({
  userId: z.string().min(1, { message: 'Username / User ID is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
})

export type LoginFormValues = z.infer<typeof loginSchema>
