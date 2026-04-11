import { calculateHealth } from "../health.js";
import type { HealthInput } from "@roadmap/core";

const now = new Date();
const past = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();
const future = (days: number) => new Date(now.getTime() + days * 86400000).toISOString();

// Healthy project: 30% elapsed, 35% done (ahead of schedule)
const base: HealthInput = {
  startDate:          past(30),
  endDate:            future(70),
  totalFeatures:      100,
  doneFeatures:       35,
  blockedFeatures:    0,
  inProgressFeatures: 5,
  totalSprints:       10,
  doneSprints:        3,
  activeSprints:      1,
  budgetTotal:        100_000,
  costActual:         28_000,
  costEstimated:      30_000,
  totalCapacityHours: 500,
  totalActualHours:   280,
  openRisks:          0,
  highRisks:          0,
  maxRiskScore:       0,
};

describe("calculateHealth", () => {
  test("returns healthScore in 0-100 range", () => {
    const r = calculateHealth(base);
    expect(r.healthScore).toBeGreaterThanOrEqual(0);
    expect(r.healthScore).toBeLessThanOrEqual(100);
  });

  test("healthy project is ON_TRACK", () => {
    const r = calculateHealth(base);
    expect(r.status).toBe("ON_TRACK");
    expect(r.healthScore).toBeGreaterThan(60);
  });

  test("overdue project is OFF_TRACK with capped health score", () => {
    const r = calculateHealth({
      ...base,
      startDate: past(90),
      endDate:   past(10), // overdue
      doneFeatures: 60,
    });
    expect(r.status).toBe("OFF_TRACK");
    expect(r.daysLeft).toBeLessThan(0);
    expect(r.healthScore).toBeLessThanOrEqual(45);
  });

  test("completed project returns COMPLETED status", () => {
    const r = calculateHealth({ ...base, doneFeatures: 100 });
    expect(r.status).toBe("COMPLETED");
    expect(r.progressNominal).toBe(100);
  });

  test("critical budget overrun caps healthScore at 40", () => {
    const r = calculateHealth({
      ...base,
      costActual: 85_000,  // way over budget on low progress
      doneFeatures: 30,
    });
    expect(r.healthScore).toBeLessThanOrEqual(60);
  });

  test("blocked features generate critical alert when >= 3", () => {
    const r = calculateHealth({ ...base, blockedFeatures: 5 });
    const alert = r.alerts.find(a => a.id === "blocked-critical");
    expect(alert).toBeDefined();
    expect(alert?.level).toBe("critical");
  });

  test("blocked features generate warning alert when < 3", () => {
    const r = calculateHealth({ ...base, blockedFeatures: 2 });
    const alert = r.alerts.find(a => a.id === "blocked-warning");
    expect(alert).toBeDefined();
    expect(alert?.level).toBe("warning");
  });

  test("healthy project returns success alert", () => {
    const r = calculateHealth(base);
    const alert = r.alerts.find(a => a.id === "healthy");
    expect(alert).toBeDefined();
    expect(alert?.level).toBe("success");
  });

  test("high risk generates warning alert", () => {
    const r = calculateHealth({ ...base, highRisks: 2, maxRiskScore: 12 });
    const alert = r.alerts.find(a => a.id === "high-risks");
    expect(alert).toBeDefined();
  });

  test("SPI is 1.0 when no budget data", () => {
    const r = calculateHealth({ ...base, budgetTotal: 0, costActual: 0 });
    expect(r.spi).toBeGreaterThan(0);
  });

  test("EVM invariants: EV = BAC * progress%", () => {
    const r = calculateHealth(base);
    const expectedEv = r.bac * (r.progressNominal / 100);
    expect(r.ev).toBeCloseTo(expectedEv, 1);
  });

  test("onTrackProbability is in 0-100 range", () => {
    const r = calculateHealth(base);
    expect(r.onTrackProbability).toBeGreaterThanOrEqual(0);
    expect(r.onTrackProbability).toBeLessThanOrEqual(100);
  });

  test("overloaded team generates warning", () => {
    const r = calculateHealth({
      ...base,
      totalCapacityHours: 100,
      totalActualHours:   120,
    });
    const alert = r.alerts.find(a => a.id === "overloaded");
    expect(alert).toBeDefined();
  });
});
