export interface FileData {
  fileStoreId?: string;
  fileName?: string;
}

export interface OrderAddressData {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  streetAddress?: string;
  addressLine2?: string;
  city?: string;
  country?: string;
  province?: string;
  postalCode?: string;
  cellOrMobileNumber?: string;
}

export interface PcbBlindViaHoleData {
  index?: number;
  holeAttribute?: number;
  layerLevel?: number;
  holeDepth?: number;
  customerRemark?: string;
  fileInfoList?: FileData[];
}

export interface PcbOrderServiceCraftData {
  serviceConfigCode?: string;
  serviceConfigShow?: string;
  configOptionShow?: string;
}

export interface SerialQrCodeConfigData {
  qrCodeFormat?: number;
  qrLocation?: number;
  prefixCode?: string;
  addUniqueCode?: boolean;
  incrCode?: string;
}

export interface PcbOrderCraftData {
  layer?: number;
  width?: number;
  length?: number;
  qty?: number;
  thickness?: number;
  pcbColor?: number;
  surfaceFinish?: number;
  copperWeight?: number;
  insideCuprumThickness?: string;
  goldFinger?: number;
  materialDetails?: number;
  panelFlag?: number;
  panelByJLCPCB_X?: number;
  panelByJLCPCB_Y?: number;
  differentDesign?: number;
  flyingProbeTest?: number;
  castellatedHoles?: number;
  orderDetailsRemark?: string;
  cascadeStructure?: number;
  impedanceTemplateCode?: string;
  impedanceFlag?: string;
  isAddCustomerCode?: string;
  plateType?: number;
  autoConfirmProductionFile?: boolean;
  markOnPcb?: number;
  viaCovering?: number;
  needTechnics?: number;
  technicsSize?: number;
  goldThickness?: number;
  edgeRounding?: boolean;
  rowSpacing?: number;
  columnSpacing?: number;
  serialQrCodeConfigData?: SerialQrCodeConfigData;
  edaSoftware?: string;
  fpcGoldFingerThickness?: number;
  serviceConfigVos?: PcbOrderServiceCraftData[];
  pcbBlindViaHoleInfoDTOList?: PcbBlindViaHoleData[];
}

export interface SteelOrderCraftData {
  dimensionsID?: number;
  stencilQty?: number;
  electropolishing?: number;
  fiducials?: number;
  steelPurpose?: string;
  customizeFlag?: number;
  customizeSizeX?: number;
  customizeSizeY?: number;
  stencilSide?: number;
  orderRemark?: string;
  confirmFile?: boolean;
  autoConfirmProductionFile?: number;
  moreShapeFlag?: boolean;
}

export interface ImpedanceTemplateRequest {
  stencilLayer?: number;
  stencilPly?: number;
  cuprumThickness?: number;
  insideCuprumThickness?: number;
  plateType?: number;
  delamination?: boolean;
}

export interface PcbQuoteRequest {
  orderType?: number;
  pcbParam?: PcbOrderCraftData;
  smtStencilParam?: SteelOrderCraftData;
  achieveDate?: number;
  country?: string;
  postCode?: string;
  city?: string;
  fileKey?: string;
  batchNum?: string;
  shippingMethod?: string;
}

export interface PcbCreateOrderRequest extends PcbQuoteRequest {
  shippingAddress?: OrderAddressData;
  billingAddress?: OrderAddressData;
  TaxOrVATNumber?: string;
  billingAddressFlag?: number;
}

export interface BatchNumRequest {
  batchNum?: string;
}

export interface PcbAuditRequest {
  key?: string;
  language?: number;
}

export interface PcbWipRequest {
  orderUUID?: string;
}

export interface ComponentCodesRequest {
  componentCodes?: string[];
}

export interface PageRequest {
  currentPage?: number;
  pageSize?: number;
}

export interface ComponentInfosRequest {
  lastKey?: string;
}

export interface CraftAttributeShoppingCart {
  craftAttributeAccessId?: string;
  customerCraft?: string;
  resourceUrl?: string;
}

export interface CraftShoppingCart {
  craftAccessId?: string;
  attributes?: CraftAttributeShoppingCart[];
}

export interface CustomerAddress {
  uuid?: string;
  orderType?: string;
  country?: string;
  city?: string;
  state?: string;
  street?: string;
  street2?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  postcode?: string;
  type?: string;
  companyName?: string;
  defaultAddress?: boolean;
  defaultChecked?: boolean;
  brazilCpnj?: string;
  taxVat?: string;
  eoriNo?: string;
  partitionName?: string;
  areaCode?: string;
  commercialRegistrationId?: string;
  vatCheckFlag?: boolean;
  shortAddress?: string;
  certificateCode?: string;
}

export interface TdpQuoteRequest {
  materialAccessId?: string;
  materialColorAccessId?: string;
  modelAccessId?: string;
  fileAccessId?: string;
  fileName?: string;
  itemName?: string;
  itemPrice?: number;
  itemCount?: number;
  surfaceTreatmentProcess?: number;
  materialDeliveryAccessId?: string;
  goodsUsefulness?: string;
  goodsCustomsType?: number;
  customerRemarks?: string;
  craftShoppingCartDTOList?: CraftShoppingCart[];
  shippingAddress?: CustomerAddress;
  freightMode?: string;
}

export interface TdpCreateOrderRequest extends TdpQuoteRequest {
  billingAddress?: CustomerAddress;
  billingUseShippingAddressFlag?: boolean;
  typeOfTrade?: number;
  batchNum?: string;
}

export interface TdpFileResultRequest {
  fileAccessId?: string;
}

export interface TdpOrderProcessRequest {
  orderNo?: string;
}

export interface TdpOrderListRequest {
  currentPage?: number;
  pageRows?: number;
  businessType?: number;
  businessTypeStr?: string;
  orderBusinessSystemType?: number;
  searchKey?: string;
  orderStatus?: number;
  batchStatus?: string;
  fromType?: number;
  orderNum?: string;
  orderStatisticsType?: number;
  waitPayOrSupplement?: boolean;
  waitBizConfirm?: boolean;
  prevBatchNum?: string;
}

export interface UploadInput {
  file: Blob | ArrayBuffer | Uint8Array;
  fileName?: string;
  contentType?: string;
  meta?: Record<string, unknown>;
}
