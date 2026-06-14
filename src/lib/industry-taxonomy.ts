export interface IndustrySubsector {
  slug: string;
  name: string;
}

export interface Industry {
  slug: string;
  name: string;
  subsectors: IndustrySubsector[];
}

export const INDUSTRY_TAXONOMY: Industry[] = [
  {
    slug: "energy-power",
    name: "Energy & Power",
    subsectors: [
      { slug: "renewable-energy", name: "Renewable Energy (Solar, Wind & Hybrid)" },
      { slug: "conventional-power-generation", name: "Conventional Power Generation (Thermal, Hydro, Nuclear)" },
      { slug: "power-transmission-distribution-grid", name: "Power Transmission, Distribution & Grid" },
      { slug: "oil-gas", name: "Oil & Gas" },
      { slug: "energy-storage-green-hydrogen", name: "Energy Storage & Green Hydrogen" },
    ],
  },
  {
    slug: "financial-services",
    name: "Financial Services",
    subsectors: [
      { slug: "banking", name: "Banking" },
      { slug: "nbfcs-microfinance", name: "NBFCs & Microfinance" },
      { slug: "insurance", name: "Insurance" },
      { slug: "asset-management-capital-markets", name: "Asset Management & Capital Markets" },
      { slug: "fintech-digital-payments", name: "Fintech & Digital Payments" },
    ],
  },
  {
    slug: "technology-internet",
    name: "Technology & Internet",
    subsectors: [
      { slug: "it-services-bpm", name: "IT Services & BPM" },
      { slug: "saas-software-products", name: "SaaS & Software Products" },
      { slug: "ecommerce-quick-commerce", name: "E-commerce & Quick Commerce" },
      { slug: "internet-consumer-tech-platforms", name: "Internet & Consumer Tech Platforms" },
      { slug: "telecom", name: "Telecom" },
    ],
  },
  {
    slug: "healthcare-pharma",
    name: "Healthcare & Pharma",
    subsectors: [
      { slug: "pharmaceuticals", name: "Pharmaceuticals" },
      { slug: "hospitals-healthcare-delivery", name: "Hospitals & Healthcare Delivery" },
      { slug: "diagnostics-medical-devices", name: "Diagnostics & Medical Devices" },
      { slug: "healthtech-digital-health", name: "Health-tech & Digital Health" },
    ],
  },
  {
    slug: "consumer-retail",
    name: "Consumer & Retail",
    subsectors: [
      { slug: "fmcg", name: "FMCG" },
      { slug: "retail", name: "Retail (Organized & E-commerce)" },
      { slug: "consumer-durables-electronics", name: "Consumer Durables & Electronics" },
      { slug: "apparel-textiles-footwear", name: "Apparel, Textiles & Footwear" },
      { slug: "food-beverage-qsr", name: "Food, Beverage & QSR" },
    ],
  },
  {
    slug: "automotive-industrial-manufacturing",
    name: "Automotive & Industrial Manufacturing",
    subsectors: [
      { slug: "automotive-oems", name: "Automotive OEMs (PV, CV, 2W/3W)" },
      { slug: "auto-components", name: "Auto Components" },
      { slug: "electric-vehicles-battery", name: "Electric Vehicles & Battery" },
      { slug: "industrial-manufacturing-capital-goods", name: "Industrial Manufacturing & Capital Goods" },
      { slug: "electronics-semiconductors", name: "Electronics & Semiconductors" },
    ],
  },
  {
    slug: "infrastructure-real-estate-construction",
    name: "Infrastructure, Real Estate & Construction",
    subsectors: [
      { slug: "real-estate", name: "Real Estate (Residential & Commercial)" },
      { slug: "construction-engineering-epc", name: "Construction & Engineering (EPC)" },
      { slug: "cement", name: "Cement" },
      { slug: "roads-highways-urban-infrastructure", name: "Roads, Highways & Urban Infrastructure" },
      { slug: "ports-airports-logistics-infrastructure", name: "Ports, Airports & Logistics Infrastructure" },
    ],
  },
  {
    slug: "metals-mining-chemicals",
    name: "Metals, Mining & Chemicals",
    subsectors: [
      { slug: "steel", name: "Steel" },
      { slug: "non-ferrous-metals", name: "Non-Ferrous Metals" },
      { slug: "mining-coal", name: "Mining & Coal" },
      { slug: "chemicals-petrochemicals", name: "Chemicals & Petrochemicals" },
      { slug: "specialty-chemicals-agrochemicals", name: "Specialty Chemicals & Agrochemicals" },
    ],
  },
  {
    slug: "agriculture-allied",
    name: "Agriculture & Allied",
    subsectors: [
      { slug: "agriculture-farm-inputs", name: "Agriculture & Farm Inputs" },
      { slug: "agritech", name: "Agritech" },
      { slug: "food-processing", name: "Food Processing" },
      { slug: "fertilizers", name: "Fertilizers" },
      { slug: "dairy-animal-husbandry", name: "Dairy & Animal Husbandry" },
    ],
  },
  {
    slug: "transportation-logistics",
    name: "Transportation & Logistics",
    subsectors: [
      { slug: "aviation", name: "Aviation" },
      { slug: "railways", name: "Railways" },
      { slug: "shipping-ports", name: "Shipping & Ports" },
      { slug: "road-logistics-3pl", name: "Road Logistics & 3PL" },
      { slug: "warehousing-supply-chain-tech", name: "Warehousing & Supply Chain Tech" },
    ],
  },
  {
    slug: "media-entertainment-gaming",
    name: "Media, Entertainment & Gaming",
    subsectors: [
      { slug: "television-film", name: "Television & Film" },
      { slug: "digital-media-ott", name: "Digital Media & OTT" },
      { slug: "gaming-esports", name: "Gaming & Esports" },
      { slug: "advertising-adtech", name: "Advertising & AdTech" },
    ],
  },
  {
    slug: "education-skilling",
    name: "Education & Skilling",
    subsectors: [
      { slug: "k12-education", name: "K-12 Education" },
      { slug: "higher-education", name: "Higher Education" },
      { slug: "edtech", name: "EdTech" },
      { slug: "vocational-training-skilling", name: "Vocational Training & Skilling" },
    ],
  },
  {
    slug: "hospitality-travel",
    name: "Hospitality & Travel",
    subsectors: [
      { slug: "hotels-resorts", name: "Hotels & Resorts" },
      { slug: "travel-tourism-otas", name: "Travel, Tourism & OTAs" },
    ],
  },
  {
    slug: "public-sector-government-defense",
    name: "Public Sector, Government & Defense",
    subsectors: [
      { slug: "defense-aerospace", name: "Defense & Aerospace" },
      { slug: "government-psu-enterprises", name: "Government & PSU Enterprises" },
      { slug: "space-satellite", name: "Space & Satellite" },
    ],
  },
];

export function findSubsector(
  industrySlug: string,
  subsectorSlug: string,
): { industry: Industry; subsector: IndustrySubsector } | null {
  const industry = INDUSTRY_TAXONOMY.find((i) => i.slug === industrySlug);
  if (!industry) return null;

  const subsector = industry.subsectors.find((s) => s.slug === subsectorSlug);
  if (!subsector) return null;

  return { industry, subsector };
}
