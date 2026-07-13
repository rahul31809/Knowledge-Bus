// Known Indian business/regulatory entities → their canonical URLs.
// Applied in primer and company analysis markdown to auto-link first occurrence.
const ENTITY_TABLE: { term: string; url: string }[] = [
  // Regulators
  { term: "SEBI", url: "https://www.sebi.gov.in" },
  { term: "RBI", url: "https://www.rbi.org.in" },
  { term: "IRDAI", url: "https://www.irdai.gov.in" },
  { term: "TRAI", url: "https://www.trai.gov.in" },
  { term: "CCI", url: "https://www.cci.gov.in" },
  { term: "CERC", url: "https://www.cercind.gov.in" },
  { term: "MNRE", url: "https://mnre.gov.in" },
  { term: "NITI Aayog", url: "https://www.niti.gov.in" },
  { term: "NSE", url: "https://www.nseindia.com" },
  { term: "BSE", url: "https://www.bseindia.com" },
  { term: "NCLT", url: "https://nclt.gov.in" },
  { term: "IBBI", url: "https://www.ibbi.gov.in" },
  { term: "PFRDA", url: "https://www.pfrda.org.in" },
  { term: "AMFI", url: "https://www.amfiindia.com" },
  { term: "DIPAM", url: "https://dipam.gov.in" },
  { term: "DPIIT", url: "https://dpiit.gov.in" },
  { term: "MoP", url: "https://powermin.gov.in" },
  { term: "CEA", url: "https://cea.nic.in" },
  // Financial instruments
  { term: "REITs", url: "https://www.sebi.gov.in/sebi_data/attachdocs/apr-2014/1397381459745.pdf" },
  { term: "InvITs", url: "https://www.sebi.gov.in/legal/regulations/aug-2014/sebi-infrastructure-investment-trusts-regulations-2014_29718.html" },
  // Key schemes / policy bodies
  { term: "Make in India", url: "https://www.makeinindia.com" },
  { term: "Startup India", url: "https://www.startupindia.gov.in" },
  { term: "Digital India", url: "https://www.digitalindia.gov.in" },
  { term: "GeM", url: "https://gem.gov.in" },
  { term: "ONDC", url: "https://ondc.org" },
  { term: "UPI", url: "https://www.npci.org.in/what-we-do/upi/product-overview" },
  { term: "NPCI", url: "https://www.npci.org.in" },
];

export function addEntityLinks(markdown: string): string {
  // Split on existing markdown links so we don't double-link
  const parts = markdown.split(/(\[.*?\]\(.*?\))/);
  return parts
    .map((part, i) => {
      // Odd-indexed parts are already-linked spans — skip them
      if (i % 2 === 1) return part;
      let result = part;
      for (const { term, url } of ENTITY_TABLE) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`\\b${escaped}\\b`, "g");
        result = result.replace(re, (match) => `[${match}](${url})`);
      }
      return result;
    })
    .join("");
}
