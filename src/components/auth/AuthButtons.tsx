
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "./AuthModal";

export function AuthButtons({ onSuccess }: { onSuccess?: () => void }) {
  const [modalMode, setModalMode] = useState<'login' | 'signup' | null>(null);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button 
          variant="outline" 
          onClick={() => setModalMode('login')}
          className="border-primary text-primary hover:bg-primary/10"
        >
          Sign In
        </Button>
        <Button 
          onClick={() => setModalMode('signup')}
        >
          Join Our Community
        </Button>
      </div>
      
      <AuthModal
        isOpen={modalMode !== null}
        onClose={() => setModalMode(null)}
        mode={modalMode || 'login'}
        onSuccess={onSuccess}
      />
    </>
  );
}
