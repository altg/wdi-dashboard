export type PeerGroup = {
  id: string;
  label: string;
  type: "region" | "income" | "custom";
  // WB aggregate country code for this group (used to fetch regional averages)
  wbAggregateCode?: string;
  countryIso3s: string[];
};

// WB region codes and their member country ISO3 codes
// Sources: World Bank country classification
export const PEER_GROUPS: PeerGroup[] = [
  {
    id: "mena",
    label: "Middle East & North Africa",
    type: "region",
    wbAggregateCode: "MNA",
    countryIso3s: [
      "DZA", "BHR", "DJI", "EGY", "IRN", "IRQ", "ISR", "JOR", "KWT",
      "LBN", "LBY", "MLT", "MAR", "OMN", "PSE", "QAT", "SAU", "SYR",
      "TUN", "ARE", "YEM",
    ],
  },
  {
    id: "ssa",
    label: "Sub-Saharan Africa",
    type: "region",
    wbAggregateCode: "SSA",
    countryIso3s: [
      "AGO", "BEN", "BWA", "BFA", "BDI", "CPV", "CMR", "CAF", "TCD",
      "COM", "COD", "COG", "CIV", "GNQ", "ERI", "SWZ", "ETH", "GAB",
      "GMB", "GHA", "GIN", "GNB", "KEN", "LSO", "LBR", "MDG", "MWI",
      "MLI", "MRT", "MUS", "MOZ", "NAM", "NER", "NGA", "RWA", "STP",
      "SEN", "SLE", "SOM", "ZAF", "SSD", "SDN", "TZA", "TGO", "UGA",
      "ZMB", "ZWE",
    ],
  },
  {
    id: "sas",
    label: "South Asia",
    type: "region",
    wbAggregateCode: "SAS",
    countryIso3s: [
      "AFG", "BGD", "BTN", "IND", "MDV", "NPL", "PAK", "LKA",
    ],
  },
  {
    id: "eas",
    label: "East Asia & Pacific",
    type: "region",
    wbAggregateCode: "EAS",
    countryIso3s: [
      "ASM", "AUS", "BRN", "KHM", "CHN", "FJI", "PYF", "GUM", "HKG",
      "IDN", "JPN", "KIR", "PRK", "KOR", "LAO", "MAC", "MYS", "MHL",
      "FSM", "MNG", "MMR", "NRU", "NCL", "NZL", "MNP", "PLW", "PNG",
      "PHL", "WSM", "SGP", "SLB", "TLS", "TON", "TUV", "VUT", "VNM",
    ],
  },
  {
    id: "eca",
    label: "Europe & Central Asia",
    type: "region",
    wbAggregateCode: "ECA",
    countryIso3s: [
      "ALB", "AND", "ARM", "AUT", "AZE", "BLR", "BEL", "BIH", "BGR",
      "HRV", "CYP", "CZE", "DNK", "EST", "FRO", "FIN", "FRA", "GEO",
      "DEU", "GRC", "GRL", "HUN", "ISL", "IRL", "IMN", "ITA", "KAZ",
      "XKX", "KGZ", "LVA", "LIE", "LTU", "LUX", "MKD", "MDA", "MCO",
      "MNE", "NLD", "NOR", "POL", "PRT", "ROU", "RUS", "SMR", "SRB",
      "SVK", "SVN", "ESP", "SWE", "CHE", "TJK", "TUR", "TKM", "UKR",
      "GBR", "UZB",
    ],
  },
  {
    id: "lac",
    label: "Latin America & Caribbean",
    type: "region",
    wbAggregateCode: "LAC",
    countryIso3s: [
      "ARG", "ABW", "BHS", "BRB", "BLZ", "BOL", "BRA", "CYM", "CHL",
      "COL", "CRI", "CUB", "CUW", "DMA", "DOM", "ECU", "SLV", "GRD",
      "GTM", "GUY", "HTI", "HND", "JAM", "MEX", "NIC", "PAN", "PRY",
      "PER", "PRI", "KNA", "LCA", "VCT", "SXM", "SUR", "TTO", "TCA",
      "URY", "VEN", "VIR",
    ],
  },
  {
    id: "nac",
    label: "North America",
    type: "region",
    wbAggregateCode: "NAC",
    countryIso3s: ["CAN", "USA"],
  },

  // Income groups — country lists sourced from WB classification in local DB
  {
    id: "hic",
    label: "High income",
    type: "income",
    wbAggregateCode: "HIC",
    countryIso3s: [
      "ABW","AND","ARE","ASM","ATG","AUS","AUT","BEL","BGR","BHR","BHS","BMU","BRB","BRN",
      "CAN","CHE","CHI","CHL","CRI","CUW","CYM","CYP","CZE","DEU","DNK","ESP","EST","FIN",
      "FRA","FRO","GBR","GIB","GRC","GRL","GUM","GUY","HKG","HRV","HUN","IMN","IRL","ISL",
      "ISR","ITA","JPN","KNA","KOR","KWT","LIE","LTU","LUX","LVA","MAC","MAF","MCO","MLT",
      "MNP","NCL","NLD","NOR","NRU","NZL","OMN","PAN","PLW","POL","PRI","PRT","PYF","QAT",
      "ROU","RUS","SAU","SGP","SMR","SVK","SVN","SWE","SXM","SYC","TCA","TTO","URY","USA",
      "VGB","VIR",
    ],
  },
  {
    id: "umic",
    label: "Upper middle income",
    type: "income",
    wbAggregateCode: "UMC",
    countryIso3s: [
      "ALB","ARG","ARM","AZE","BIH","BLR","BLZ","BRA","BWA","CHN","COL","CPV","CUB","DMA",
      "DOM","DZA","ECU","FJI","GAB","GEO","GNQ","GRD","GTM","IDN","IRN","IRQ","JAM","KAZ",
      "LBY","LCA","MDA","MDV","MEX","MHL","MKD","MNE","MNG","MUS","MYS","PER","PRY","SLV",
      "SRB","SUR","THA","TKM","TON","TUR","TUV","UKR","VCT","WSM","XKX","ZAF",
    ],
  },
  {
    id: "lmic",
    label: "Lower middle income",
    type: "income",
    wbAggregateCode: "LMC",
    countryIso3s: [
      "AGO","BEN","BGD","BOL","BTN","CIV","CMR","COG","COM","DJI","EGY","FSM","GHA","GIN",
      "HND","HTI","IND","JOR","KEN","KGZ","KHM","KIR","LAO","LBN","LKA","LSO","MAR","MMR",
      "MRT","NAM","NGA","NIC","NPL","PAK","PHL","PNG","PSE","SEN","SLB","STP","SWZ","TJK",
      "TLS","TUN","TZA","UZB","VNM","VUT","ZMB","ZWE",
    ],
  },
  {
    id: "lic",
    label: "Low income",
    type: "income",
    wbAggregateCode: "LIC",
    countryIso3s: [
      "AFG","BDI","BFA","CAF","COD","ERI","GMB","GNB","LBR","MDG","MLI","MOZ","MWI","NER",
      "PRK","RWA","SDN","SLE","SOM","SSD","SYR","TCD","TGO","UGA","YEM",
    ],
  },
];

export const PEER_GROUP_MAP = new Map<string, PeerGroup>(
  PEER_GROUPS.map((pg) => [pg.id, pg])
);

export function getPeerGroup(id: string): PeerGroup | undefined {
  return PEER_GROUP_MAP.get(id);
}
