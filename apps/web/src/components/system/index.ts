/**
 * Design system primitives — barrel export.
 *
 * Importers do `import { Mascot, StreakFlame, MugaCard } from
 * "@/components/system"` and never need to know the file layout.
 *
 * Per SP7 Phase A T-A4.
 */

export { Mascot } from "./Mascot";
export { StreakFlame } from "./StreakFlame";
export { MugaCard } from "./MugaCard";

// Playful-Bento primitives (SP13 PR-1)
export { ChunkCard } from "./ChunkCard";
export { BentoButton } from "./BentoButton";
export { RainbowRing } from "./RainbowRing";
export { StatChip } from "./StatChip";
