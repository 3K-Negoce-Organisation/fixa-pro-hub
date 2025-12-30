import { Link } from "react-router-dom";
import { Layers, Frame, PanelTop, Wrench, LucideIcon } from "lucide-react";
const iconMap: Record<string, LucideIcon> = {
  deck: Layers,
  frame: Frame,
  panel: PanelTop,
  bolt: Wrench
};
interface CategoryCardProps {
  id: string;
  name: string;
  icon: string;
  count: number;
}
export function CategoryCard({
  id,
  name,
  icon,
  count
}: CategoryCardProps) {
  const Icon = iconMap[icon] || Layers;
  return (
    <Link
      to={`/produits?category=${id}`}
      className="flex flex-col items-center p-4 bg-card border border-border rounded-lg hover:border-primary hover:shadow-sm transition-all"
    >
      <Icon className="h-8 w-8 text-primary mb-2" />
      <span className="font-medium text-sm text-center">{name}</span>
    </Link>
  );
}