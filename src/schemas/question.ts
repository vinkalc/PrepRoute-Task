import { z } from 'zod'

export const questionSchema = z.object({
  question: z.string().min(1, { message: 'Question text is required' }),
  option1: z.string().min(1, { message: 'Option 1 is required' }),
  option2: z.string().min(1, { message: 'Option 2 is required' }),
  option3: z.string().min(1, { message: 'Option 3 is required' }),
  option4: z.string().min(1, { message: 'Option 4 is required' }),
  correct_option: z.enum(['option1', 'option2', 'option3', 'option4']),
  explanation: z.string().default(''),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  topic_id: z.string().default(''),
  sub_topic_id: z.string().default(''),
  media_url: z.string().refine(
    (val) => val === '' || /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(val),
    { message: 'Invalid URL format' }
  ).default(''),
})

export type QuestionFormValues = z.infer<typeof questionSchema>
