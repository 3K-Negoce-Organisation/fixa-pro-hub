import { Link } from "react-router-dom";
import { Layers, Frame, PanelTop, Wrench, LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  deck: Layers,
  frame: Frame,
  panel: PanelTop,
  bolt: Wrench,
};

interface CategoryCardProps {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export function CategoryCard({ id, name, icon, count }: CategoryCardProps) {
  const Icon = iconMap[icon] || Layers;

  return (
    <Link
      to={`/produits?cat=${id}`}
      className="category-card"
    >
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <span className="font-medium text-sm text-center">{name}</span>
      <span className="text-xs text-muted-foreground">{count} produits</span>
    </Link>
  );
}
