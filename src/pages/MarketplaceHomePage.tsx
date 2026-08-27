import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useStorefrontSite } from "@/contexts/StorefrontSiteContext";
import {
  findAiryHomeTheme,
  normalizeHomeVisual,
  type HomeVisualId,
  HOME_VISUAL_IDS,
} from "@/lib/homeVisuals";
import { HomeVisualClassic } from "@/components/home/visuals/HomeVisualClassic";
import { HomeVisual4, HomeVisual13 } from "@/components/home/visuals/HomeVisual4";
import { HomeVisualAiry } from "@/components/home/visuals/HomeVisualAiry";
import { HomeVisualShowcase } from "@/components/home/visuals/HomeVisualShowcase";

/** Accueil marketplace 3K-Négoce (univers + home_visual). */
const MarketplaceHomePage = () => {
  const { site } = useStorefrontSite();
  const [params] = useSearchParams();

  const visual = useMemo<HomeVisualId>(() => {
    const fromQuery = params.get("visuel");
    if (fromQuery && (HOME_VISUAL_IDS as string[]).includes(fromQuery)) {
      return fromQuery as HomeVisualId;
    }
    return normalizeHomeVisual(site?.home_visual);
  }, [params, site?.home_visual]);

  if (visual === "11eVisuel") {
    return <HomeVisualShowcase />;
  }

  if (visual === "13eVisuel") {
    return <HomeVisual13 />;
  }

  if (visual === "4eVisuel") {
    return <HomeVisual4 />;
  }

  const airyTheme = findAiryHomeTheme(visual);
  if (airyTheme) {
    return <HomeVisualAiry theme={airyTheme} />;
  }

  if (visual === "1erVisuel" || visual === "2eVisuel") {
    return <HomeVisualClassic variant={visual} />;
  }

  return <HomeVisualClassic variant="3eVisuel" />;
};

export default MarketplaceHomePage;
