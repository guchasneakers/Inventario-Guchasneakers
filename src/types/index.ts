export interface BrandData {
  id:   number;
  name: string;
}

export interface SizeData {
  id: number;
  number: string;
  quantity: number;
  sold: number;
  revenue: number;
  hidden: boolean;
  productId: number;
}

export interface ProductData {
  id:       number;
  modelNum: string;
  brandId:  number | null;
  brand:    BrandData | null;
  name:     string;
  description: string | null;
  price: number | null;
  imageUrl: string | null;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
  sizes: SizeData[];
}

export interface Stats {
  totalProducts: number;
  totalStock: number;
  totalSold: number;
  totalBrands: number;
}

export type SizeFormEntry = {
  number: string;
  quantity: number;
};

export interface SaleRecord {
  id:           number;
  sizeId:       number;
  quantity:     number;
  pricePerPair: number;
  buyerName:    string | null;
  note:         string | null;
  createdAt:    string;
  size?: {
    number:    string;
    productId: number;
    product?:  { id: number; name: string; modelNum: string; brand?: { name: string } | null };
  };
}

export type ProductFormData = {
  brandId:     string;   // "" | "123"
  name:        string;
  description: string;
  price:       string;
  imageUrl:    string;
  sizes:       SizeFormEntry[];
};

export interface CartItem {
  productId:   number;
  productName: string;
  brand:       string | null;
  sizeId:      number;
  sizeNumber:  string;
  qty:         number;
  price:       number;
}
