import { z } from "zod";

export const loginSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  password: z.string().min(1, "Password is required"),
});

const numericRequired = (label: string) =>
  z.coerce.number({ invalid_type_error: `${label} is required` });

export const testSchema = z.object({
  name: z.string().min(1, "Test name is required"),
  subject: z.string().min(1, "Subject is required"),
  type: z.enum(["practice", "mock", "previous_year"]),
  topics: z.array(z.string()).min(1, "Select at least one topic"),
  sub_topics: z.array(z.string()).default([]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  correct_marks: numericRequired("Correct marks"),
  wrong_marks: numericRequired("Wrong marks"),
  unattempt_marks: numericRequired("Unattempted marks"),
  total_time: numericRequired("Duration").positive("Duration must be greater than 0"),
  total_marks: numericRequired("Total marks").positive("Total marks must be greater than 0"),
  total_questions: numericRequired("Total questions").int().positive("Total questions must be greater than 0"),
});

export const questionSchema = z.object({
  question: z.string().min(1, "Question is required"),
  option1: z.string().min(1, "Option 1 is required"),
  option2: z.string().min(1, "Option 2 is required"),
  option3: z.string().min(1, "Option 3 is required"),
  option4: z.string().min(1, "Option 4 is required"),
  correct_option: z.enum(["option1", "option2", "option3", "option4"]),
  explanation: z.string().optional(),
  difficulty: z.string().optional(),
  topic_id: z.string().optional(),
  sub_topic_id: z.string().optional(),
  media_url: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type TestFormInput = z.input<typeof testSchema>;
export type TestFormValues = z.infer<typeof testSchema>;
export type QuestionFormValues = z.infer<typeof questionSchema>;
