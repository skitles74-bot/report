import { z } from "zod";

export const reportRequestSchema = z.object({
  keyword: z
    .string()
    .trim()
    .min(1, "키워드를 입력해 주세요.")
    .max(50, "키워드는 50자 이내로 입력해 주세요."),
  email: z.string().trim().email("올바른 이메일 주소를 입력해 주세요."),
});

export type ReportRequest = z.infer<typeof reportRequestSchema>;
