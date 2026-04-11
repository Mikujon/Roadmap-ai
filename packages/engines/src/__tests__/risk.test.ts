import {
  scoreRisk,
  classifyRiskScore,
  countRisksBySeverity,
  sortRisksByScore,
  hasUnacceptableRisk,
} from "../risk.js";

describe("scoreRisk", () => {
  test("5×5 = 25 is CRITICAL", () => {
    const r = scoreRisk({ probability: 5, impact: 5, status: "OPEN" });
    expect(r.score).toBe(25);
    expect(r.severity).toBe("CRITICAL");
  });

  test("2×4 = 8 is HIGH", () => {
    const r = scoreRisk({ probability: 2, impact: 4, status: "OPEN" });
    expect(r.score).toBe(8);
    expect(r.severity).toBe("HIGH");
  });

  test("2×2 = 4 is MEDIUM", () => {
    const r = scoreRisk({ probability: 2, impact: 2, status: "OPEN" });
    expect(r.score).toBe(4);
    expect(r.severity).toBe("MEDIUM");
  });

  test("1×2 = 2 is LOW", () => {
    const r = scoreRisk({ probability: 1, impact: 2, status: "OPEN" });
    expect(r.score).toBe(2);
    expect(r.severity).toBe("LOW");
  });
});

describe("classifyRiskScore", () => {
  test.each([
    [15, "CRITICAL"],
    [20, "CRITICAL"],
    [8,  "HIGH"],
    [14, "HIGH"],
    [4,  "MEDIUM"],
    [7,  "MEDIUM"],
    [1,  "LOW"],
    [3,  "LOW"],
  ])("score %i → %s", (score, expected) => {
    expect(classifyRiskScore(score).severity).toBe(expected);
  });
});

describe("sortRisksByScore", () => {
  test("sorts descending by P×I", () => {
    const risks = [
      { probability: 1, impact: 2, status: "OPEN" },
      { probability: 5, impact: 5, status: "OPEN" },
      { probability: 3, impact: 3, status: "OPEN" },
    ];
    const sorted = sortRisksByScore(risks);
    expect(sorted[0]!.probability * sorted[0]!.impact).toBe(25);
    expect(sorted[1]!.probability * sorted[1]!.impact).toBe(9);
    expect(sorted[2]!.probability * sorted[2]!.impact).toBe(2);
  });

  test("does not mutate original array", () => {
    const original = [
      { probability: 1, impact: 1, status: "OPEN" },
      { probability: 5, impact: 5, status: "OPEN" },
    ];
    sortRisksByScore(original);
    expect(original[0]!.probability).toBe(1);
  });
});

describe("countRisksBySeverity", () => {
  const risks = [
    { probability: 5, impact: 5, status: "OPEN" },      // CRITICAL
    { probability: 3, impact: 3, status: "OPEN" },      // MEDIUM (9... actually HIGH >= 8)
    { probability: 1, impact: 2, status: "OPEN" },      // LOW
    { probability: 5, impact: 3, status: "MITIGATED" }, // MITIGATED
  ];

  test("counts open risks correctly", () => {
    const counts = countRisksBySeverity(risks);
    expect(counts.openTotal).toBe(3);
    expect(counts.mitigated).toBe(1);
    expect(counts.critical).toBe(1);
  });

  test("maxScore is highest open P×I", () => {
    const counts = countRisksBySeverity(risks);
    expect(counts.maxScore).toBe(25);
  });
});

describe("hasUnacceptableRisk", () => {
  test("returns true when open risk P×I >= 9", () => {
    const risks = [{ probability: 3, impact: 3, status: "OPEN" }];
    expect(hasUnacceptableRisk(risks)).toBe(true);
  });

  test("returns false when no open risk >= 9", () => {
    const risks = [
      { probability: 2, impact: 2, status: "OPEN" },
      { probability: 5, impact: 5, status: "MITIGATED" },
    ];
    expect(hasUnacceptableRisk(risks)).toBe(false);
  });
});
