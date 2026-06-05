export interface Supply {
  id: string;
  name: string;
  description: string;
  category: string;
  condition: 'excellent' | 'good' | 'fair';
  partyTypes: string[];
  dateAvailable: string;
  location?: string; // Keep for backward compatibility
  neighborhood?: string;
  crossStreets?: string;
  contactEmail?: string;
  image?: string; // Keep for backward compatibility
  images?: string[]; // New multiple images support
  illustration_url?: string; // AI-generated minimalist illustration
  thumb_url?: string | null; // Lightweight photo thumbnail for list cards (storage URL only)
  houseRules?: string[];
  ownerId?: string; // Add owner ID for database operations
  lentOut?: boolean; // Track if item is currently lent out
  lenderNotes?: string; // Private notes for the owner
  owner: {
    name: string;
    zipCode: string;
    location: string;
    avatar: string;
  };
}

export interface PartyPlan {
  theme?: string;
  ageGroup: string;
  guestCount: number;
  budgetRange: string;
  partyStyle: string;
  partyDate?: string;
  priorities: string[];
}
