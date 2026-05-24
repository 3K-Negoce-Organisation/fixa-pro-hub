import { cn } from "@/lib/utils";
import { getBoxQuantityLabel } from "@/lib/boxQuantity";

interface BoxQuantityHintProps {
  boxQuantity?: number | null;
  variantTitle?: string | null;
  className?: string;
}

export function BoxQuantityHint({ boxQuantity, variantTitle, className }: BoxQuantityHintProps) {
  const label = getBoxQuantityLabel(boxQuantity, variantTitle);
  if (!label) return null;

  return (
    <p className={cn("text-xs text-muted-foreground", className)}>{label}</p>
  );
}
