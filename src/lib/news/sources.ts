export interface NewsSource {
  name: string;
  feedUrl: string;
}

export const NEWS_SOURCES: NewsSource[] = [
  { name: "Zerodha Aftermarket Report", feedUrl: "https://aftermarketreport.zerodha.com/feed" },
  { name: "Capital Letters by Angel One", feedUrl: "https://capitallettersangelone.substack.com/feed" },
  { name: "The Daily Brief by Zerodha", feedUrl: "https://thedailybrief.zerodha.com/feed" },
  { name: "In The Money by Zerodha", feedUrl: "https://inthemoneybyzerodha.substack.com/feed" },
  { name: "ET Energy", feedUrl: "https://energy.economictimes.indiatimes.com/rss/topstories" },
  { name: "Aswath Damodaran", feedUrl: "https://aswathdamodaran.substack.com/feed" },
  { name: "Finshots", feedUrl: "https://finshots.in/rss/" },
];
