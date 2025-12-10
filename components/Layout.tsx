
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, Home, Lock } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Attempt to grab dentistId from URL if present (for navigation context)
  const pathParts = location.pathname.split('/');
  const isDentistRoute = pathParts[1] === 'dentist';
  const dentistId = isDentistRoute ? pathParts[2] : null;

  // Admin Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  const ADMIN_PASSWORD = '31842796';

  const handleAdminClick = () => {
    // If already on admin page, just navigate
    if (location.pathname === '/admin') {
      return;
    }
    setShowAdminModal(true);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === ADMIN_PASSWORD) {
      setShowAdminModal(false);
      setAdminPassword('');
      setAdminError('');
      navigate('/admin');
    } else {
      setAdminError('Contraseña incorrecta');
    }
  };

  const closeAdminModal = () => {
    setShowAdminModal(false);
    setAdminPassword('');
    setAdminError('');
  };

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

            {/* Admin Button */}
            <button
              onClick={handleAdminClick}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === '/admin'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
                }`}
            >
              <Lock size={20} />
              <span className="font-medium">Administrador</span>
            </button>
          </nav>
        </div>

        {/* Footer */}
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

      {/* Admin Password Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock size={20} />
                Acceso Administrador
              </h3>
            </div>

            <form onSubmit={handleAdminLogin} className="px-6 py-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ingrese la contraseña de administrador
              </label>
              <input
                type="password"
                autoFocus
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  setAdminError('');
                }}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-2 bg-white text-slate-900"
                placeholder="••••••••"
              />
              {adminError && (
                <p className="text-red-500 text-sm mb-4">{adminError}</p>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={closeAdminModal}
                  className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-medium shadow-sm"
                >
                  Ingresar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
