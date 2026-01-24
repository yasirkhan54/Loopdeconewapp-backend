export interface ReturnRow {
  key: string;
  order_id?: string;
  customer_name?: string;
  item_name?: string;
  sku?: string;
  retailer_name?: string;
  status?: string;
  retailer_id?: string;
  assigned_reseller_id?: string;
  assigned_reseller_name?: string;
  condition?: string;
  created_at?: string;
  [key: string]: any;
}

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ResellersResponseDto {
  resellers: ReturnRow[];
  pagination: Pagination;
  timeout?: boolean;
  error?: string;
}
