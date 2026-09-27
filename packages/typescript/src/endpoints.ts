export const DEFAULT_ENDPOINT = "https://open.jlcpcb.com";

export const endpoints = {
  pcb: {
    uploadGerber: "/overseas/openapi/pcb/uploadGerber",
    uploadBlindViaHoleImg: "/overseas/openapi/pcb/uploadBlindViaHoleImg",
    impedanceTemplates: "/overseas/openapi/pcb/getImpedanceTemplateSettingList",
    quote: "/overseas/openapi/pcb/calculate",
    createOrder: "/overseas/openapi/pcb/create",
    productionProgress: "/overseas/openapi/pcb/wip/get",
    orderDetail: "/overseas/openapi/pcb/order/detail",
    audit: "/overseas/openapi/pcb/audit/get",
    steelPriceConfig: "/overseas/openapi/pcb/getSteelPriceConfig",
  },
  components: {
    infos: "/overseas/openapi/component/getComponentInfos",
    libraryList: "/overseas/openapi/component/getComponentLibraryList",
    privateLibrary: "/overseas/openapi/component/getPrivateComponentLibrary",
    detailByCode: "/overseas/openapi/component/getComponentDetailByCode",
  },
  tdp: {
    upload: "/overseas/openapi/tdp/api/upload",
    fileResult: "/overseas/openapi/tdp/api/file/result",
    quote: "/overseas/openapi/tdp/api/calculate",
    createOrder: "/overseas/openapi/tdp/api/order/create",
    orderList: "/overseas/openapi/tdp/api/order/list",
    orderDetail: "/overseas/openapi/tdp/api/order/detail",
    orderProcess: "/overseas/openapi/tdp/api/order/process",
  },
} as const;

export const unresolvedEndpoints = [
  {
    name: "Get Available Balance",
    group: "JLC Balance",
    reason: "Listed on https://api.jlcpcb.com/docs/api-list but the path is not in the Java or Python SDKs.",
  },
  {
    name: "Get Available Plate Brand & TG Value Combinations",
    group: "PCB",
    reason: "Listed on the API list but the path is not in the Java or Python SDKs.",
  },
] as const;
