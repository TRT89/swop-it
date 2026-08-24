"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  SwapError,
  cancelSwap,
  confirmCompletion,
  requestSwap,
  respondToSwap,
  startSwap,
} from "@/lib/swap-service";
import { swapRequestSchema } from "@/lib/validation";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { rateLimit } from "@/lib/rate-limit";

function fail(error: unknown): ActionState {
  if (error instanceof SwapError) return { error: error.message };
  throw error;
}

export async function requestSwapAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = swapRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  if (!rateLimit(`swap-request:${user.id}`, 20, 60 * 60 * 1000).ok) {
    return { error: "That is a lot of requests in one hour. Please slow down." };
  }

  let swapId: string;
  try {
    swapId = await requestSwap({
      actorId: user.id,
      listingId: parsed.data.listingId,
      note: parsed.data.note,
      scheduledFor: parsed.data.scheduledFor,
    });
  } catch (error) {
    return fail(error);
  }

  revalidatePath("/swaps");
  redirect(`/swaps/${swapId}`);
}

async function mutate(
  swapId: string,
  run: (actorId: string) => Promise<unknown>,
): Promise<ActionState> {
  const user = await requireUser();
  try {
    await run(user.id);
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/swaps");
  revalidatePath(`/swaps/${swapId}`);
  revalidatePath("/dashboard");
  revalidatePath("/wallet");
  return { success: "Done" };
}

export async function acceptSwapAction(_prev: ActionState, formData: FormData) {
  const swapId = String(formData.get("swapId"));
  return mutate(swapId, (actorId) =>
    respondToSwap({ actorId, swapId, decision: "ACCEPTED" }),
  );
}

export async function declineSwapAction(_prev: ActionState, formData: FormData) {
  const swapId = String(formData.get("swapId"));
  return mutate(swapId, (actorId) =>
    respondToSwap({ actorId, swapId, decision: "DECLINED" }),
  );
}

export async function startSwapAction(_prev: ActionState, formData: FormData) {
  const swapId = String(formData.get("swapId"));
  return mutate(swapId, (actorId) => startSwap({ actorId, swapId }));
}

export async function confirmCompletionAction(_prev: ActionState, formData: FormData) {
  const swapId = String(formData.get("swapId"));
  return mutate(swapId, (actorId) => confirmCompletion({ actorId, swapId }));
}

export async function cancelSwapAction(_prev: ActionState, formData: FormData) {
  const swapId = String(formData.get("swapId"));
  return mutate(swapId, (actorId) => cancelSwap({ actorId, swapId }));
}
