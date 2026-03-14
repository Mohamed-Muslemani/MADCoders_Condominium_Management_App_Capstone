export type UnitStatus = 'ACTIVE' | 'INACTIVE';

export interface Unit {
  unitId: string;
  unitNumber: string;
  unitType?: string | null;
  floor?: number | null;
  bedrooms?: number | null;
  bathrooms?: string | number | null;
  squareFeet?: number | null;
  parkingSpots?: number | null;
  monthlyFee: string | number;
  status: UnitStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateUnitRequest {
  unitNumber: string;
  unitType?: string;
  floor?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  parkingSpots?: number;
  monthlyFee: number;
  status: UnitStatus;
  notes?: string;
}
