import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { roundMoney } from "@/lib/utils";
import { Upload, FileSpreadsheet, Loader2, Check, AlertCircle, RefreshCw, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ParsedProduct {
  code_alsafix: string;
  designation_fr: string;
  title: string;
  description: string | null;
  category: string | null;
  box_quantity: number | null;
  unite_de_vente: number;
  purchase_price_ht: number | null;
  box_weight: number | null;
  diameter_mm: number | null;
  length_mm: number | null;
  usage: string | null;
  material: string | null;
  drive_type: string | null;
  thickness_to_fix_mm: number | null;
  thread_length_mm: number | null;
  head_diameter_mm: number | null;
  // Computed fields
  handle: string;
  price_ht: number;
  price_ttc: number;
  // Status
  existingId?: string;
  status: "new" | "update";
}

interface ImportResult {
  created: number;
  updated: number;
  errors: number;
  details: { code: string; action: string; error?: string }[];
}

interface ProductExcelImportProps {
  onImportComplete: () => void;
}

export const ProductExcelImport = ({ onImportComplete }: ProductExcelImportProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const parseNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const num = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
    return isNaN(num) ? null : num;
  };

  const generateHandle = (code: string, designation: string): string => {
    const base = code || designation;
    return base
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsChecking(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Helper to find column value with flexible matching
      const getCol = (row: any, ...possibleNames: string[]): any => {
        // Try exact match first
        for (const name of possibleNames) {
          if (row[name] !== undefined) return row[name];
        }
        // Try case-insensitive and accent-normalized match
        const normalize = (s: string) => s.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");
        const rowKeys = Object.keys(row);
        for (const name of possibleNames) {
          const normalizedName = normalize(name);
          for (const key of rowKeys) {
            if (normalize(key) === normalizedName) {
              return row[key];
            }
          }
        }
        return undefined;
      };

      // Parse products from Excel - support multiple column name formats
      const rawProducts = jsonData.map((row: any) => {
        // Code ALSAFIX
        const code = String(
          getCol(row, "Code ALSAFIX", "Code article", "code_alsafix") || ""
        ).trim();
        
        // Designation
        const designation = String(
          getCol(row, "Désignation FR", "Designation FR", "designation_fr") || ""
        ).trim();
        
        // Title (use Titre column, or fallback to designation/code)
        const title = String(
          getCol(row, "Titre", "title") || designation || code
        ).trim();
        
        // Description
        const description = getCol(row, "Description", "description") || null;
        
        // Category
        const category = getCol(row, "Catégorie", "Categorie", "category") || null;
        
        // Prices - parse € format and handle various number formats
        const parsePrice = (val: unknown): number => {
          if (val === null || val === undefined || val === "") return 0;
          if (typeof val === "number") return val;
          // Remove currency symbol, spaces, and handle comma as decimal separator
          const str = String(val)
            .replace(/[€\s\u00A0]/g, "") // Remove €, spaces, non-breaking spaces
            .replace(",", ".");
          return parseFloat(str) || 0;
        };
        
        // Purchase price
        const purchasePrice = parsePrice(
          getCol(row, "Prix d'achat à la boite HT", "Prix d'achat a la boite HT", "PA HT", "purchase_price_ht")
        );
        
        // Selling prices - use direct values if available, otherwise compute
        let priceHT = parsePrice(
          getCol(row, "Prix de vente à la boite HT", "Prix de vente a la boite HT", "PV HT", "price_ht")
        );
        let priceTTC = parsePrice(
          getCol(row, "Prix de vente à la boite TTC", "Prix de vente a la boite TTC", "PV TTC", "price_ttc")
        );
        
        // Fallback: compute from purchase price if not provided
        if (!priceHT && purchasePrice) {
          priceHT = roundMoney(purchasePrice * 1.5);
        }
        if (!priceTTC && priceHT) {
          priceTTC = roundMoney(priceHT * 1.2);
        }
        const roundedPurchase = purchasePrice > 0 ? roundMoney(purchasePrice) : 0;
        const roundedPriceHT = roundMoney(priceHT);
        const roundedPriceTTC = roundMoney(priceTTC);

        return {
          code_alsafix: code,
          designation_fr: designation,
          title: title,
          description: description,
          category: category,
          box_quantity: parseNumber(
            getCol(row, "Quantité dans la boite", "Quantite dans la boite", "Qté / Boite", "box_quantity")
          ),
          unite_de_vente:
            parseNumber(
              getCol(row, "Unité de vente", "Unite de vente", "unite_de_vente", "Unité de vente Alsafix"),
            ) ?? 100,
          purchase_price_ht: roundedPurchase > 0 ? roundedPurchase : null,
          box_weight: parseNumber(
            getCol(row, "Poids de la boite", "Poids / Boite", "box_weight")
          ),
          diameter_mm: parseNumber(
            getCol(row, "diamètre (mm)", "Diamètre (mm)", "diametre (mm)", "diameter_mm")
          ),
          length_mm: parseNumber(
            getCol(row, "longueur (mm)", "Longueur (mm)", "length_mm")
          ),
          usage: getCol(row, "utilisation", "Utilisation", "usage") || null,
          material: getCol(row, "matière", "Matière", "matiere", "material") || null,
          drive_type: getCol(row, "Empreinte", "Type d'entraînement", "drive_type") || null,
          thickness_to_fix_mm: parseNumber(
            getCol(row, "épaisseur à fixer (mm)", "Epaisseur a fixer (mm)", "epaisseur a fixer (mm)", "thickness_to_fix_mm")
          ),
          thread_length_mm: parseNumber(
            getCol(row, "Longueur du filetage (mm)", "Longueur filetée (mm)", "thread_length_mm")
          ),
          head_diameter_mm: parseNumber(
            getCol(row, "Diamètre de la tête (mm)", "Diametre de la tete (mm)", "head_diameter_mm")
          ),
          handle: generateHandle(code, designation),
          price_ht: roundedPriceHT,
          price_ttc: roundedPriceTTC,
          status: "new" as const,
        };
      }).filter(p => p.code_alsafix || p.designation_fr || p.title);

      if (rawProducts.length === 0) {
        toast({
          title: "Fichier vide",
          description: "Aucun produit valide trouvé dans le fichier.",
          variant: "destructive",
        });
        setIsChecking(false);
        return;
      }

      // Check for existing products by code_alsafix
      const codes = rawProducts.map(p => p.code_alsafix).filter(Boolean);
      const { data: existingProducts } = await supabase
        .from("products")
        .select("id, code_alsafix")
        .in("code_alsafix", codes);

      const existingMap = new Map(
        (existingProducts || []).map(p => [p.code_alsafix, p.id])
      );

      // Mark products as new or update
      const productsWithStatus: ParsedProduct[] = rawProducts.map(p => {
        const existingId = existingMap.get(p.code_alsafix);
        return {
          ...p,
          existingId,
          status: existingId ? "update" : "new",
        };
      });

      setParsedProducts(productsWithStatus);
      setIsDialogOpen(true);
    } catch (error) {
      toast({
        title: "Erreur de lecture",
        description: "Impossible de lire le fichier Excel.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportProgress({ current: 0, total: parsedProducts.length });

    const result: ImportResult = {
      created: 0,
      updated: 0,
      errors: 0,
      details: [],
    };

    // Build sub_category name -> id lookup map
    const { data: categoriesData } = await (supabase as any)
      .from("sub_category")
      .select("id, name");
    const categoryMap: Record<string, string> = {};
    (categoriesData || []).forEach((c: { id: string; name: string }) => {
      categoryMap[c.name.toLowerCase().trim()] = c.id;
    });

    for (let i = 0; i < parsedProducts.length; i++) {
      const product = parsedProducts[i];
      setImportProgress({ current: i + 1, total: parsedProducts.length });

      const resolvedSubCategoryId = product.category
        ? categoryMap[product.category.toLowerCase().trim()] || null
        : null;

      const productData = {
        code_alsafix: product.code_alsafix || null,
        designation_fr: product.designation_fr || null,
        title: product.title,
        description: product.description || null,
        sub_category_id: resolvedSubCategoryId,
        handle: product.handle,
        price_ht: product.price_ht,
        price_ttc: product.price_ttc,
        box_quantity: product.box_quantity,
        unite_de_vente: product.unite_de_vente,
        purchase_price_ht: product.purchase_price_ht,
        box_weight: product.box_weight,
        diameter_mm: product.diameter_mm,
        length_mm: product.length_mm,
        usage: product.usage,
        material: product.material,
        drive_type: product.drive_type,
        thickness_to_fix_mm: product.thickness_to_fix_mm,
        thread_length_mm: product.thread_length_mm,
        head_diameter_mm: product.head_diameter_mm,
      };

      try {
        if (product.existingId) {
          // Update existing product
          const { error } = await supabase
            .from("products")
            .update(productData)
            .eq("id", product.existingId);

          if (error) {
            result.errors++;
            result.details.push({ code: product.code_alsafix, action: "Erreur", error: error.message });
          } else {
            result.updated++;
            result.details.push({ code: product.code_alsafix, action: "Mis à jour" });
          }
        } else {
          // Insert new product - inactive by default
          const { error } = await supabase.from("products").insert({
            ...productData,
            is_active: false,
            stock: 0,
            images: [],
          });

          if (error) {
            result.errors++;
            result.details.push({ code: product.code_alsafix, action: "Erreur", error: error.message });
          } else {
            result.created++;
            result.details.push({ code: product.code_alsafix, action: "Créé" });
          }
        }
      } catch (err) {
        result.errors++;
        result.details.push({ code: product.code_alsafix, action: "Erreur", error: "Erreur inattendue" });
      }
    }

    setIsImporting(false);
    setIsDialogOpen(false);
    setParsedProducts([]);
    setImportResult(result);
    setIsResultDialogOpen(true);

    onImportComplete();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(price);
  };

  const newCount = parsedProducts.filter(p => p.status === "new").length;
  const updateCount = parsedProducts.filter(p => p.status === "update").length;

  return (
    <>
      <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isChecking}>
        {isChecking ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4 mr-2" />
        )}
        {isChecking ? "Analyse..." : "Importer Excel"}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Preview Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Aperçu de l'import ({parsedProducts.length} produits)
            </DialogTitle>
            <DialogDescription>
              <div className="flex gap-4 mt-2">
                <Badge variant="default" className="gap-1">
                  <Plus className="h-3 w-3" />
                  {newCount} nouveau(x)
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <RefreshCw className="h-3 w-3" />
                  {updateCount} mise(s) à jour
                </Badge>
              </div>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[55vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statut</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Désignation</TableHead>
                  <TableHead>Qté/Boite</TableHead>
                  <TableHead>UV</TableHead>
                  <TableHead>PA HT</TableHead>
                  <TableHead>PV HT</TableHead>
                  <TableHead>PV TTC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedProducts.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {product.status === "update" ? (
                        <Badge variant="secondary" className="gap-1">
                          <RefreshCw className="h-3 w-3" />
                          MAJ
                        </Badge>
                      ) : (
                        <Badge variant="default" className="gap-1">
                          <Plus className="h-3 w-3" />
                          Nouveau
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {product.code_alsafix || "-"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {product.designation_fr || "-"}
                    </TableCell>
                    <TableCell>{product.box_quantity || "-"}</TableCell>
                    <TableCell>{product.unite_de_vente}</TableCell>
                    <TableCell>{product.purchase_price_ht ? formatPrice(product.purchase_price_ht) : "-"}</TableCell>
                    <TableCell>{formatPrice(product.price_ht)}</TableCell>
                    <TableCell>{formatPrice(product.price_ttc)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <DialogFooter className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {isImporting && (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Import en cours: {importProgress.current}/{importProgress.total}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isImporting}>
                Annuler
              </Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Importer
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Import terminé
            </DialogTitle>
            <DialogDescription>Résumé de l'opération</DialogDescription>
          </DialogHeader>

          {importResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{importResult.created}</div>
                  <div className="text-sm text-muted-foreground">Créé(s)</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
                  <div className="text-sm text-muted-foreground">Mis à jour</div>
                </div>
                <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">{importResult.errors}</div>
                  <div className="text-sm text-muted-foreground">Erreur(s)</div>
                </div>
              </div>

              {importResult.errors > 0 && (
                <ScrollArea className="max-h-[200px] border rounded-lg p-2">
                  <div className="space-y-1">
                    {importResult.details
                      .filter(d => d.action === "Erreur")
                      .map((detail, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-mono">{detail.code}</span>
                          <span className="text-muted-foreground">- {detail.error}</span>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsResultDialogOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
