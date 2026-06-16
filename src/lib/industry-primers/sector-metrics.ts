export interface SectorMetricDef {
  key: string;
  label: string;
  hint: string; // tells Gemini what to return and how to format
}

export function getSectorMetricDefs(
  industryName: string,
  subsectorName: string
): SectorMetricDef[] | null {
  const text = `${industryName} ${subsectorName}`.toLowerCase();

  if (/bank|npa|nbfc|lending|credit|microfinance|financial service/i.test(text)) {
    return [
      { key: "nim",            label: "Net Interest Margin (NIM)",       hint: "NIM as %, e.g. '3.2%'" },
      { key: "gnpa",           label: "GNPA Ratio",                      hint: "Gross NPA as % of advances, e.g. '2.1%'" },
      { key: "nnpa",           label: "NNPA Ratio",                      hint: "Net NPA as % of net advances, e.g. '0.6%'" },
      { key: "pcr",            label: "Provision Coverage Ratio",        hint: "PCR as %, e.g. '72%'" },
      { key: "casa",           label: "CASA Ratio",                      hint: "CASA deposits as % of total deposits, e.g. '44%'" },
      { key: "car",            label: "Capital Adequacy Ratio (CAR)",    hint: "CAR/CRAR as %, e.g. '16.3%'" },
      { key: "credit_cost",    label: "Credit Cost",                     hint: "Credit cost as % of advances, e.g. '0.8%'" },
      { key: "advances_growth",label: "Loan Book Growth (YoY)",          hint: "YoY growth in loan/advances book, e.g. '18%'" },
      { key: "nii",            label: "Net Interest Income (NII)",       hint: "NII in ₹ Crores, e.g. '₹12,400 Cr'" },
    ];
  }

  if (/insurance/i.test(text)) {
    return [
      { key: "gwp_growth",      label: "Gross Written Premium Growth",   hint: "YoY GWP growth as %, e.g. '14%'" },
      { key: "loss_ratio",      label: "Loss / Claims Ratio",            hint: "Claims as % of premiums, e.g. '68%'" },
      { key: "combined_ratio",  label: "Combined Ratio",                 hint: "Claims + expenses as % of premiums, e.g. '102%'; below 100% = underwriting profit" },
      { key: "solvency_ratio",  label: "Solvency Ratio",                hint: "Solvency margin as %, IRDAI minimum 150%, e.g. '204%'" },
      { key: "aum",             label: "AUM (Life / ULIP)",             hint: "AUM in ₹ Crores if life/ULIP insurer, else null" },
    ];
  }

  if (/real estate|realty|developer|housing|property/i.test(text)) {
    return [
      { key: "pre_sales",       label: "Pre-sales / Bookings",          hint: "Value of units booked in ₹ Crores, e.g. '₹8,200 Cr'" },
      { key: "collections",     label: "Collections",                   hint: "Cash collected in ₹ Crores, e.g. '₹6,100 Cr'" },
      { key: "net_debt",        label: "Net Debt",                      hint: "Net debt in ₹ Crores, e.g. '₹2,400 Cr'" },
      { key: "inventory_months",label: "Unsold Inventory",              hint: "Months of unsold inventory, e.g. '14 months'" },
      { key: "realization",     label: "Realization per sqft",          hint: "₹ per sqft average selling price, e.g. '₹9,200/sqft'" },
      { key: "area_sold",       label: "Area Sold",                     hint: "Million sqft sold, e.g. '3.2 msf'" },
    ];
  }

  if (/it |software|saas|digital service|tech service|information technology|bpo|outsourc/i.test(text)) {
    return [
      { key: "rev_per_employee",label: "Revenue per Employee",          hint: "₹ Lakhs or $ thousands per employee per year, e.g. '₹28L' or '$52K'" },
      { key: "utilisation",     label: "Billed Utilisation Rate",       hint: "Billed utilisation as %, e.g. '83%'" },
      { key: "attrition",       label: "Attrition Rate (TTM)",          hint: "Annual attrition as %, e.g. '19%'" },
      { key: "headcount",       label: "Total Headcount",               hint: "Number of employees, e.g. '3,20,000'" },
      { key: "deal_wins_tcv",   label: "Deal Wins (TCV)",               hint: "Total contract value of new deals, e.g. '$4.2B' or '₹18,000 Cr'" },
      { key: "offshore_mix",    label: "Offshore Revenue Mix",          hint: "Offshore revenue as % of total, e.g. '64%'" },
    ];
  }

  if (/pharma|pharmaceutical|drug|generic|specialty medicine/i.test(text)) {
    return [
      { key: "rd_spend",        label: "R&D Spend (% Revenue)",         hint: "R&D as % of revenue, e.g. '7.2%'" },
      { key: "us_revenue_pct",  label: "US Revenue Share",              hint: "US exports / US market as % of total revenue, e.g. '38%'" },
      { key: "anda_filings",    label: "ANDA Filings (cumulative)",     hint: "Number of ANDA/NDA filings with US FDA, e.g. '512 ANDAs'" },
      { key: "api_share",       label: "API Revenue Share",             hint: "API segment revenue as %, e.g. '22%'" },
      { key: "branded_generic_split", label: "Branded / Generic Split", hint: "Branded vs generic revenue split, e.g. '60% / 40%'" },
    ];
  }

  if (/healthcare|hospital|diagnostic|pathology|clinic/i.test(text)) {
    return [
      { key: "alos",            label: "Avg Length of Stay (ALOS)",     hint: "Days per patient, e.g. '3.8 days'" },
      { key: "bed_occupancy",   label: "Bed Occupancy Rate",            hint: "As %, e.g. '68%'" },
      { key: "arpob",           label: "Revenue per Occupied Bed",      hint: "₹ per day, e.g. '₹28,000/day'" },
      { key: "operational_beds",label: "Operational Beds",              hint: "Number of beds, e.g. '8,200 beds'" },
      { key: "ebitda_margin",   label: "EBITDA Margin",                 hint: "As %, e.g. '22%'" },
    ];
  }

  if (/fmcg|consumer goods|food|beverage|packaged|household|personal care/i.test(text)) {
    return [
      { key: "volume_growth",   label: "Volume Growth (YoY)",           hint: "Volume growth % (price-neutral), e.g. '6%'" },
      { key: "gross_margin",    label: "Gross Margin",                  hint: "As %, e.g. '51%'" },
      { key: "ad_spend",        label: "A&P Spend (% Revenue)",         hint: "Advertising & promotion as % of revenue, e.g. '9%'" },
      { key: "distribution",    label: "Distribution Reach",            hint: "Number of retail outlets / direct reach, e.g. '8.5M outlets'" },
      { key: "inventory_days",  label: "Inventory Days",                hint: "Days of inventory, e.g. '42 days'" },
    ];
  }

  if (/auto|automobile|vehicle|ev |electric vehicle|two.?wheeler|four.?wheeler|passenger car|commercial vehicle/i.test(text)) {
    return [
      { key: "volumes",              label: "Total Volumes",                hint: "Units sold, e.g. '4,21,000 units'" },
      { key: "ebitda_per_vehicle",   label: "EBITDA per Vehicle",           hint: "₹ per vehicle, e.g. '₹1,12,000/vehicle'" },
      { key: "ev_mix",               label: "EV Mix",                       hint: "EV units as % of total volumes, e.g. '18%'" },
      { key: "capacity_utilisation", label: "Capacity Utilisation",         hint: "Manufacturing utilisation as %, e.g. '74%'" },
      { key: "export_share",         label: "Export Share",                 hint: "Export volumes as % of total, e.g. '12%'" },
    ];
  }

  if (/power|energy|renewable|solar|wind|electricity|generation|utility/i.test(text)) {
    return [
      { key: "installed_capacity",   label: "Installed Capacity",           hint: "Operational capacity in GW or MW, e.g. '12.3 GW'" },
      { key: "pipeline",             label: "Under-construction Pipeline",  hint: "Capacity under construction in GW/MW, e.g. '8.1 GW'" },
      { key: "plf_cuf",              label: "PLF / CUF",                    hint: "Plant Load Factor or Capacity Utilisation Factor as %, e.g. '25% CUF'" },
      { key: "ppa_tariff",           label: "Avg PPA Tariff",               hint: "₹ per kWh, e.g. '₹2.85/kWh'" },
      { key: "net_debt_per_mw",      label: "Net Debt per MW",              hint: "₹ Crores per MW, e.g. '₹4.2 Cr/MW'" },
    ];
  }

  if (/cement|building material/i.test(text)) {
    return [
      { key: "volume",               label: "Volume",                       hint: "Cement dispatches in million tonnes, e.g. '52 MT'" },
      { key: "realization",          label: "Realization per Tonne",        hint: "₹ per tonne, e.g. '₹5,800/tonne'" },
      { key: "ebitda_per_tonne",     label: "EBITDA per Tonne",             hint: "₹ per tonne, e.g. '₹1,050/tonne'" },
      { key: "capacity_utilisation", label: "Capacity Utilisation",         hint: "As %, e.g. '77%'" },
    ];
  }

  if (/infra|infrastructure|engineering|epc|construction|project/i.test(text)) {
    return [
      { key: "order_book",       label: "Order Book",                   hint: "₹ Crores, e.g. '₹42,000 Cr'" },
      { key: "order_inflow",     label: "Order Inflow (YoY)",           hint: "New orders won in the year in ₹ Crores, e.g. '₹18,500 Cr'" },
      { key: "book_to_bill",     label: "Book-to-Bill Ratio",           hint: "Order book ÷ trailing 12-month revenue, e.g. '3.2x'" },
      { key: "working_capital",  label: "Working Capital Days",         hint: "Days, e.g. '85 days'" },
    ];
  }

  if (/telecom|telco|wireless|broadband|mobile network/i.test(text)) {
    return [
      { key: "arpu",             label: "ARPU",                         hint: "Average Revenue per User per month in ₹, e.g. '₹198/month'" },
      { key: "subscribers",      label: "Total Subscribers",            hint: "Total subscriber base in millions, e.g. '480M'" },
      { key: "data_per_sub",     label: "Data Usage per Sub",           hint: "GB per subscriber per month, e.g. '19.2 GB/month'" },
      { key: "capex_intensity",  label: "Capex / Revenue",              hint: "As %, e.g. '24%'" },
      { key: "churn",            label: "Churn Rate",                   hint: "Monthly churn as %, e.g. '1.8%/month'" },
    ];
  }

  if (/retail|e-commerce|ecommerce|marketplace|d2c/i.test(text)) {
    return [
      { key: "gmv",              label: "GMV",                          hint: "Gross Merchandise Value in ₹ Crores or $ Mn, e.g. '₹92,000 Cr'" },
      { key: "sssg",             label: "Same-Store Sales Growth",      hint: "YoY growth in like-for-like stores, e.g. '8%'" },
      { key: "gross_margin",     label: "Gross Margin",                 hint: "As %, e.g. '35%'" },
      { key: "store_count",      label: "Store Count",                  hint: "Total operational stores, e.g. '3,800 stores'" },
      { key: "inventory_days",   label: "Inventory Days",               hint: "Days, e.g. '38 days'" },
    ];
  }

  if (/hotel|hospitality|tourism|travel|resort/i.test(text)) {
    return [
      { key: "revpar",           label: "RevPAR",                       hint: "Revenue per available room per night in ₹, e.g. '₹6,400'" },
      { key: "occupancy",        label: "Occupancy Rate",               hint: "As %, e.g. '71%'" },
      { key: "adr",              label: "ADR (Avg Daily Rate)",         hint: "₹ per room per night, e.g. '₹9,100'" },
      { key: "room_inventory",   label: "Room Inventory",               hint: "Total operational keys/rooms, e.g. '12,400 keys'" },
    ];
  }

  if (/logistics|freight|supply chain|warehouse|3pl|shipping|port/i.test(text)) {
    return [
      { key: "volume",           label: "Volume / Throughput",          hint: "Tonnes, TEUs, or parcels as appropriate, e.g. '42M TEUs'" },
      { key: "realization",      label: "Realization per Unit",         hint: "₹ per tonne or per parcel, e.g. '₹1,200/tonne'" },
      { key: "fleet",            label: "Fleet / Network Size",         hint: "Number of vehicles, vessels, or warehouses, e.g. '18,000 trucks'" },
      { key: "utilisation",      label: "Asset Utilisation",            hint: "As %, e.g. '78%'" },
    ];
  }

  if (/defense|defence|aerospace|military|weapon|armament|ordnance/i.test(text)) {
    return [
      { key: "order_book",       label: "Order Book",                   hint: "Total outstanding order book in ₹ Crores, e.g. '₹94,000 Cr'" },
      { key: "order_inflow",     label: "Order Inflow (YoY)",           hint: "New orders received in the year in ₹ Crores, e.g. '₹28,000 Cr'" },
      { key: "book_to_bill",     label: "Book-to-Bill Ratio",           hint: "Order book ÷ trailing 12-month revenue, e.g. '3.5x'" },
      { key: "export_share",     label: "Defence Export Share",         hint: "Export revenue as % of total defence revenue, e.g. '8%'" },
      { key: "rd_spend",         label: "R&D Spend (% Revenue)",        hint: "R&D expenditure as % of revenue, e.g. '5.2%'" },
      { key: "govt_revenue_pct", label: "Govt / MoD Revenue Share",     hint: "Revenue from Government / Ministry of Defence as %, e.g. '92%'" },
      { key: "ebitda_margin",    label: "EBITDA Margin",                hint: "As %, e.g. '27%'" },
    ];
  }

  // No specific sector mapping found
  return null;
}
