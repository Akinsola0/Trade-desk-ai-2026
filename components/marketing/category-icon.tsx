import {
  Flame,
  Grid2x2,
  Hammer,
  HardHat,
  KeyRound,
  Layers,
  PaintRoller,
  Ruler,
  TreePine,
  WashingMachine,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** `MarketplaceCategory.icon` → the icon the grid renders. */
const icons: Record<string, LucideIcon> = {
  Wrench,
  Zap,
  Hammer,
  Ruler,
  PaintRoller,
  HardHat,
  Grid2x2,
  Layers,
  TreePine,
  KeyRound,
  Flame,
  WashingMachine,
};

export function CategoryIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = icons[name] ?? Wrench;
  return <Icon className={className} aria-hidden />;
}
