import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Supply } from "@/types/supply";
import { MapPin } from "lucide-react";
import { categories } from "@/data/categories";
import { cn } from "@/lib/utils";

interface SupplyCardProps {
  supply: Supply;
  onViewContact: (supply: Supply) => void;
}

export function SupplyCard({ supply, onViewContact }: SupplyCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const categoryData = categories.find(c => c.id === supply.category);
  const CategoryIcon = categoryData?.icon;
  
  const hasPhotos = supply.images?.length || supply.image;
  const isGeneratingIllustration = hasPhotos && !supply.illustration_url;
  
  return (
    <Card 
      className="h-full hover:shadow-sm transition-shadow border-border cursor-pointer"
      onClick={() => onViewContact(supply)}
    >
      <CardContent className="p-0">
        <div className="relative aspect-square bg-white flex items-center justify-center overflow-hidden border border-border">
          {supply.illustration_url ? (
            <>
              {/* Text placeholder shown until image loads */}
              <div className={cn(
                "absolute inset-0 flex items-center justify-center p-4 transition-opacity duration-300",
                imageLoaded ? "opacity-0" : "opacity-100"
              )}>
                <p className="font-serif text-sm text-muted-foreground text-center line-clamp-3">
                  {supply.name}
                </p>
              </div>
              <img 
                src={supply.illustration_url} 
                alt={supply.name}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                className={cn(
                  "w-full h-full object-contain p-3 transition-opacity duration-300",
                  imageLoaded ? "opacity-100" : "opacity-0"
                )}
              />
            </>
          ) : isGeneratingIllustration ? (
            <div className="text-center px-4">
              <p className="font-serif text-sm text-muted-foreground italic">
                illustration in progress…
              </p>
            </div>
          ) : CategoryIcon ? (
            <CategoryIcon className="h-16 w-16 text-deep-brown/40 stroke-[1.5]" />
          ) : (
            <div className="text-3xl text-muted-foreground">📦</div>
          )}
        </div>
        
        <div className="p-3">
          <h3 className="font-serif font-medium text-sm text-deep-brown mb-1 line-clamp-2">
            {supply.name}
          </h3>
          
          <div className="flex items-center text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate" title={supply.neighborhood || supply.location || `${supply.owner.zipCode} area`}>
              {supply.neighborhood || supply.location || `${supply.owner.zipCode} area`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
