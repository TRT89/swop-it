import { beforeEach, describe, expect, it } from "vitest";
import { PointsError, creditPoints, getWalletSummary } from "@/lib/points";
import { balanceOf, makeUser, resetDatabase } from "./helpers";

describe("Social Point ledger", () => {
  beforeEach(resetDatabase);

  it("gives new members the 50 SP welcome bonus and keeps balance equal to the ledger", async () => {
    const userId = await makeUser("Anna");
    const { balance, ledger } = await balanceOf(userId);

    expect(balance).toBe(50);
    expect(ledger).toBe(50);
  });

  it("moves the balance and writes a ledger row together", async () => {
    const userId = await makeUser("Anna");

    await creditPoints({
      userId,
      type: "BONUS",
      amount: 25,
      description: "Community bonus",
    });

    const { balance, ledger } = await balanceOf(userId);
    expect(balance).toBe(75);
    expect(ledger).toBe(75);
  });

  it("refuses to push a wallet below zero", async () => {
    const userId = await makeUser("Anna", 10);

    await expect(
      creditPoints({
        userId,
        type: "SWAP_SPENT",
        amount: -11,
        description: "Too expensive",
      }),
    ).rejects.toThrow();

    // The failed attempt must leave nothing behind.
    const { balance, ledger } = await balanceOf(userId);
    expect(balance).toBe(10);
    expect(ledger).toBe(10);
  });

  it("rejects zero and fractional amounts", async () => {
    const userId = await makeUser("Anna");

    await expect(
      creditPoints({ userId, type: "BONUS", amount: 0, description: "Nothing" }),
    ).rejects.toBeInstanceOf(PointsError);

    await expect(
      creditPoints({ userId, type: "BONUS", amount: 2.5, description: "Half" }),
    ).rejects.toBeInstanceOf(PointsError);
  });

  it("summarises earned and spent separately from the balance", async () => {
    const userId = await makeUser("Anna");
    await creditPoints({ userId, type: "BONUS", amount: 30, description: "Bonus" });
    await creditPoints({
      userId,
      type: "SWAP_SPENT",
      amount: -20,
      description: "Drill",
    });

    const summary = await getWalletSummary(userId);
    expect(summary.balance).toBe(60);
    expect(summary.earned).toBe(80);
    expect(summary.spent).toBe(-20);
  });
});
