export interface CreateApInvLineData {
  quantity: string;
  item_number?: string;
  poLineNumber: string;
  trackAsAsset?: string;
  serialNumber?: string;
  assetCatMajor?: string;
  assetCatMinor?: string;
  lineType?: string;
}

export interface CreateApInvData {
  poNumber: string;
  invNumber: string;
  amount?: number;
  description: string;
  invDate?: string;
  requester: string;
  lines: CreateApInvLineData[];
}
