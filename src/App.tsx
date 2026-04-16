import "leaflet/dist/leaflet.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AppLayout from "./components/AppLayout.tsx";
import Index from "./pages/Index.tsx";
import PropertiesPage from "./pages/properties/page.tsx";
import TenantsPage from "./pages/tenants/page.tsx";
import LeasesPage from "./pages/leases/page.tsx";
import FinancialsPage from "./pages/financials/page.tsx";
import UtilitiesPage from "./pages/utilities/page.tsx";
import InspectionsPage from "./pages/inspections/page.tsx";
import CompliancePage from "./pages/compliance/page.tsx";
import PropertyDetailPage from "./pages/properties/[id]/page.tsx";
import MapPage from "./pages/map/page.tsx";
import ReportsPage from "./pages/reports/page.tsx";
import OpportunitiesPage from "./pages/opportunities/page.tsx";
import AccountingPage from "./pages/accounting/page.tsx";
import NotFound from "./pages/NotFound.tsx";

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/properties" element={<PropertiesPage />} />
            <Route path="/properties/:id" element={<PropertyDetailPage />} />
            <Route path="/tenants" element={<TenantsPage />} />
            <Route path="/leases" element={<LeasesPage />} />
            <Route path="/financials" element={<FinancialsPage />} />
            <Route path="/utilities" element={<UtilitiesPage />} />
            <Route path="/inspections" element={<InspectionsPage />} />
            <Route path="/compliance" element={<CompliancePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/accounting" element={<AccountingPage />} />
            <Route path="/opportunities" element={<OpportunitiesPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
