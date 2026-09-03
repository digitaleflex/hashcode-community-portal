import { z } from 'zod'

export const CreateMemberSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  age: z.number().int().min(16).max(99).optional(),
  phone: z.string().max(30).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  status: z.enum(['imported', 'claimed', 'verified', 'updated', 'active', 'inactive']).optional(),
})

export const UpdateMemberSchema = z.object({
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
  age: z.number().int().min(16).max(99).optional().nullable(),
  gender: z.string().max(30).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  status: z.enum(['imported', 'claimed', 'verified', 'updated', 'active', 'inactive']).optional(),
})

export type CreateMemberInput = z.infer<typeof CreateMemberSchema>
export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>
