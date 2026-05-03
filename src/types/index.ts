export interface SizeData {
  id: number;
  number: string;
  quantity: number;
  sold: number;
  productId: number;
}

export interface ProductData {
  id: number;
  modelNum: string;
  name: string;
  description: string | null;
  price: number | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  sizes: SizeData[];
}

export interface Stats {
  totalProducts: number;
  totalStock: number;
  totalSold: number;
}

export type SizeFormEntry = {
  number: string;
  quantity: number;
};

export type ProductFormData = {
  modelNum: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  sizes: SizeFormEntry[];
};
