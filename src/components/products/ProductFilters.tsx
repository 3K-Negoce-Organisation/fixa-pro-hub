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
    <>
      {/* Mobile: Horizontal filters */}
      <div className="md:hidden w-full bg-card border border-border rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground text-sm">Filtres</h3>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearFilters} 
              className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
            >
              <X className="h-3 w-3 mr-1" />
              Effacer
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {filterOptions.diameter.length > 0 && (
            <div className="flex-1 min-w-[100px]">
              <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Ø (mm)</h4>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {filterOptions.diameter.map(option => (
                  <button
                    key={option}
                    onClick={() => handleCheckboxChange('diameter', option, !(filters.diameter || []).includes(option))}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      (filters.diameter || []).includes(option)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-primary/10'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filterOptions.length.length > 0 && (
            <div className="flex-1 min-w-[100px]">
              <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Long. (mm)</h4>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {filterOptions.length.map(option => (
                  <button
                    key={option}
                    onClick={() => handleCheckboxChange('length', option, !(filters.length || []).includes(option))}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      (filters.length || []).includes(option)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-primary/10'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filterOptions.material.length > 0 && (
            <div className="flex-1 min-w-[100px]">
              <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Matière</h4>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {filterOptions.material.map(option => (
                  <button
                    key={option}
                    onClick={() => handleCheckboxChange('material', option, !(filters.material || []).includes(option))}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      (filters.material || []).includes(option)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-primary/10'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: Sidebar filters */}
      <aside className={`hidden md:block shrink-0 transition-all duration-300 ${isCartOpen ? 'w-48' : 'w-64'}`}>
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
    </>
  );
}
