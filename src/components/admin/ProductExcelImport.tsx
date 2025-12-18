import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, Loader2, Check, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  box_quantity: number | null;
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
  title: string;
  handle: string;
  price_ht: number;
  price_ttc: number;
}

interface ProductExcelImportProps {
  onImportComplete: () => void;
}

export const ProductExcelImport = ({ onImportComplete }: ProductExcelImportProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

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

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const products: ParsedProduct[] = jsonData.map((row: any) => {
        const code = String(row["Code article"] || row["code_alsafix"] || "").trim();
        const designation = String(row["Désignation (FR)"] || row["designation_fr"] || row["title"] || "").trim();
        const purchasePrice = parseNumber(row["PA HT"] || row["purchase_price_ht"]) || 0;
        
        // Default markup: price_ht = purchase_price * 1.5, price_ttc = price_ht * 1.2
        const priceHT = Math.round(purchasePrice * 1.5 * 100) / 100;
        const priceTTC = Math.round(priceHT * 1.2 * 100) / 100;

        return {
          code_alsafix: code,
          designation_fr: designation,
          box_quantity: parseNumber(row["Qté / Boite"] || row["box_quantity"]),
          purchase_price_ht: purchasePrice,
          box_weight: parseNumber(row["Poids / Boite"] || row["box_weight"]),
          diameter_mm: parseNumber(row["Diamètre (mm)"] || row["diameter_mm"]),
          length_mm: parseNumber(row["Longueur (mm)"] || row["length_mm"]),
          usage: row["Utilisation"] || row["usage"] || null,
          material: row["Matière"] || row["material"] || null,
          drive_type: row["Type d'entraînement"] || row["drive_type"] || null,
          thickness_to_fix_mm: parseNumber(row["Epaisseur à fixer (mm)"] || row["thickness_to_fix_mm"]),
          thread_length_mm: parseNumber(row["Longueur filetée (mm)"] || row["thread_length_mm"]),
          head_diameter_mm: parseNumber(row["Diamètre de tête (mm)"] || row["head_diameter_mm"]),
          title: designation || code,
          handle: generateHandle(code, designation),
          price_ht: priceHT,
          price_ttc: priceTTC,
        };
      }).filter(p => p.code_alsafix || p.designation_fr);

      if (products.length === 0) {
        toast({
          title: "Fichier vide",
          description: "Aucun produit valide trouvé dans le fichier.",
          variant: "destructive",
        });
        return;
      }

      setParsedProducts(products);
      setIsDialogOpen(true);
    } catch (error) {
      toast({
        title: "Erreur de lecture",
        description: "Impossible de lire le fichier Excel.",
        variant: "destructive",
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportProgress({ current: 0, total: parsedProducts.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < parsedProducts.length; i++) {
      const product = parsedProducts[i];
      setImportProgress({ current: i + 1, total: parsedProducts.length });

      try {
        const { error } = await supabase.from("products").insert({
          code_alsafix: product.code_alsafix || null,
          designation_fr: product.designation_fr || null,
          title: product.title,
          handle: product.handle,
          price_ht: product.price_ht,
          price_ttc: product.price_ttc,
          box_quantity: product.box_quantity,
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
          is_active: true,
          stock: 0,
          images: [],
        });

        if (error) {
          console.error("Insert error:", error);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        errorCount++;
      }
    }

    setIsImporting(false);
    setIsDialogOpen(false);
    setParsedProducts([]);

    toast({
      title: "Import terminé",
      description: `${successCount} produit(s) importé(s)${errorCount > 0 ? `, ${errorCount} erreur(s)` : ""}.`,
      variant: errorCount > 0 ? "destructive" : "default",
    });

    onImportComplete();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(price);
  };

  return (
    <>
      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Importer Excel
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileSelect}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Aperçu de l'import ({parsedProducts.length} produits)
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Désignation</TableHead>
                  <TableHead>Qté/Boite</TableHead>
                  <TableHead>PA HT</TableHead>
                  <TableHead>PV HT</TableHead>
                  <TableHead>PV TTC</TableHead>
                  <TableHead>Dimensions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedProducts.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">
                      {product.code_alsafix || "-"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {product.designation_fr || "-"}
                    </TableCell>
                    <TableCell>{product.box_quantity || "-"}</TableCell>
                    <TableCell>{product.purchase_price_ht ? formatPrice(product.purchase_price_ht) : "-"}</TableCell>
                    <TableCell>{formatPrice(product.price_ht)}</TableCell>
                    <TableCell>{formatPrice(product.price_ttc)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {product.diameter_mm && product.length_mm
                        ? `Ø${product.diameter_mm} × ${product.length_mm}mm`
                        : "-"}
                    </TableCell>
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
                Importer {parsedProducts.length} produits
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
