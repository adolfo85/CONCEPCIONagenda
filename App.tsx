
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './services/queries';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import PatientList from './components/PatientList';
import PatientDetail from './components/PatientDetail';
import AdminDashboard from './components/AdminDashboard';

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Layout>
          <Routes>
            {/* Landing Page (Dentist Directory) */}
            <Route path="/" element={<LandingPage />} />

            {/* Admin Dashboard */}
            <Route path="/admin" element={<AdminDashboard />} />

            {/* Patient List (Filtered by Dentist ID) */}
            <Route path="/dentist/:dentistId" element={<PatientList />} />

            {/* Patient Detail (Specific Patient) */}
            <Route path="/patient/:id" element={<PatientDetail />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </QueryClientProvider>
  );
};

export default App;
