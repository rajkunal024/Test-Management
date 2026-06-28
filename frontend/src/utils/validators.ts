import { z } from "zod";

export const loginSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  password: z.string().min(1, "Password is required"),
});

const numericRequired = (label: string) =>
  z.coerce.number({ invalid_type_error: `${label} is required` });

export const testSchema = z.object({
  name: z.string().min(1, "Test name is required"),
  subject: z.array(z.string()).min(1, "Select at least one subject"),
  type: z.enum(["practice", "mock", "previous_year"]),
  class: z.string().min(1, "Class is required"),
  topics: z.array(z.string()).min(1, "Select at least one topic"),
  sub_topics: z.array(z.string()).default([]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  correct_marks: numericRequired("Correct marks"),
  wrong_marks: numericRequired("Wrong marks"),
  unattempt_marks: numericRequired("Unattempted marks"),
  total_time: numericRequired("Duration").positive("Duration must be greater than 0"),
  lateEntryTime: z.coerce.number().nonnegative("Late entry time must be 0 or positive").default(0),
  graceTime: z.coerce.number().nonnegative("Grace time must be 0 or positive").default(0),
  tabSwitchLimit: z.coerce.number().nonnegative("Tab switching limit must be 0 or positive").default(0),
  total_marks: numericRequired("Total marks").positive("Total marks must be greater than 0"),
  total_questions: numericRequired("Total questions").int().positive("Total questions must be greater than 0"),
  start_time: z.string().min(1, "Start time slot is required"),
  end_time: z.string().min(1, "End time slot is required"),
  sections: z.array(z.object({
    name: z.string().min(1, "Section name is required"),
    subject: z.string().min(1, "Subject is required"),
    duration: z.coerce.number().positive("Duration must be greater than 0"),
    questions_count: z.coerce.number().int().positive("Questions count must be greater than 0")
  })).optional(),
}).refine((data) => {
  if (data.start_time) {
    const now = new Date().getTime();
    const start = new Date(data.start_time).getTime();
    // Allow a 15-minute buffer for form filling time latency
    return start >= now - 15 * 60 * 1000;
  }
  return true;
}, {
  message: "Start time slot cannot be in the past",
  path: ["start_time"],
}).refine((data) => {
  if (data.start_time && data.end_time) {
    const start = new Date(data.start_time).getTime();
    const end = new Date(data.end_time).getTime();
    return end >= start;
  }
  return true;
}, {
  message: "End time slot cannot be earlier than start time slot",
  path: ["end_time"],
}).refine((data) => {
  if (data.start_time && data.end_time) {
    const start = new Date(data.start_time).getTime();
    const end = new Date(data.end_time).getTime();
    const slotMins = Math.floor((end - start) / (60 * 1000));
    return Number(data.total_time) <= slotMins;
  }
  return true;
}, {
  message: "Test duration cannot be greater than the schedule time slot duration",
  path: ["total_time"],
}).refine((data) => {
  if (data.sections && data.sections.length > 0 && data.start_time && data.end_time) {
    const start = new Date(data.start_time).getTime();
    const end = new Date(data.end_time).getTime();
    const slotMins = Math.floor((end - start) / (60 * 1000));
    const sumDurations = data.sections.reduce((acc, sec) => acc + Number(sec.duration || 0), 0);
    return sumDurations <= slotMins;
  }
  return true;
}, {
  message: "The sum of section durations cannot be greater than the schedule time slot duration",
  path: ["total_time"],
}).refine((data) => {
  if (data.sections && data.sections.length > 0) {
    const sumDurations = data.sections.reduce((acc, sec) => acc + Number(sec.duration || 0), 0);
    return sumDurations === Number(data.total_time);
  }
  return true;
}, {
  message: "The sum of section durations must equal the total test time",
  path: ["total_time"],
}).refine((data) => {
  if (data.sections && data.sections.length > 0) {
    const sumQuestions = data.sections.reduce((acc, sec) => acc + Number(sec.questions_count || 0), 0);
    return sumQuestions === Number(data.total_questions);
  }
  return true;
}, {
  message: "The sum of section question counts must equal the total questions target",
  path: ["total_questions"],
}).superRefine((data, ctx) => {
  if (data.sections && data.sections.length > 0 && data.start_time && data.end_time) {
    const start = new Date(data.start_time).getTime();
    const end = new Date(data.end_time).getTime();
    const slotMins = Math.floor((end - start) / (60 * 1000));
    data.sections.forEach((sec, idx) => {
      const secDuration = Number(sec.duration || 0);
      if (secDuration > slotMins) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Section duration (${secDuration} mins) cannot be greater than the schedule time slot (${slotMins} mins)`,
          path: ["sections", idx, "duration"]
        });
      }
    });
  }
});

export const questionSchema = z.object({
  type: z.enum(["mcq", "passage_sub_question"]).default("mcq").optional(),
  passage_id: z.string().optional(),
  passage_title: z.string().optional(),
  passage_content: z.string().optional(),
  question: z.string().optional(),
  option1: z.string().optional(),
  option2: z.string().optional(),
  option3: z.string().optional(),
  option4: z.string().optional(),
  correct_option: z.string().optional(),
  difficulty: z.string().optional(),
  topic_id: z.string().optional(),
  sub_topic_id: z.string().optional(),
  new_topic_name: z.string().optional(),
  new_sub_topic_name: z.string().optional(),
  media_url: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
  image_url: z.string().or(z.literal("")).optional(),
  class: z.string().min(1, "Class is required"),
}).superRefine((data, ctx) => {
  if (data.type !== "passage_sub_question") {
    if (!data.question || data.question.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Question is required", path: ["question"] });
    }
    if (!data.option1 || data.option1.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Option 1 is required", path: ["option1"] });
    }
    if (!data.option2 || data.option2.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Option 2 is required", path: ["option2"] });
    }
    if (!data.option3 || data.option3.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Option 3 is required", path: ["option3"] });
    }
    if (!data.option4 || data.option4.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Option 4 is required", path: ["option4"] });
    }
    if (!data.correct_option) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Correct option is required", path: ["correct_option"] });
    }
  }
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type TestFormInput = z.input<typeof testSchema>;
export type TestFormValues = z.infer<typeof testSchema>;
export type QuestionFormValues = z.infer<typeof questionSchema>;
