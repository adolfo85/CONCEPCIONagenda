
import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Users, Home, HeartHandshake } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  // Attempt to grab dentistId from URL if present (for navigation context)
  const pathParts = location.pathname.split('/');
  const isDentistRoute = pathParts[1] === 'dentist';
  const dentistId = isDentistRoute ? pathParts[2] : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar / Mobile Header */}
      <aside className="bg-slate-900 text-white w-full md:w-64 flex-shrink-0 flex flex-col justify-between">
        <div>
          <div className="p-6 border-b border-slate-700">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
              DB OdontoData
            </h1>
            <p className="text-xs text-slate-400 mt-1">Gestión Integral</p>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <Link
              to="/"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === '/'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
                }`}
            >
              <Home size={20} />
              <span className="font-medium">Profesionales</span>
            </Link>

            {dentistId && (
              <Link
                to={`/dentist/${dentistId}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname.includes('/dentist/') && !location.pathname.includes('/patient/')
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                  }`}
              >
                <Users size={20} />
                <span className="font-medium">Pacientes</span>
              </Link>
            )}
          </nav>
        </div>

        {/* New Footer Requirement */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 space-y-1">
          <p className="font-medium text-slate-400">Idea y desarrollo:</p>
          <p>A. C. De Boeck</p>
          <p className="font-medium text-slate-400 mt-2">Contacto:</p>
          <a href="mailto:adolfodeboeck@gmail.com" className="hover:text-blue-400 transition-colors break-all">
            adolfodeboeck@gmail.com
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8 flex flex-col">
        <div className="max-w-6xl mx-auto w-full flex-1">
          {children}
        </div>
        {/* Mobile Footer (visible only on small screens if needed, otherwise sidebar covers it) */}
        <div className="md:hidden mt-8 text-center text-xs text-slate-400 pb-4">
          Idea y desarrollo: A. C. De Boeck
        </div>
      </main>
    </div>
  );
};

export default Layout;
