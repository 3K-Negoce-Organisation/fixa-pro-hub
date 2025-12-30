import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface FilterOptions {
  diameter: string[];
  length: string[];
  material: string[];
}

interface ProductFiltersProps {
  filters: Record<string, string[]>;
  filterOptions: FilterOptions;
  onFilterChange: (key: string, values: string[]) => void;
  onClearFilters: () => void;
  isCartOpen?: boolean;
}

export function ProductFilters({
  filters,
  filterOptions,
  onFilterChange,
  onClearFilters,
  isCartOpen = false
}: ProductFiltersProps) {
  const hasActiveFilters = Object.values(filters).some(v => v.length > 0);
  
  const handleCheckboxChange = (filterKey: string, value: string, checked: boolean) => {
    const currentValues = filters[filterKey] || [];
    const newValues = checked ? [...currentValues, value] : currentValues.filter(v => v !== value);
    onFilterChange(filterKey, newValues);
  };

  const FilterSection = ({
    title,
    filterKey,
    options
  }: {
    title: string;
    filterKey: string;
    options: string[];
  }) => {
    if (options.length === 0) return null;
    
    return (
      <div className="filter-section">
        <h4 className="filter-title">{title}</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {options.map(option => (
            <div key={option} className="flex items-center gap-2">
              <Checkbox 
                id={`${filterKey}-${option}`} 
                checked={(filters[filterKey] || []).includes(option)} 
                onCheckedChange={checked => handleCheckboxChange(filterKey, option, checked as boolean)} 
              />
              <Label 
                htmlFor={`${filterKey}-${option}`} 
                className="text-sm font-normal cursor-pointer"
              >
                {option}
              </Label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <aside className={`shrink-0 transition-all duration-300 ${isCartOpen ? 'w-48' : 'w-64'}`}>
      <div className="sticky top-24 bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Filtres</h3>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearFilters} 
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Effacer
            </Button>
          )}
        </div>

        <FilterSection 
          title="Diamètre (mm)" 
          filterKey="diameter" 
          options={filterOptions.diameter} 
        />

        <FilterSection 
          title="Longueur (mm)" 
          filterKey="length" 
          options={filterOptions.length} 
        />

        <FilterSection 
          title="Matière" 
          filterKey="material" 
          options={filterOptions.material} 
        />

      </div>
    </aside>
  );
}
