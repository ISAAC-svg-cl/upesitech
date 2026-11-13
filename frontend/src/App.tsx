import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Services from './pages/Services';
import Quote from './pages/Quote';
import Jobs from './pages/Jobs';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import Login from './pages/Login';
import { RequireAuth } from './auth';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="services" element={<Services />} />
        <Route path="devis" element={<Quote />} />
        <Route path="emplois" element={<Jobs />} />
        <Route path="contact" element={<Contact />} />
        <Route path="connexion" element={<Login />} />
        <Route
          path="admin"
          element={
            <RequireAuth>
              <Admin />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}
