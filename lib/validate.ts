import { z } from "zod";

export const reportRequestSchema = z.object({
  keyword: z
    .string()
    .trim()
    .min(1, "키워드를 입력해 주세요.")
    .max(50, "키워드는 50자 이내로 입력해 주세요."),
  email: z.string().trim().email("올바른 이메일 주소를 입력해 주세요."),
});

export const subscribeRequestSchema = z.object({
  keyword: z
    .string()
    .trim()
    .min(1, "키워드를 입력해 주세요.")
    .max(50, "키워드는 50자 이내로 입력해 주세요."),
  email: z.string().trim().email("올바른 이메일 주소를 입력해 주세요."),
  schedule: z.enum(["daily", "weekly"], {
    errorMap: () => ({ message: "구독 주기를 선택해 주세요." }),
  }),
});

export const unsubscribeRequestSchema = z.object({
  keyword: z.string().trim().min(1),
  email: z.string().trim().email(),
});

export type ReportRequest = z.infer<typeof reportRequestSchema>;
export type SubscribeRequest = z.infer<typeof subscribeRequestSchema>;
export type UnsubscribeRequest = z.infer<typeof unsubscribeRequestSchema>;
