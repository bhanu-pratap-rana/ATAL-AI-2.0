/**
 * Smoke test for shared motion variants.
 *
 * The variants module is the single source of truth for spring timing
 * across the design system. If any export is renamed or dropped, every
 * consumer breaks at runtime — so we lock down the shape here.
 */

import {
  fadeInUp,
  stagger,
  muga,
  brahmaputra,
  pop,
  bob,
} from "@/lib/motion";

describe("motion variants", () => {
  it("fadeInUp has hidden + visible states", () => {
    expect(fadeInUp).toHaveProperty("hidden");
    expect(fadeInUp).toHaveProperty("visible");
  });

  it("stagger has hidden + visible states", () => {
    expect(stagger).toHaveProperty("hidden");
    expect(stagger).toHaveProperty("visible");
  });

  it("pop has hidden + visible states", () => {
    expect(pop).toHaveProperty("hidden");
    expect(pop).toHaveProperty("visible");
  });

  it("muga has rest + shimmer states (continuous loop)", () => {
    expect(muga).toHaveProperty("rest");
    expect(muga).toHaveProperty("shimmer");
  });

  it("brahmaputra has a flow state (continuous loop)", () => {
    expect(brahmaputra).toHaveProperty("flow");
  });

  it("bob has an idle state (mascot animation)", () => {
    expect(bob).toHaveProperty("idle");
  });
});
