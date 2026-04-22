import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Browse } from './routes/Browse';
import { ListingDetail } from './routes/ListingDetail';
import { Leases } from './routes/Leases';
import { ContentPreview } from './routes/ContentPreview';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Browse />} />
        <Route path="listings/:id" element={<ListingDetail />} />
        <Route path="leases" element={<Leases />} />
        <Route path="ckbfs/:typeId" element={<ContentPreview />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
