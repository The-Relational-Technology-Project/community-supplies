import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { compressFileToDataUrl } from "@/lib/imageCompression";

interface MultipleImageUploadProps {
  onImagesChange: (images: string[]) => void;
  currentImages?: string[];
  maxImages?: number;
}

export function MultipleImageUpload({ 
  onImagesChange, 
  currentImages = [], 
  maxImages = 4 
}: MultipleImageUploadProps) {
  const [images, setImages] = useState<string[]>(currentImages);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setImages(currentImages);
  }, [currentImages]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const remainingSlots = maxImages - images.length;
    const filesToProcess = Math.min(files.length, remainingSlots);
    if (filesToProcess === 0) return;

    setCompressing(true);

    try {
      const newImages: string[] = [];
      for (let i = 0; i < filesToProcess; i++) {
        const compressed = await compressFileToDataUrl(files[i]);
        newImages.push(compressed);
      }
      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      onImagesChange(updatedImages);
    } catch (error) {
      console.error('Failed to compress images:', error);
    } finally {
      setCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    onImagesChange(updatedImages);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative">
              <img 
                src={image} 
                alt={`Supply image ${index + 1}`} 
                className="w-full h-32 object-contain rounded-sm border border-border bg-sand/10"
              />
              <Button
                onClick={() => handleRemoveImage(index)}
                variant="destructive"
                size="sm"
                className="absolute top-1 right-1 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <>
          <div 
            onClick={handleUploadClick}
            className="w-full h-32 border-2 border-dashed border-border rounded-sm flex flex-col items-center justify-center cursor-pointer hover:border-terracotta transition-colors"
          >
            {compressing ? (
              <>
                <Loader2 className="h-8 w-8 text-muted-foreground mb-2 animate-spin" />
                <p className="text-muted-foreground text-center text-sm">Compressing...</p>
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-center mb-1 text-sm">
                  Click to upload images
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  Any size — auto-compressed ({images.length}/{maxImages})
                </p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={compressing}
          />

          <Button 
            onClick={handleUploadClick}
            variant="outline" 
            className="w-full"
            disabled={!canAddMore || compressing}
          >
            {compressing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Add Images ({images.length}/{maxImages})
          </Button>
        </>
      )}
    </div>
  );
}
