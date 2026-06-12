export interface Book {
  id: string;
  title: string;
  author: string | null;
  genre: string | null;
  condition: string;
  houseRules: string[];
  ownerId: string;
  ownerName: string;
  lentOut: boolean;
  lenderNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookInsert {
  title: string;
  author?: string;
  genre?: string;
  condition: string;
  house_rules?: string[];
  lender_notes?: string;
}

export interface DetectedBook {
  title: string;
  author: string;
  selected: boolean;
}
