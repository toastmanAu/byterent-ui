import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Browse } from './routes/Browse';
import { ListingDetail } from './routes/ListingDetail';
import { NewListing } from './routes/NewListing';
import { Leases } from './routes/Leases';
import { ContentPreview } from './routes/ContentPreview';
import { Settings } from './routes/Settings';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Browse />} />
        <Route path="listings/new" element={<NewListing />} />
        <Route path="listings/:id" element={<ListingDetail />} />
        <Route path="leases" element={<Leases />} />
        <Route path="ckbfs/:typeId" element={<ContentPreview />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
