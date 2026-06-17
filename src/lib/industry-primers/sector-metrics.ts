export interface SectorMetricDef {
  key: string;
  label: string;
  hint: string;
}

export function getSectorMetricDefs(
  industryName: string,
  subsectorName: string,
): SectorMetricDef[] | null {
  const ind = industryName.toLowerCase();
  const sub = subsectorName.toLowerCase();

  // ── Energy & Power ───────────────────────────────────────────────────────────

  if (/renewable|solar|wind|hybrid/i.test(sub)) {
    return [
      { key: "installed_capacity",  label: "Installed Capacity",            hint: "Operational capacity in GW/MW, e.g. '12.3 GW'" },
      { key: "pipeline",            label: "Under-construction Pipeline",   hint: "Capacity under construction, e.g. '8.1 GW'" },
      { key: "plf_cuf",            label: "PLF / CUF",                     hint: "Plant Load Factor or CUF as %, e.g. '25% CUF (solar)'" },
      { key: "ppa_tariff",         label: "Avg PPA Tariff",                hint: "₹ per kWh, e.g. '₹2.85/kWh'" },
      { key: "net_debt_per_mw",    label: "Net Debt per MW",               hint: "₹ Crores per MW, e.g. '₹4.2 Cr/MW'" },
    ];
  }

  if (/conventional|thermal|hydro|nuclear/i.test(sub)) {
    return [
      { key: "installed_capacity",  label: "Installed Capacity",            hint: "Total operational capacity in GW/MW, e.g. '5.8 GW'" },
      { key: "plf",                label: "Plant Load Factor (PLF)",        hint: "As %, e.g. '62%'" },
      { key: "fuel_cost",          label: "Fuel Cost (₹/unit)",            hint: "Fuel cost per kWh generated, e.g. '₹2.10/kWh'" },
      { key: "station_heat_rate",  label: "Station Heat Rate",             hint: "kcal/kWh, lower is better, e.g. '2,450 kcal/kWh'" },
      { key: "average_tariff",     label: "Average Realised Tariff",       hint: "₹ per kWh billed to discoms, e.g. '₹4.20/kWh'" },
    ];
  }

  if (/transmission|distribution|grid/i.test(sub)) {
    return [
      { key: "transmission_lines", label: "Transmission Lines (ckm)",      hint: "Circuit km of lines owned/operated, e.g. '45,000 ckm'" },
      { key: "transformer_cap",    label: "Transformer Capacity",          hint: "Installed MVA capacity, e.g. '1,20,000 MVA'" },
      { key: "atc_losses",        label: "AT&C Losses",                   hint: "Aggregate technical & commercial losses as %, e.g. '14%'" },
      { key: "capex_plan",        label: "Annual Capex",                  hint: "₹ Crores planned/spent on network, e.g. '₹12,000 Cr'" },
      { key: "regulated_equity",  label: "Regulated Equity Base",         hint: "₹ Crores of regulated equity earning fixed returns, e.g. '₹28,000 Cr'" },
    ];
  }

  if (/oil.?gas|petroleum|upstream|downstream/i.test(sub)) {
    return [
      { key: "production",        label: "Production (kboe/d)",            hint: "Thousand barrels of oil equivalent per day, e.g. '380 kboe/d'" },
      { key: "reserves_2p",      label: "2P Reserves",                    hint: "Proven + probable reserves in MMboe, e.g. '850 MMboe'" },
      { key: "grm",              label: "Gross Refining Margin (GRM)",     hint: "$ per barrel, e.g. '$8.4/bbl'" },
      { key: "pipeline_throughput",label:"Pipeline Throughput",            hint: "MMTPA of product moved, e.g. '85 MMTPA'" },
      { key: "capex",            label: "Capex Guidance",                 hint: "₹ Crores annual capex, e.g. '₹35,000 Cr'" },
    ];
  }

  if (/storage|green hydrogen|battery storage|electrolyzer/i.test(sub)) {
    return [
      { key: "storage_capacity",  label: "Storage Capacity (GWh)",        hint: "Operational or contracted GWh, e.g. '1.2 GWh'" },
      { key: "electrolyzer_cap",  label: "Electrolyzer Capacity",         hint: "MW of green hydrogen electrolyzer, e.g. '500 MW'" },
      { key: "offtake_signed",   label: "Offtake Agreements Signed",     hint: "Volume of H2 or storage offtake contracted, e.g. '50,000 MTPA H2'" },
      { key: "lcoe",             label: "LCOE / H2 Cost",                hint: "₹/kWh for storage or $/kg for green H2, e.g. '$4.2/kg H2'" },
      { key: "order_book",       label: "Project Pipeline / Order Book",  hint: "₹ Crores or GW/GWh of contracted projects, e.g. '₹8,000 Cr'" },
    ];
  }

  // ── Financial Services ────────────────────────────────────────────────────────

  if (/\bnbfc|microfinance|mfi\b/i.test(sub)) {
    return [
      { key: "aum",              label: "AUM / Loan Book",                hint: "₹ Crores, e.g. '₹42,000 Cr'" },
      { key: "disbursements",    label: "Disbursements Growth (YoY)",     hint: "As %, e.g. '22%'" },
      { key: "gnpa",             label: "GNPA Ratio",                     hint: "As % of portfolio, e.g. '3.1%'" },
      { key: "nim",              label: "Net Interest Margin (NIM)",      hint: "As %, e.g. '9.2%'" },
      { key: "car",              label: "Capital Adequacy Ratio",         hint: "As %, RBI min 15% for NBFCs, e.g. '22%'" },
      { key: "par30",            label: "PAR 30 (MFI)",                  hint: "Portfolio at risk > 30 days for MFIs, as %, e.g. '4.5%'" },
    ];
  }

  if (/\bbanking\b/i.test(sub)) {
    return [
      { key: "nim",              label: "Net Interest Margin (NIM)",      hint: "As %, e.g. '3.2%'" },
      { key: "gnpa",             label: "GNPA Ratio",                     hint: "Gross NPA as % of advances, e.g. '2.1%'" },
      { key: "nnpa",             label: "NNPA Ratio",                     hint: "Net NPA as % of net advances, e.g. '0.6%'" },
      { key: "pcr",              label: "Provision Coverage Ratio",       hint: "As %, e.g. '72%'" },
      { key: "casa",             label: "CASA Ratio",                     hint: "CASA deposits as % of total deposits, e.g. '44%'" },
      { key: "car",              label: "Capital Adequacy Ratio (CAR)",   hint: "As %, e.g. '16.3%'" },
      { key: "credit_cost",      label: "Credit Cost",                    hint: "As % of advances, e.g. '0.8%'" },
      { key: "advances_growth",  label: "Loan Book Growth (YoY)",        hint: "As %, e.g. '18%'" },
    ];
  }

  if (/insurance/i.test(sub)) {
    return [
      { key: "gwp_growth",       label: "Gross Written Premium Growth",   hint: "YoY as %, e.g. '14%'" },
      { key: "loss_ratio",       label: "Loss / Claims Ratio",            hint: "Claims as % of premiums, e.g. '68%'" },
      { key: "combined_ratio",   label: "Combined Ratio",                 hint: "Claims + expenses ÷ premiums, below 100% = profit, e.g. '102%'" },
      { key: "solvency_ratio",   label: "Solvency Ratio",                hint: "IRDAI minimum 150%, e.g. '204%'" },
      { key: "aum",              label: "AUM (Life / ULIP)",             hint: "₹ Crores for life/ULIP players, e.g. '₹3.2L Cr'; null for general insurance" },
    ];
  }

  if (/asset management|capital market|mutual fund|wealth management|amfi/i.test(sub)) {
    return [
      { key: "aum",              label: "Assets Under Management (AUM)",  hint: "₹ Crores total AUM, e.g. '₹6.8L Cr'" },
      { key: "equity_aum_pct",  label: "Equity AUM Share",              hint: "Equity AUM as % of total, e.g. '58%'; higher = better margins" },
      { key: "net_flows",       label: "Net Flows (YoY)",               hint: "₹ Crores net inflows in the period, e.g. '₹42,000 Cr'" },
      { key: "sip_book",        label: "SIP Book (Monthly)",            hint: "Monthly SIP run-rate in ₹ Crores, e.g. '₹3,400 Cr/month'" },
      { key: "revenue_yield",   label: "Revenue Yield on AUM",         hint: "Total revenue as % of avg AUM, e.g. '0.62%'" },
    ];
  }

  if (/fintech|digital payment|upi|payment gateway/i.test(sub)) {
    return [
      { key: "tpv",             label: "Total Payment Value (TPV)",      hint: "₹ Crores or $ Bn of payments processed, e.g. '₹18L Cr'" },
      { key: "market_share",    label: "UPI / Market Share",            hint: "% share of UPI transactions or segment, e.g. '14% UPI share'" },
      { key: "take_rate",       label: "Take Rate / Net Revenue Rate",  hint: "Basis points or % of TPV, e.g. '8 bps'" },
      { key: "active_users",    label: "Monthly Active Users (MAU)",    hint: "Millions of monthly active users, e.g. '320M MAU'" },
      { key: "arpu",            label: "Revenue per Active User",       hint: "₹ per user per month, e.g. '₹28/user'" },
    ];
  }

  // ── Technology & Internet ─────────────────────────────────────────────────────

  if (/it service|bpm|bpo|outsourc|tech service/i.test(sub)) {
    return [
      { key: "rev_per_employee",label: "Revenue per Employee",           hint: "₹ Lakhs or $ thousands per year, e.g. '₹28L' or '$52K'" },
      { key: "utilisation",     label: "Billed Utilisation Rate",        hint: "As %, e.g. '83%'" },
      { key: "attrition",       label: "Attrition Rate (TTM)",           hint: "As %, e.g. '19%'" },
      { key: "headcount",       label: "Total Headcount",                hint: "Number of employees, e.g. '3,20,000'" },
      { key: "deal_wins_tcv",   label: "Deal Wins (TCV)",                hint: "Total contract value of new deals, e.g. '$4.2B' or '₹18,000 Cr'" },
      { key: "offshore_mix",    label: "Offshore Revenue Mix",           hint: "Offshore as % of total, e.g. '64%'" },
    ];
  }

  if (/saas|software product|cloud software/i.test(sub)) {
    return [
      { key: "arr",             label: "Annual Recurring Revenue (ARR)", hint: "₹ Crores or $ Mn, e.g. '$280M ARR'" },
      { key: "nrr",             label: "Net Revenue Retention (NRR)",   hint: "As %, above 100% = expansion, e.g. '118%'" },
      { key: "cac_payback",     label: "CAC Payback Period",            hint: "Months to recover customer acquisition cost, e.g. '18 months'" },
      { key: "gross_margin",    label: "Gross Margin",                  hint: "SaaS gross margins are typically 65–85%, e.g. '74%'" },
      { key: "churn_rate",      label: "Annual Churn Rate",             hint: "% of ARR lost per year, e.g. '8%'" },
    ];
  }

  if (/e.?commerce|quick commerce|q-comm|direct.to.consumer/i.test(sub)) {
    return [
      { key: "gmv",             label: "GMV",                           hint: "₹ Crores gross merchandise value, e.g. '₹92,000 Cr'" },
      { key: "order_count",     label: "Order Volume",                  hint: "Orders per day or per year, e.g. '12M orders/day'" },
      { key: "aov",             label: "Average Order Value (AOV)",     hint: "₹ per order, e.g. '₹650'" },
      { key: "take_rate",       label: "Platform Take Rate",            hint: "Revenue as % of GMV, e.g. '14%'" },
      { key: "delivery_time",   label: "Avg Delivery Time",            hint: "Minutes or hours, e.g. '12 min' (q-comm) or '1.8 days' (e-comm)" },
      { key: "contribution_margin", label: "Contribution Margin",      hint: "Per-order margin after variable costs, e.g. '₹42/order'" },
    ];
  }

  if (/internet|consumer tech|platform|super.?app|social/i.test(sub)) {
    return [
      { key: "mau",             label: "Monthly Active Users (MAU)",    hint: "Millions, e.g. '480M MAU'" },
      { key: "dau_mau",         label: "DAU / MAU Ratio",              hint: "Stickiness ratio, e.g. '62%'" },
      { key: "time_on_platform",label: "Avg Time on Platform",         hint: "Minutes per day per user, e.g. '42 min/day'" },
      { key: "arpu",            label: "ARPU",                         hint: "₹ per active user per month, e.g. '₹35/user'" },
      { key: "cohort_retention",label: "12-Month Cohort Retention",    hint: "% of users still active after 12 months, e.g. '38%'" },
    ];
  }

  if (/telecom|telco|wireless|broadband|mobile network/i.test(sub)) {
    return [
      { key: "arpu",            label: "ARPU",                         hint: "₹/user/month, e.g. '₹198/month'" },
      { key: "subscribers",     label: "Total Subscribers",            hint: "Millions, e.g. '480M'" },
      { key: "data_per_sub",    label: "Data Usage per Sub",           hint: "GB/sub/month, e.g. '19.2 GB/month'" },
      { key: "capex_intensity", label: "Capex / Revenue",              hint: "As %, e.g. '24%'" },
      { key: "churn",           label: "Monthly Churn Rate",           hint: "As %, e.g. '1.8%/month'" },
    ];
  }

  // ── Healthcare & Pharma ───────────────────────────────────────────────────────

  if (/pharmaceutical|pharma|generic|drug|formulation/i.test(sub)) {
    return [
      { key: "rd_spend",        label: "R&D Spend (% Revenue)",        hint: "As %, e.g. '7.2%'" },
      { key: "us_revenue_pct",  label: "US Revenue Share",             hint: "US market as % of total, e.g. '38%'" },
      { key: "anda_filings",    label: "ANDA Filings (cumulative)",    hint: "Number with US FDA, e.g. '512 ANDAs'" },
      { key: "api_share",       label: "API Revenue Share",            hint: "API segment as % of revenue, e.g. '22%'" },
      { key: "domestic_growth", label: "Domestic Formulations Growth", hint: "YoY domestic revenue growth, e.g. '12%'" },
    ];
  }

  if (/hospital|healthcare delivery|clinic/i.test(sub)) {
    return [
      { key: "alos",            label: "Avg Length of Stay (ALOS)",    hint: "Days per patient, e.g. '3.8 days'" },
      { key: "bed_occupancy",   label: "Bed Occupancy Rate",           hint: "As %, e.g. '68%'" },
      { key: "arpob",           label: "Revenue per Occupied Bed",     hint: "₹ per day, e.g. '₹28,000/day'" },
      { key: "operational_beds",label: "Operational Beds",             hint: "Number of beds, e.g. '8,200 beds'" },
      { key: "ebitda_margin",   label: "EBITDA Margin",                hint: "As %, e.g. '22%'" },
    ];
  }

  if (/diagnostic|medical device|pathology|imaging/i.test(sub)) {
    return [
      { key: "test_volumes",    label: "Test / Sample Volumes",        hint: "Tests per year, e.g. '120M tests'" },
      { key: "revenue_per_test",label: "Revenue per Patient / Test",   hint: "₹, e.g. '₹820/patient'" },
      { key: "collection_centres",label:"Collection Centres / Network",hint: "Number of centres, e.g. '4,200 collection points'" },
      { key: "ebitda_margin",   label: "EBITDA Margin",                hint: "As %, e.g. '28%'" },
      { key: "home_collection_pct",label:"Home Collection Mix",        hint: "% of samples collected at home, e.g. '32%'" },
    ];
  }

  if (/health.?tech|digital health|telemedicine|healthtech/i.test(sub)) {
    return [
      { key: "consultations",   label: "Consultations / GMV",          hint: "Monthly consultations or ₹ Crores of GMV, e.g. '6M consultations/month'" },
      { key: "mau",             label: "Monthly Active Users (MAU)",   hint: "Millions, e.g. '45M MAU'" },
      { key: "arpu",            label: "Revenue per Active User",      hint: "₹/month, e.g. '₹180/user'" },
      { key: "doctor_count",    label: "Doctors on Platform",          hint: "Number of verified doctors, e.g. '85,000 doctors'" },
      { key: "ebitda_margin",   label: "EBITDA Margin",                hint: "As %, e.g. '-8%' (many are pre-profitable)'" },
    ];
  }

  // ── Consumer & Retail ─────────────────────────────────────────────────────────

  if (/\bfmcg\b|fast moving consumer|household product|personal care/i.test(sub)) {
    return [
      { key: "volume_growth",   label: "Volume Growth (YoY)",          hint: "Price-neutral volume growth, e.g. '6%'" },
      { key: "gross_margin",    label: "Gross Margin",                 hint: "As %, e.g. '51%'" },
      { key: "ad_spend",        label: "A&P Spend (% Revenue)",        hint: "Advertising & promotion as % of revenue, e.g. '9%'" },
      { key: "distribution",    label: "Distribution Reach",           hint: "Number of retail outlets, e.g. '8.5M outlets'" },
      { key: "inventory_days",  label: "Inventory Days",               hint: "Days, e.g. '42 days'" },
    ];
  }

  if (/\bretail\b|organised retail|department store|specialty store/i.test(sub)) {
    return [
      { key: "sssg",            label: "Same-Store Sales Growth",      hint: "YoY like-for-like, e.g. '8%'" },
      { key: "revenue_per_sqft",label: "Revenue per Sq Ft",           hint: "₹ per sqft per year, e.g. '₹12,400/sqft'" },
      { key: "store_count",     label: "Store Count",                  hint: "Total operational stores, e.g. '3,800 stores'" },
      { key: "gross_margin",    label: "Gross Margin",                 hint: "As %, e.g. '35%'" },
      { key: "inventory_days",  label: "Inventory Days",               hint: "Days, e.g. '38 days'" },
    ];
  }

  if (/consumer durable|electronics|appliance|white goods/i.test(sub)) {
    return [
      { key: "market_share",    label: "Domestic Market Share",        hint: "% by volume or value in primary category, e.g. '28% in ACs'" },
      { key: "online_mix",      label: "Online Channel Mix",           hint: "Online as % of revenue, e.g. '38%'" },
      { key: "sssg",            label: "Same-Store Sales Growth",      hint: "YoY, e.g. '7%'" },
      { key: "working_capital", label: "Working Capital Days",         hint: "Days, e.g. '55 days'" },
      { key: "ebitda_margin",   label: "EBITDA Margin",                hint: "As %, e.g. '11%'" },
    ];
  }

  if (/apparel|textile|footwear|fashion|garment/i.test(sub)) {
    return [
      { key: "sssg",            label: "Same-Store Sales Growth",      hint: "YoY, e.g. '9%'" },
      { key: "revenue_per_sqft",label: "Revenue per Sq Ft",           hint: "₹/sqft/year, e.g. '₹8,200/sqft'" },
      { key: "sell_through",    label: "Sell-Through Rate",            hint: "% of inventory sold at full price, e.g. '72%'" },
      { key: "online_mix",      label: "Online Channel Mix",           hint: "As % of revenue, e.g. '22%'" },
      { key: "gross_margin",    label: "Gross Margin",                 hint: "As %, e.g. '56%'" },
    ];
  }

  if (/food|beverage|qsr|quick service|restaurant|cafe/i.test(sub)) {
    return [
      { key: "outlet_count",    label: "Total Outlet Count",           hint: "Number of stores/restaurants, e.g. '18,400 outlets'" },
      { key: "sssg",            label: "Same-Store Sales Growth",      hint: "YoY, e.g. '6%'" },
      { key: "auv",             label: "Avg Unit Volume (AUV)",        hint: "₹ revenue per outlet per year, e.g. '₹95L/outlet'" },
      { key: "ebitda_margin",   label: "EBITDA Margin (Restaurant)",   hint: "Store-level EBITDA margin, e.g. '18%'" },
      { key: "delivery_mix",    label: "Delivery / Zomato-Swiggy Mix", hint: "Online delivery as % of sales, e.g. '42%'" },
    ];
  }

  // ── Automotive & Industrial Manufacturing ─────────────────────────────────────

  if (/automotive oem|auto oem|passenger vehicle|commercial vehicle|two.?wheeler|three.?wheeler/i.test(sub)) {
    return [
      { key: "volumes",              label: "Total Volumes",                hint: "Units sold, e.g. '4,21,000 units'" },
      { key: "ebitda_per_vehicle",   label: "EBITDA per Vehicle",           hint: "₹ per vehicle, e.g. '₹1,12,000/vehicle'" },
      { key: "ev_mix",               label: "EV Mix",                       hint: "EV as % of total volumes, e.g. '18%'" },
      { key: "capacity_utilisation", label: "Capacity Utilisation",         hint: "As %, e.g. '74%'" },
      { key: "export_share",         label: "Export Share",                 hint: "Export volumes as % of total, e.g. '12%'" },
    ];
  }

  if (/auto component|auto part|ancillary/i.test(sub)) {
    return [
      { key: "content_per_vehicle",  label: "Content per Vehicle",          hint: "₹ per vehicle (wallet share), e.g. '₹28,000/vehicle'" },
      { key: "customer_concentration",label:"Top 3 Customer Concentration", hint: "Revenue from top 3 OEM customers as %, e.g. '62%'" },
      { key: "ev_revenue_mix",       label: "EV-Related Revenue Share",     hint: "Revenue from EV parts as % of total, e.g. '18%'" },
      { key: "ebitda_margin",        label: "EBITDA Margin",                hint: "As %, e.g. '14%'" },
      { key: "export_share",         label: "Export Share",                 hint: "As % of revenue, e.g. '32%'" },
    ];
  }

  if (/electric vehicle|battery|ev /i.test(sub)) {
    return [
      { key: "ev_volumes",           label: "EV Volumes Sold",              hint: "Units sold, e.g. '1,85,000 EVs'" },
      { key: "battery_cost",         label: "Battery Pack Cost",            hint: "$ per kWh, e.g. '$92/kWh'" },
      { key: "range",                label: "Range (km)",                   hint: "ARAI-certified range of flagship model, e.g. '450 km'" },
      { key: "charging_network",     label: "Charging Points Installed",    hint: "Own charging network size, e.g. '18,000 fast chargers'" },
      { key: "order_book",           label: "Order Backlog",                hint: "Pending orders in units or ₹ Crores, e.g. '₹12,000 Cr'" },
    ];
  }

  if (/industrial manufacturing|capital good|heavy engineering|machinery|equipment/i.test(sub)) {
    return [
      { key: "order_book",       label: "Order Book",                   hint: "₹ Crores total outstanding orders, e.g. '₹28,000 Cr'" },
      { key: "order_inflow",     label: "Order Inflow (YoY)",           hint: "New orders in ₹ Crores, e.g. '₹12,500 Cr'" },
      { key: "book_to_bill",     label: "Book-to-Bill Ratio",           hint: "Order book ÷ trailing revenue, e.g. '2.8x'" },
      { key: "ebitda_margin",    label: "EBITDA Margin",                hint: "As %, e.g. '16%'" },
      { key: "export_share",     label: "Export Revenue Share",         hint: "As %, e.g. '22%'" },
    ];
  }

  if (/electronics|semiconductor|chip|fab|pcb|display/i.test(sub)) {
    return [
      { key: "design_wins",     label: "Design Wins",                   hint: "New chip/product designs won in the year, e.g. '42 design wins'" },
      { key: "capacity_utilisation",label:"Fab / Assembly Utilisation", hint: "As %, e.g. '82%'" },
      { key: "ebitda_margin",   label: "EBITDA Margin",                 hint: "As %, e.g. '18%'" },
      { key: "export_share",    label: "Export Share",                  hint: "As % of revenue, e.g. '55%'" },
      { key: "r_and_d",         label: "R&D / Design Spend (% Revenue)",hint: "As %, e.g. '12%'" },
    ];
  }

  // ── Infrastructure, Real Estate & Construction ────────────────────────────────

  if (/real estate|realty|developer|housing|residential|commercial property/i.test(sub)) {
    return [
      { key: "pre_sales",        label: "Pre-sales / Bookings",         hint: "₹ Crores value of units booked, e.g. '₹8,200 Cr'" },
      { key: "collections",      label: "Collections",                  hint: "Cash collected in ₹ Crores, e.g. '₹6,100 Cr'" },
      { key: "net_debt",         label: "Net Debt",                     hint: "₹ Crores, e.g. '₹2,400 Cr'" },
      { key: "inventory_months", label: "Unsold Inventory",             hint: "Months of unsold stock, e.g. '14 months'" },
      { key: "realization",      label: "Realization per sqft",         hint: "₹/sqft avg selling price, e.g. '₹9,200/sqft'" },
      { key: "area_sold",        label: "Area Sold",                    hint: "Million sqft sold, e.g. '3.2 msf'" },
    ];
  }

  if (/construction|engineering|epc/i.test(sub)) {
    return [
      { key: "order_book",       label: "Order Book",                   hint: "₹ Crores, e.g. '₹42,000 Cr'" },
      { key: "order_inflow",     label: "Order Inflow (YoY)",           hint: "New orders in ₹ Crores, e.g. '₹18,500 Cr'" },
      { key: "book_to_bill",     label: "Book-to-Bill Ratio",           hint: "Order book ÷ trailing revenue, e.g. '3.2x'" },
      { key: "working_capital",  label: "Working Capital Days",         hint: "Days, e.g. '85 days'" },
    ];
  }

  if (/\bcement\b|building material/i.test(sub)) {
    return [
      { key: "volume",               label: "Volume",                       hint: "Dispatches in million tonnes, e.g. '52 MT'" },
      { key: "realization",          label: "Realization per Tonne",        hint: "₹/tonne, e.g. '₹5,800/tonne'" },
      { key: "ebitda_per_tonne",     label: "EBITDA per Tonne",             hint: "₹/tonne, e.g. '₹1,050/tonne'" },
      { key: "capacity_utilisation", label: "Capacity Utilisation",         hint: "As %, e.g. '77%'" },
    ];
  }

  if (/road|highway|urban infrastructure|metro|toll/i.test(sub)) {
    return [
      { key: "lane_km",          label: "Lane-km Operational",          hint: "Lane-km of toll road operated, e.g. '8,400 lane-km'" },
      { key: "toll_collection",  label: "Toll Collection (YoY)",        hint: "₹ Crores or YoY growth, e.g. '₹3,200 Cr (+18%)'" },
      { key: "order_book",       label: "HAM / Project Order Book",     hint: "₹ Crores of HAM/BOT projects under execution, e.g. '₹28,000 Cr'" },
      { key: "ebitda_margin",    label: "EBITDA Margin",                hint: "As %, e.g. '32%'" },
      { key: "interest_coverage",label: "Interest Coverage Ratio",      hint: "EBITDA ÷ interest, e.g. '2.8x'" },
    ];
  }

  if (/port|airport|logistics infrastructure/i.test(sub)) {
    return [
      { key: "throughput",       label: "Throughput",                   hint: "MTPA for ports, MPPA for airports, TEU for container, e.g. '180 MTPA'" },
      { key: "capacity_utilisation",label:"Capacity Utilisation",       hint: "As %, e.g. '72%'" },
      { key: "ebitda_per_tonne", label: "EBITDA per Unit",              hint: "₹/tonne or ₹/passenger, e.g. '₹280/tonne'" },
      { key: "revenue_per_pax",  label: "Non-Aero Revenue per Pax",    hint: "₹ per passenger (airports), e.g. '₹480/pax'; null for ports" },
    ];
  }

  // ── Metals, Mining & Chemicals ────────────────────────────────────────────────

  if (/\bsteel\b|flat steel|long steel|stainless/i.test(sub)) {
    return [
      { key: "volume",               label: "Steel Sales Volume",           hint: "Million tonnes, e.g. '18 MT'" },
      { key: "realization",          label: "Realization per Tonne",        hint: "₹/tonne, e.g. '₹62,000/tonne'" },
      { key: "ebitda_per_tonne",     label: "EBITDA per Tonne",             hint: "₹/tonne, e.g. '₹8,400/tonne'" },
      { key: "capacity_utilisation", label: "Capacity Utilisation",         hint: "As %, e.g. '84%'" },
      { key: "net_debt_ebitda",      label: "Net Debt / EBITDA",            hint: "x, e.g. '2.1x'" },
    ];
  }

  if (/non.?ferrous|aluminium|copper|zinc|lead|nickel/i.test(sub)) {
    return [
      { key: "production_volume",    label: "Production Volume",            hint: "Thousand tonnes (kt), e.g. '1,840 kt'" },
      { key: "lme_premium",          label: "LME Premium / Discount",       hint: "$ per tonne premium over LME, e.g. '$180/t premium'" },
      { key: "ebitda_per_tonne",     label: "EBITDA per Tonne",             hint: "$ or ₹ per tonne, e.g. '$580/tonne'" },
      { key: "energy_cost_pct",      label: "Energy Cost (% Revenue)",      hint: "Power & fuel as % of revenue (energy-intensive sector), e.g. '28%'" },
      { key: "mine_life",            label: "Mine Life Remaining",          hint: "Years of estimated remaining ore reserves, e.g. '25 years'" },
    ];
  }

  if (/mining|coal|iron ore|bauxite/i.test(sub)) {
    return [
      { key: "production",       label: "Production Volume",            hint: "Million tonnes, e.g. '28 MT coal'" },
      { key: "e_auction_premium",label: "E-Auction Premium",            hint: "Premium over notified price for coal, e.g. '48%'" },
      { key: "cost_of_production",label:"Cost of Production",           hint: "₹/tonne, e.g. '₹1,800/tonne'" },
      { key: "reserve_life",     label: "Reserve Life",                 hint: "Years, e.g. '30 years'" },
      { key: "stripping_ratio",  label: "Stripping Ratio",              hint: "Overburden:ore ratio, e.g. '3.2:1'" },
    ];
  }

  if (/chemical|petrochemical|specialty chemical|agrochemical/i.test(sub)) {
    return [
      { key: "capacity_utilisation",label:"Capacity Utilisation",       hint: "As %, e.g. '82%'" },
      { key: "ebitda_margin",   label: "EBITDA Margin",                 hint: "As %, e.g. '19%'" },
      { key: "export_share",    label: "Export Revenue Share",          hint: "As % of revenue, e.g. '44%'" },
      { key: "specialty_pct",   label: "Specialty / Value-Added Mix",  hint: "Specialty products as % of revenue, e.g. '62%'" },
      { key: "r_and_d",         label: "R&D Spend (% Revenue)",        hint: "As %, e.g. '4.2%'" },
    ];
  }

  // ── Agriculture & Allied ──────────────────────────────────────────────────────

  if (/agriculture|farm input|seed|pesticide|crop protection/i.test(sub)) {
    return [
      { key: "volume",          label: "Volume Sold",                   hint: "Tonnes or bags depending on product, e.g. '4.2L MT fertilizers'" },
      { key: "market_share",    label: "Domestic Market Share",         hint: "% in primary product category, e.g. '18% in herbicides'" },
      { key: "distribution",    label: "Distribution Reach",            hint: "Number of dealers/retailers, e.g. '1,20,000 dealers'" },
      { key: "ebitda_margin",   label: "EBITDA Margin",                 hint: "As %, e.g. '14%'" },
      { key: "export_share",    label: "Export Share",                  hint: "As % of revenue, e.g. '28%'" },
    ];
  }

  if (/agritech|agri.?tech|farmer platform|kisan/i.test(sub)) {
    return [
      { key: "farmer_reach",    label: "Registered Farmers",            hint: "Millions of farmers on platform, e.g. '12M farmers'" },
      { key: "gmv",             label: "Agricultural GMV",              hint: "₹ Crores of agri-produce traded/financed, e.g. '₹4,200 Cr'" },
      { key: "digital_adoption",label: "Digital Adoption Rate",         hint: "% of registered farmers actively transacting digitally, e.g. '38%'" },
      { key: "input_sales",     label: "Input Sales Revenue",           hint: "₹ Crores from seeds/pesticides/fertilizers sold via platform, e.g. '₹820 Cr'" },
    ];
  }

  if (/food processing|packaged food|processed food/i.test(sub)) {
    return [
      { key: "capacity_utilisation",label:"Capacity Utilisation",       hint: "As %, e.g. '68%'" },
      { key: "branded_revenue_pct",label:"Branded Revenue Share",       hint: "Branded vs commodity split, e.g. '72% branded'" },
      { key: "ebitda_margin",   label: "EBITDA Margin",                 hint: "As %, e.g. '12%'" },
      { key: "export_share",    label: "Export Share",                  hint: "As % of revenue, e.g. '35%'" },
      { key: "working_capital", label: "Working Capital Days",          hint: "Days, e.g. '48 days'" },
    ];
  }

  if (/fertilizer|urea|dap|npk/i.test(sub)) {
    return [
      { key: "volume",          label: "Sales Volume",                  hint: "Lakh MT, e.g. '42L MT'" },
      { key: "subsidy_dependence",label:"Govt Subsidy as % Revenue",   hint: "Subsidy receipts as % of total revenue, e.g. '58%'" },
      { key: "capacity_utilisation",label:"Capacity Utilisation",       hint: "As %, e.g. '86%'" },
      { key: "ebitda_margin",   label: "EBITDA Margin",                 hint: "As %, often thin due to subsidy delays, e.g. '9%'" },
      { key: "cost_of_production",label:"Cost of Production",           hint: "₹/MT of urea or DAP, e.g. '₹18,200/MT'" },
    ];
  }

  if (/dairy|animal husbandry|milk|poultry|livestock/i.test(sub)) {
    return [
      { key: "milk_procurement",label: "Milk Procurement",              hint: "Lakh litres per day (LLPD), e.g. '42 LLPD'" },
      { key: "realization",     label: "Realization per Litre",         hint: "₹/litre avg selling price, e.g. '₹52/litre'" },
      { key: "value_added_mix", label: "Value-Added Product (VAP) Mix", hint: "Cheese/butter/ice cream etc. as % of revenue, e.g. '38%'" },
      { key: "ebitda_margin",   label: "EBITDA Margin",                 hint: "As %, typically thin in raw milk, e.g. '8%'" },
    ];
  }

  // ── Transportation & Logistics ────────────────────────────────────────────────

  if (/aviation|airline|airport|aircraft/i.test(sub)) {
    return [
      { key: "rask",            label: "RASK (Revenue/ASK)",            hint: "Revenue per available seat-km in ₹ paise, e.g. '₹5.2/km'" },
      { key: "cask",            label: "CASK (Cost/ASK)",               hint: "Cost per available seat-km, e.g. '₹4.8/km'" },
      { key: "load_factor",     label: "Passenger Load Factor",         hint: "As %, e.g. '88%'" },
      { key: "fleet_size",      label: "Fleet Size",                    hint: "Number of aircraft in operation, e.g. '320 aircraft'" },
      { key: "on_time_performance",label:"On-Time Performance (OTP)",   hint: "% flights on time, e.g. '82%'" },
    ];
  }

  if (/railway|rail freight|train|wagon/i.test(sub)) {
    return [
      { key: "volume_ntkm",     label: "Volume (NTKM)",                 hint: "Net tonne-km of freight moved, billion, e.g. '750B NTKM'" },
      { key: "realization",     label: "Realization per NTKM",          hint: "₹ per net tonne-km, e.g. '₹1.82/NTKM'" },
      { key: "freight_mix",     label: "Freight Mix",                   hint: "Coal/iron ore/cement/food as % of volume, e.g. 'Coal 42%'" },
      { key: "wagon_turnaround",label: "Wagon Turnaround Time",         hint: "Days, lower is better, e.g. '5.2 days'" },
    ];
  }

  if (/shipping|port|vessel|container|maritime/i.test(sub)) {
    return [
      { key: "throughput",      label: "Throughput (MTPA / TEUs)",      hint: "MTPA for bulk ports, TEUs for container, e.g. '220 MTPA'" },
      { key: "capacity_utilisation",label:"Capacity Utilisation",       hint: "As %, e.g. '74%'" },
      { key: "ebitda_per_tonne",label: "EBITDA per Tonne",              hint: "₹/tonne, e.g. '₹280/tonne'" },
      { key: "charter_rate",    label: "Daily Charter Rate",            hint: "$ per day for vessels, e.g. '$28,000/day Supramax'" },
    ];
  }

  if (/road logistic|3pl|trucking|freight forwarding/i.test(sub)) {
    return [
      { key: "volume",          label: "Volume / Throughput",           hint: "Tonnes moved or parcels delivered, e.g. '42M tonnes'" },
      { key: "realization",     label: "Realization per Tonne-km",      hint: "₹/tonne-km, e.g. '₹2.80/tonne-km'" },
      { key: "fleet_size",      label: "Fleet Size",                    hint: "Number of owned+contracted trucks, e.g. '18,000 vehicles'" },
      { key: "asset_utilisation",label:"Asset Utilisation",             hint: "% of fleet earning revenue, e.g. '78%'" },
    ];
  }

  if (/warehousing|supply chain tech|cold chain|3pl tech/i.test(sub)) {
    return [
      { key: "gla",             label: "Gross Leasable Area (GLA)",     hint: "Million sqft of warehousing space, e.g. '42 msf GLA'" },
      { key: "occupancy",       label: "Occupancy Rate",                hint: "As %, e.g. '88%'" },
      { key: "wale",            label: "WALE",                          hint: "Weighted avg lease expiry in years, e.g. '3.8 years'" },
      { key: "ebitda_margin",   label: "EBITDA Margin",                 hint: "As %, e.g. '28%'" },
    ];
  }

  // ── Media, Entertainment & Gaming ─────────────────────────────────────────────

  if (/television|film|studio|movie|broadcast/i.test(sub)) {
    return [
      { key: "subscription_rev", label: "Subscription Revenue",         hint: "₹ Crores, e.g. '₹2,400 Cr'" },
      { key: "ad_revenue",       label: "Advertising Revenue",          hint: "₹ Crores, e.g. '₹1,800 Cr'" },
      { key: "subscribers",      label: "Pay Subscribers",              hint: "Millions of paying subscribers, e.g. '42M'" },
      { key: "arpu",             label: "ARPU",                         hint: "₹/subscriber/month, e.g. '₹125/month'" },
    ];
  }

  if (/digital media|ott|streaming|video platform/i.test(sub)) {
    return [
      { key: "paid_subscribers", label: "Paid Subscribers",             hint: "Millions, e.g. '38M paid subs'" },
      { key: "arpu",             label: "ARPU",                         hint: "₹/subscriber/month, e.g. '₹148/month'" },
      { key: "churn",            label: "Monthly Churn Rate",           hint: "As %, e.g. '2.8%/month'" },
      { key: "content_spend",    label: "Content Spend (% Revenue)",    hint: "Content investment as % of revenue, e.g. '42%'" },
      { key: "mau",              label: "Monthly Active Users (MAU)",   hint: "Millions, e.g. '320M MAU'" },
    ];
  }

  if (/gaming|esport|mobile game|video game/i.test(sub)) {
    return [
      { key: "mau",              label: "Monthly Active Users (MAU)",   hint: "Millions, e.g. '85M MAU'" },
      { key: "dau_mau",          label: "DAU / MAU Ratio",             hint: "Stickiness metric, e.g. '55%'" },
      { key: "arpu",             label: "ARPU (Paying Users)",          hint: "₹/month for paying users, e.g. '₹680/month'" },
      { key: "conversion_rate",  label: "Paid Conversion Rate",        hint: "% of MAU who pay, e.g. '4.2%'" },
      { key: "session_length",   label: "Avg Session Length",          hint: "Minutes per session, e.g. '28 min'" },
    ];
  }

  if (/advertis|adtech|media agency|programmatic/i.test(sub)) {
    return [
      { key: "digital_ad_share", label: "Digital Ad Revenue Share",    hint: "Digital as % of total ad revenue, e.g. '62%'" },
      { key: "programmatic_pct", label: "Programmatic Mix",            hint: "Programmatic as % of digital ad inventory, e.g. '45%'" },
      { key: "publisher_reach",  label: "Publisher / Audience Reach",  hint: "Monthly unique users reached, e.g. '480M users'" },
      { key: "ebitda_margin",    label: "EBITDA Margin",               hint: "As %, e.g. '18%'" },
    ];
  }

  // ── Education & Skilling ──────────────────────────────────────────────────────

  if (/k.?12|k12|school|primary|secondary education/i.test(sub)) {
    return [
      { key: "enrolled_students",label: "Enrolled Students",            hint: "Total students enrolled, e.g. '1.2L students'" },
      { key: "fee_realization",  label: "Fee per Student (Annual)",     hint: "₹/student/year, e.g. '₹85,000/student'" },
      { key: "capacity_utilisation",label:"Campus Utilisation",          hint: "Seats filled as % of capacity, e.g. '82%'" },
      { key: "teacher_student",  label: "Teacher-Student Ratio",        hint: "e.g. '1:28'" },
    ];
  }

  if (/higher education|university|college|engineering college|mba/i.test(sub)) {
    return [
      { key: "enrolled_students",label: "Enrolled Students",            hint: "Total enrolment across programs, e.g. '45,000 students'" },
      { key: "placement_rate",   label: "Placement Rate",               hint: "% of eligible students placed, e.g. '94%'" },
      { key: "fee_realization",  label: "Fee Realization",              hint: "Avg annual fee in ₹, e.g. '₹2.8L/year'" },
      { key: "campus_count",     label: "Campus Count",                 hint: "Number of campuses, e.g. '14 campuses'" },
    ];
  }

  if (/edtech|online education|online learning/i.test(sub)) {
    return [
      { key: "paid_subscribers", label: "Paid Learners / Subscribers",  hint: "Millions of paid users, e.g. '4.2M paid learners'" },
      { key: "revenue_per_learner",label:"Revenue per Learner",         hint: "₹/year, e.g. '₹12,400/learner'" },
      { key: "completion_rate",  label: "Course Completion Rate",       hint: "% of enrolled learners who complete, e.g. '38%'" },
      { key: "b2b_mix",          label: "B2B Revenue Share",            hint: "Enterprise/institutional as % of revenue, e.g. '42%'" },
    ];
  }

  if (/vocational|skilling|skill development|vocation training/i.test(sub)) {
    return [
      { key: "trainees",         label: "Trainees Enrolled (Annual)",   hint: "Number of trainees per year, e.g. '2.8L trainees'" },
      { key: "placement_rate",   label: "Job Placement Rate",           hint: "% placed within 6 months of completion, e.g. '72%'" },
      { key: "industry_partners",label: "Industry Partnerships",        hint: "Number of employer tie-ups for placement, e.g. '850 employers'" },
      { key: "govt_funded_pct",  label: "Govt-Funded Revenue Share",   hint: "PMKVY / NSDC funding as % of revenue, e.g. '45%'" },
    ];
  }

  // ── Hospitality & Travel ──────────────────────────────────────────────────────

  if (/hotel|resort|hospitality|accommodation/i.test(sub)) {
    return [
      { key: "revpar",           label: "RevPAR",                       hint: "₹/available room/night, e.g. '₹6,400'" },
      { key: "occupancy",        label: "Occupancy Rate",               hint: "As %, e.g. '71%'" },
      { key: "adr",              label: "ADR (Avg Daily Rate)",         hint: "₹/room/night, e.g. '₹9,100'" },
      { key: "room_inventory",   label: "Room Inventory",               hint: "Total operational keys, e.g. '12,400 keys'" },
    ];
  }

  if (/travel|tourism|ota|online travel|tour operator/i.test(sub)) {
    return [
      { key: "gmv",              label: "Gross Bookings / GMV",         hint: "₹ Crores of total bookings, e.g. '₹48,000 Cr'" },
      { key: "take_rate",        label: "Net Revenue Take Rate",        hint: "Net revenue as % of GMV, e.g. '6.2%'" },
      { key: "transactions",     label: "Transactions / Bookings",      hint: "Bookings per year, e.g. '42M bookings'" },
      { key: "active_customers", label: "Active Customers (Annual)",    hint: "Millions who transacted, e.g. '32M customers'" },
      { key: "ebitda_margin",    label: "EBITDA Margin",                hint: "As %, e.g. '9%'" },
    ];
  }

  // ── Public Sector, Government & Defense ──────────────────────────────────────

  if (/defense|defence|aerospace|military|weapon|ordnance/i.test(sub)) {
    return [
      { key: "order_book",       label: "Order Book",                   hint: "₹ Crores total outstanding, e.g. '₹94,000 Cr'" },
      { key: "order_inflow",     label: "Order Inflow (YoY)",           hint: "New orders in ₹ Crores, e.g. '₹28,000 Cr'" },
      { key: "book_to_bill",     label: "Book-to-Bill Ratio",           hint: "Order book ÷ trailing revenue, e.g. '3.5x'" },
      { key: "export_share",     label: "Defence Export Share",         hint: "Export as % of defence revenue, e.g. '8%'" },
      { key: "rd_spend",         label: "R&D Spend (% Revenue)",        hint: "As %, e.g. '5.2%'" },
      { key: "govt_revenue_pct", label: "Govt / MoD Revenue Share",    hint: "As %, e.g. '92%'" },
      { key: "ebitda_margin",    label: "EBITDA Margin",                hint: "As %, e.g. '27%'" },
    ];
  }

  if (/government|psu|public sector enterprise|state.?owned/i.test(sub)) {
    return [
      { key: "revenue_growth",   label: "Revenue Growth (YoY)",         hint: "As %, e.g. '12%'" },
      { key: "pat_margin",       label: "PAT Margin",                   hint: "As %, e.g. '18%'" },
      { key: "capex",            label: "Annual Capex",                 hint: "₹ Crores, e.g. '₹22,000 Cr'" },
      { key: "roe",              label: "Return on Equity (ROE)",       hint: "As %, e.g. '14%'" },
      { key: "dividend_yield",   label: "Dividend Yield",               hint: "As %, e.g. '3.8%'" },
    ];
  }

  if (/space|satellite|launch vehicle|isro|sro/i.test(sub)) {
    return [
      { key: "launch_count",     label: "Launches per Year",            hint: "Number of satellite / rocket launches, e.g. '8 launches'" },
      { key: "satellites_orbit", label: "Satellites in Orbit",         hint: "Number of operational satellites, e.g. '58 satellites'" },
      { key: "payload_capacity", label: "Payload Capacity (kg to LEO)", hint: "kg to Low Earth Orbit, e.g. '10,000 kg to LEO'" },
      { key: "contract_wins",    label: "Commercial Contract Wins",     hint: "₹ Crores or $ Mn of new commercial contracts, e.g. '$420M'" },
      { key: "revenue_growth",   label: "Revenue Growth (YoY)",         hint: "As %, e.g. '28%'" },
    ];
  }

  return null;
}
