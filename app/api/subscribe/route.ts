import { NextResponse } from "next/server";
import {
  deactivateSubscription,
  upsertSubscription,
} from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  subscribeRequestSchema,
  unsubscribeRequestSchema,
} from "@/lib/validate";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "요청 횟수 제한을 초과했습니다. 1시간 후 다시 시도해 주세요." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = subscribeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const { keyword, email, schedule } = parsed.data;
    const subscription = await upsertSubscription(email, keyword, schedule);

    return NextResponse.json({
      success: true,
      subscription: {
        keyword: subscription.keyword,
        schedule: subscription.schedule,
      },
    });
  } catch (err) {
    console.error("Subscribe failed:", err);
    const message =
      err instanceof Error ? err.message : "구독 등록 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const parsed = unsubscribeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const { keyword, email } = parsed.data;
    await deactivateSubscription(email, keyword);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unsubscribe failed:", err);
    const message =
      err instanceof Error ? err.message : "구독 해지 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
