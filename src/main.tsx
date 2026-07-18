import "@/lib/storefrontSite";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import {
  applyCookiePreferencesToGa,
  initGaConsentDefaults,
  loadGoogleAnalytics,
  readStoredCookiePreferences,
} from "./lib/ga";

initGaConsentDefaults();
loadGoogleAnalytics();
const storedPrefs = readStoredCookiePreferences();
if (storedPrefs) {
  applyCookiePreferencesToGa(storedPrefs);
}

createRoot(document.getElementById("root")!).render(<App />);
