import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface BulkImageUploadProps {
  selectedProductIds: string[];
  onSuccess: () => void;
}

export const BulkImageUpload = ({ selectedProductIds, onSuccess }: BulkImageUploadProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ 
        title: "Type de fichier invalide", 
        description: "Veuillez sélectionner une image.", 
        variant: "destructive" 
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ 
        title: "Fichier trop volumineux", 
        description: "L'image ne doit pas dépasser 5MB.", 
        variant: "destructive" 
      });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUploadAndAssign = async () => {
    if (!selectedFile || selectedProductIds.length === 0) return;

    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, selectedFile);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      // Update all selected products with this image
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          images: [{ url: publicUrl }],
          updated_at: new Date().toISOString()
        })
        .in('id', selectedProductIds);

      if (updateError) {
        throw new Error(updateError.message);
      }

      toast({ 
        title: "Image assignée", 
        description: `L'image a été assignée à ${selectedProductIds.length} produit(s).` 
      });

      // Reset and close
      setSelectedFile(null);
      setPreviewUrl(null);
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast({ 
        title: "Erreur", 
        description: error instanceof Error ? error.message : "Une erreur est survenue.", 
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={selectedProductIds.length === 0}
      >
        <ImageIcon className="h-4 w-4 mr-1" />
        Image
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assigner une image</DialogTitle>
            <DialogDescription>
              L'image sera assignée à {selectedProductIds.length} produit(s) sélectionné(s).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {previewUrl ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-48 h-48 rounded-lg border overflow-hidden bg-muted">
                  <img
                    src={previewUrl}
                    alt="Aperçu"
                    className="w-full h-full object-contain"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    if (inputRef.current) inputRef.current.value = '';
                  }}
                  disabled={uploading}
                >
                  Changer d'image
                </Button>
              </div>
            ) : (
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Cliquez pour sélectionner une image</p>
                <p className="text-xs text-muted-foreground mt-1">Max 5MB</p>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              Annuler
            </Button>
            <Button 
              onClick={handleUploadAndAssign} 
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assignation...
                </>
              ) : (
                "Assigner l'image"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
