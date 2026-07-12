import { z } from 'zod'

export const testSchema = z.object({
  name: z.string().min(1, { message: 'Test Name is required' }).max(100, { message: 'Test Name must be under 100 characters' }),
  type: z.string().min(1, { message: 'Test Type is required' }),
  subject: z.string().min(1, { message: 'Subject is required' }),
  topics: z.array(z.string()).min(1, { message: 'At least one topic must be selected' }),
  sub_topics: z.array(z.string()).optional().default([]),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  correct_marks: z.coerce.number().min(0, { message: 'Correct marks must be a non-negative number' }),
  wrong_marks: z.coerce.number().max(0, { message: 'Wrong marks must be less than or equal to 0' }),
  unattempt_marks: z.coerce.number().default(0),
  total_time: z.coerce.number().min(1, { message: 'Total time must be at least 1 minute' }),
  total_marks: z.coerce.number().min(1, { message: 'Total marks must be greater than 0' }),
  total_questions: z.coerce.number().min(1, { message: 'Total questions must be at least 1' }),
})

export type TestFormValues = z.infer<typeof testSchema>
