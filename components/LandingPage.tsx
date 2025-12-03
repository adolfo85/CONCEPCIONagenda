
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Plus, Edit2, Trash2, ChevronRight, Stethoscope, Activity } from 'lucide-react';
import { Dentist, SpecialtyType } from '../types';
import { getDentists, createDentist, updateDentist, deleteDentist, generateId } from '../services/storage';

const LandingPage: React.FC = () => {
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState<SpecialtyType>('orthodontics');

  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dentistToDelete, setDentistToDelete] = useState<string | null>(null);

  useEffect(() => {
    const loadDentists = async () => {
      const data = await getDentists();
      setDentists(data);
    };
    loadDentists();
  }, []);

  const handleSaveDentist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      // Edit
      const dentistToUpdate = dentists.find(d => d.id === editingId);
      if (dentistToUpdate) {
        const updatedDentist = { ...dentistToUpdate, name, specialty };
        await updateDentist(updatedDentist);
        setDentists(prev => prev.map(d => d.id === editingId ? updatedDentist : d));
      }
    } else {
      // Create
      const newDentist: Dentist = {
        id: generateId(),
        name: name,
        specialty: specialty
      };
      await createDentist(newDentist);
      setDentists(prev => [...prev, newDentist]);
    }
    closeModal();
  };

  const openNew = (spec: SpecialtyType) => {
    setEditingId(null);
    setName('');
    setSpecialty(spec);
    setIsModalOpen(true);
  };

  const openEdit = (e: React.MouseEvent, dentist: Dentist) => {
    e.preventDefault(); // Stop Link navigation
    e.stopPropagation();
    setEditingId(dentist.id);
    setName(dentist.name);
    setSpecialty(dentist.specialty || 'orthodontics');
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDentistToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteDentist = async () => {
    if (!dentistToDelete) return;

    await deleteDentist(dentistToDelete);
    setDentists(prev => prev.filter(d => d.id !== dentistToDelete));

    setShowDeleteConfirm(false);
    setDentistToDelete(null);
  };

  const cancelDeleteDentist = () => {
    setShowDeleteConfirm(false);
    setDentistToDelete(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setName('');
    setSpecialty('orthodontics');
  };

  // Filter dentists by specialty
  const orthodontists = dentists.filter(d => !d.specialty || d.specialty === 'orthodontics');
  const generalDentists = dentists.filter(d => d.specialty === 'general');

  const renderDentistCard = (dentist: Dentist) => (
    <Link
      key={dentist.id}
      to={`/dentist/${dentist.id}`}
      className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all flex justify-between items-center"
    >
      <div className="flex items-center gap-4">
        <div className="bg-blue-50 p-3 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
          <User size={24} />
        </div>
        <span className="font-semibold text-lg text-slate-800">{dentist.name}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={(e) => openEdit(e, dentist)}
          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={(e) => handleDeleteClick(e, dentist.id)}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
          title="Eliminar"
        >
          <Trash2 size={16} />
        </button>
        <ChevronRight className="text-slate-300 group-hover:text-blue-500" />
      </div>
    </Link>
  );

  return (
    <div className="space-y-8">
      <div className="text-center py-10">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">Bienvenido a DB OdontoData</h1>
        <p className="text-slate-500">Seleccione un profesional para gestionar sus pacientes</p>
      </div>

      {/* Orthodontics Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="text-blue-600" size={24} />
            <h2 className="text-2xl font-bold text-slate-700">Ortodoncia</h2>
          </div>
          <button
            onClick={() => openNew('orthodontics')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={18} /> Agregar Profesional
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orthodontists.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <p className="text-slate-500">No hay ortodoncistas registrados.</p>
              <button onClick={() => openNew('orthodontics')} className="text-blue-600 font-medium hover:underline mt-2">Agregar el primero</button>
            </div>
          ) : (
            orthodontists.map(renderDentistCard)
          )}
        </div>
      </div>

      {/* General Dentistry Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Stethoscope className="text-emerald-600" size={24} />
            <h2 className="text-2xl font-bold text-slate-700">Otras Especialidades</h2>
          </div>
          <button
            onClick={() => openNew('general')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={18} /> Agregar Profesional
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {generalDentists.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <p className="text-slate-500">No hay profesionales registrados.</p>
              <button onClick={() => openNew('general')} className="text-emerald-600 font-medium hover:underline mt-2">Agregar el primero</button>
            </div>
          ) : (
            generalDentists.map(renderDentistCard)
          )}
        </div>
      </div>

      {/* Modal - Add/Edit Professional */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {editingId ? 'Editar Profesional' : 'Nuevo Profesional'}
            </h3>
            <form onSubmit={handleSaveDentist}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input
                autoFocus
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-4 bg-white text-slate-900"
                placeholder="Dr. Ejemplo"
                value={name}
                onChange={e => setName(e.target.value)}
              />

              <label className="block text-sm font-medium text-slate-700 mb-1">Especialidad</label>
              <select
                value={specialty}
                onChange={e => setSpecialty(e.target.value as SpecialtyType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-6 bg-white text-slate-900"
              >
                <option value="orthodontics">Ortodoncia</option>
                <option value="general">Otras Especialidades</option>
              </select>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-red-50">
              <h3 className="text-lg font-bold text-red-800">Confirmar Eliminación</h3>
            </div>

            <div className="px-6 py-6">
              <p className="text-slate-700">¿Estás seguro de que deseas eliminar este profesional?</p>
              <p className="text-sm text-slate-500 mt-2">Sus pacientes no se borrarán, pero quedarán ocultos hasta que se reasignen.</p>
            </div>

            <div className="px-6 py-4 bg-slate-50 flex gap-3">
              <button
                onClick={cancelDeleteDentist}
                className="flex-1 px-4 py-2 text-slate-700 bg-white hover:bg-slate-100 rounded-lg font-medium border border-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteDentist}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;