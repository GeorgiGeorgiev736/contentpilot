import { useState, useEffect } from "react";
import { credits as creditsApi } from "../services/api";

// Fallback costs (mirrors backend creditCosts.js) used before API responds
const FALLBACK = {
  scan_trends:          3,
  analyze_trend:        2,
  generate_script:      5,
  optimize_video:       2,
  generate_thumbnail:   2,
  analyze_thumbnail:    1,
  analyze_growth:       2,
  revenue_strategy:     3,
  schedule_title:       1,
  schedule_description: 2,
  schedule_hashtags:    1,
  trend:    3, virality: 1, idea: 1,
  script:   5, thumbnail: 2, tags: 1, schedule: 1,
};

let cachedCosts = null;

export function useCreditCosts() {
  const [costs, setCosts] = useState(cachedCosts || FALLBACK);

  useEffect(() => {
    if (cachedCosts) return;
    creditsApi.costs()
      .then(({ costs: c }) => { cachedCosts = c; setCosts(c); })
      .catch(() => {});
  }, []);

  const getCost = (feature) => costs[feature] ?? 1;
  return { costs, getCost };
}
