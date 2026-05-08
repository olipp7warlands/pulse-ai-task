import { z } from 'zod'

export const AgentInputSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(20).optional().default([]),
})

export const AgentOutputSchema = z.object({
  action: z.string().nullable(),
  params: z.record(z.string(), z.unknown()),
  message: z.string(),
})

const PriorityEnum = z.enum(['low', 'medium', 'high'])

export const AudioAnalysisSchema = z.object({
  transcript: z.string(),
  summary: z.string().max(500),
  suggested_tasks: z.array(z.object({
    title: z.string().min(1).max(500),
    priority: PriorityEnum.optional().default('medium'),
    project_hint: z.string().optional(),
  })).max(5).optional().default([]),
})
