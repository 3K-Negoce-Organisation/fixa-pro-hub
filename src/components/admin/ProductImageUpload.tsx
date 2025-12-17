import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";

interface ProductImage {
  url: string;
}

interface ProductImageUploadProps {
  images: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
}

export const ProductImageUpload = ({ images, onImagesChange }: ProductImageUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages: ProductImage[] = [...images];

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({ 
            title: "Type de fichier invalide", 
            description: `${file.name} n'est pas une image.`, 
            variant: "destructive" 
          });
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({ 
            title: "Fichier trop volumineux", 
            description: `${file.name} dépasse 5MB.`, 
            variant: "destructive" 
          });
          continue;
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file);

        if (uploadError) {
          toast({ 
            title: "Erreur d'upload", 
            description: uploadError.message, 
            variant: "destructive" 
          });
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        newImages.push({ url: publicUrl });
      }

      onImagesChange(newImages);
      toast({ title: "Images uploadées", description: "Les images ont été ajoutées avec succès." });
    } catch (error) {
      toast({ 
        title: "Erreur", 
        description: "Une erreur est survenue lors de l'upload.", 
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleRemove = async (index: number) => {
    const imageToRemove = images[index];
    
    // Extract filename from URL
    const urlParts = imageToRemove.url.split('/');
    const fileName = urlParts[urlParts.length - 1];

    // Try to delete from storage (don't block UI if it fails)
    try {
      await supabase.storage
        .from('product-images')
        .remove([fileName]);
    } catch (error) {
      console.error('Failed to delete image from storage:', error);
    }

    // Update local state
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => document.getElementById('image-upload')?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {uploading ? "Upload en cours..." : "Ajouter des images"}
        </Button>
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
        <span className="text-sm text-muted-foreground">
          Max 5MB par image
        </span>
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg border overflow-hidden bg-muted">
                <img
                  src={image.url}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Aucune image</p>
        </div>
      )}
    </div>
  );
};
