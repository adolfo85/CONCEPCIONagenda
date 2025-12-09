
import React, { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search, UserPlus, Phone, Calendar, ChevronRight, Trash2, ArrowLeft, Clock, AlertCircle, X, Filter, CheckCircle, XCircle } from 'lucide-react';
import { Patient, Appointment } from '../types';
import { generateId } from '../services/storage';
import {
  usePatients,
  useDentists,
  useAppointments,
  useCreatePatient,
  useDeletePatient,
  useCreateAppointment,
  useDeleteAppointment
} from '../services/queries';

const PatientList: React.FC = () => {
  const { dentistId } = useParams<{ dentistId: string }>();

  // React Query hooks for data fetching
  const { data: allPatients = [], isLoading: loadingPatients } = usePatients();
  const { data: allDentists = [], isLoading: loadingDentists } = useDentists();
  const { data: allAppointments = [], isLoading: loadingAppointments } = useAppointments();

  // Mutation hooks
  const createPatientMutation = useCreatePatient();
  const deletePatientMutation = useDeletePatient();
  const createAppointmentMutation = useCreateAppointment();
  const deleteAppointmentMutation = useDeleteAppointment();

  // Derived data from cache
  const patients = useMemo(() =>
    allPatients.filter(p => p.dentistId === dentistId),
    [allPatients, dentistId]
  );
  const dentist = useMemo(() =>
    allDentists.find(d => d.id === dentistId) || null,
    [allDentists, dentistId]
  );
  const appointments = useMemo(() =>
    allAppointments.filter(a => a.dentistId === dentistId),
    [allAppointments, dentistId]
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with-control' | 'without-control' | 'alphabetical' | 'by-last-control'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);

  // New Patient Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Agenda State
  const [showAgenda, setShowAgenda] = useState(false);
  const [agendaDate, setAgendaDate] = useState(new Date().toISOString().split('T')[0]);

  // Add Appointment Modal State
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [selectedPatientForAppointment, setSelectedPatientForAppointment] = useState<Patient | null>(null);
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState('09:00');
  const [appointmentDuration, setAppointmentDuration] = useState(30);

  const isLoading = loadingPatients || loadingDentists || loadingAppointments;

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !dentistId) return;

    const newPatient: Patient = {
      id: generateId(),
      dentistId: dentistId, // Bind to current dentist
      name: newName,
      phone: newPhone,
      startDate: new Date().toISOString(),
      records: []
    };

    // Save via mutation (cache is updated automatically)
    createPatientMutation.mutate(newPatient);

    // Reset and Close
    setNewName('');
    setNewPhone('');
    setIsModalOpen(false);
  };

  const handleDeletePatient = (id: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    setPatientToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeletePatient = async () => {
    if (!patientToDelete) return;

    deletePatientMutation.mutate(patientToDelete);

    // Close modal
    setShowDeleteConfirm(false);
    setPatientToDelete(null);
  };

  const cancelDeletePatient = () => {
    setShowDeleteConfirm(false);
    setPatientToDelete(null);
  };

  // Appointment Handlers
  const openAppointmentModal = (e: React.MouseEvent, patient: Patient) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPatientForAppointment(patient);
    setAppointmentDate(new Date().toISOString().split('T')[0]);
    setAppointmentTime('09:00');
    setAppointmentDuration(30);
    setIsAppointmentModalOpen(true);
  };

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForAppointment || !dentistId) return;

    const newAppointment: Appointment = {
      id: generateId(),
      dentistId: dentistId,
      patientId: selectedPatientForAppointment.id,
      patientName: selectedPatientForAppointment.name,
      date: appointmentDate,
      time: appointmentTime,
      duration: appointmentDuration
    };

    createAppointmentMutation.mutate(newAppointment);
    setIsAppointmentModalOpen(false);
    setSelectedPatientForAppointment(null);
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!window.confirm('¿Estás seguro de cancelar este turno?')) return;

    deleteAppointmentMutation.mutate(id);
  };

  const filteredAppointments = appointments
    .filter(a => a.date === agendaDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const getLastControlInfo = (patient: Patient) => {
    if (!patient.records || patient.records.length === 0) return null;

    // Sort desc just to be sure
    const sortedRecords = [...patient.records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastRecord = sortedRecords[0];
    const lastDate = new Date(lastRecord.date + 'T00:00:00');

    // Calculate days passed
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Warn if > 23 days passed (meaning <= 7 days left for a month)
    const isLate = diffDays >= 23;

    return {
      formattedDate: lastDate.toLocaleDateString(),
      isLate,
      daysPassed: diffDays,
      lastDate
    };
  };

  // Check if patient has a control record in the current month
  const hasControlThisMonth = (patient: Patient): boolean => {
    if (!patient.records || patient.records.length === 0) return false;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return patient.records.some(record => {
      const recordDate = new Date(record.date + 'T00:00:00');
      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    });
  };

  // Filter and sort patients based on filterType
  const filteredPatients = useMemo(() => {
    // First apply search filter
    let result = patients.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Then apply type filter
    switch (filterType) {
      case 'with-control':
        result = result.filter(p => hasControlThisMonth(p));
        break;
      case 'without-control':
        result = result.filter(p => !hasControlThisMonth(p));
        break;
      case 'alphabetical':
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'by-last-control':
        result = [...result].sort((a, b) => {
          const infoA = getLastControlInfo(a);
          const infoB = getLastControlInfo(b);
          if (!infoA && !infoB) return 0;
          if (!infoA) return 1;
          if (!infoB) return -1;
          return infoB.lastDate.getTime() - infoA.lastDate.getTime();
        });
        break;
      default:
        // 'all' - no additional filtering or sorting
        break;
    }

    return result;
  }, [patients, searchTerm, filterType]);

  if (!dentistId) return <div>Error: No se seleccionó profesional.</div>;

  if (isLoading) {
    return <div className="p-10 text-center text-slate-500">Cargando datos...</div>;
  }

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center text-slate-500 hover:text-blue-600 mb-2">
        <ArrowLeft size={16} className="mr-1" /> Volver a Profesionales
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">
            Pacientes de {dentist?.name || '...'}
          </h2>
          <p className="text-slate-500 mt-1">
            {patients.length} pacientes registrados
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAgenda(!showAgenda)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg shadow-sm transition-all active:scale-95 border ${showAgenda ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
          >
            <Calendar size={18} />
            {showAgenda ? 'Ver Pacientes' : 'Ver Agenda'}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-sm transition-all active:scale-95"
          >
            <UserPlus size={18} />
            Nuevo Paciente
          </button>
        </div>
      </div>

      {showAgenda ? (
        /* Agenda View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Calendar className="text-blue-600" size={20} />
              Agenda del Día
            </h3>
            <input
              type="date"
              value={agendaDate}
              onChange={(e) => setAgendaDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="divide-y divide-slate-100">
            {filteredAppointments.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p>No hay turnos programados para este día.</p>
              </div>
            ) : (
              filteredAppointments.map(app => (
                <div key={app.id} className="p-4 hover:bg-slate-50 flex items-center justify-between group transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-mono font-bold text-lg border border-blue-100">
                      {app.time}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{app.patientName}</div>
                      <div className="text-sm text-slate-500 flex items-center gap-2">
                        <Clock size={14} /> {app.duration} min
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAppointment(app.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Cancelar turno"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Patient List View */
        <>
          {/* Search Bar and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="text-slate-400" size={20} />
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-slate-800"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="text-slate-400" size={18} />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                className="pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm cursor-pointer appearance-none min-w-[200px]"
              >
                <option value="all">Todos los pacientes</option>
                <option value="with-control">✓ Con control este mes</option>
                <option value="without-control">✗ Sin control este mes</option>
                <option value="alphabetical">A-Z Orden alfabético</option>
                <option value="by-last-control">📅 Por último control</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ChevronRight className="text-slate-400 rotate-90" size={16} />
              </div>
            </div>
          </div>

          {/* List */}
          <div className="grid grid-cols-1 gap-4">
            {filteredPatients.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                <div className="text-slate-400 mb-2">No se encontraron pacientes para este profesional</div>
                {searchTerm && <button onClick={() => setSearchTerm('')} className="text-blue-600 font-medium hover:underline">Limpiar búsqueda</button>}
              </div>
            ) : (
              filteredPatients.map((patient) => {
                const controlInfo = getLastControlInfo(patient);

                return (
                  <Link
                    key={patient.id}
                    to={`/patient/${patient.id}`}
                    className="group block bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all p-5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                            {patient.name}
                          </h3>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                            <Phone size={14} />
                            {patient.phone || 'Sin teléfono'}
                          </div>
                          <div
                            className={`flex items-center gap-1 ${controlInfo?.isLate ? 'text-red-600 font-medium cursor-help' : ''}`}
                            title={controlInfo?.isLate ? 'La fecha está en rojo porque han pasado más de 23 días desde el último control. Los controles de ortodoncia deben realizarse mensualmente.' : undefined}
                          >
                            {controlInfo?.isLate ? <AlertCircle size={14} /> : <Clock size={14} />}
                            {controlInfo ? `Último: ${controlInfo.formattedDate}` : 'Sin controles'}
                          </div>
                          <div className="flex items-center gap-1 text-slate-400">
                            {patient.records.length} controles
                          </div>
                          {/* Monthly Control Status Indicator */}
                          {patient.records.length > 0 && (
                            hasControlThisMonth(patient) ? (
                              <div className="flex items-center gap-1 text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full text-xs">
                                <CheckCircle size={12} />
                                Realizó control este mes
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full text-xs">
                                <XCircle size={12} />
                                No realizó control este mes
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pl-4 border-l border-slate-100 ml-4">
                        <button
                          onClick={(e) => openAppointmentModal(e, patient)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors z-10"
                          title="Agendar Turno"
                        >
                          <Calendar size={18} />
                        </button>
                        <button
                          onClick={(e) => handleDeletePatient(patient.id, e)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors z-10"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                        <ChevronRight className="text-slate-300 group-hover:text-blue-500" />
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Modal - Add Patient */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Nuevo Paciente</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleAddPatient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                <input
                  autoFocus
                  required
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  placeholder="+56 9 1234 5678"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      {isAppointmentModalOpen && selectedPatientForAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Agendar Turno</h3>
              <button onClick={() => setIsAppointmentModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSaveAppointment} className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mb-2">
                <span className="text-xs font-bold text-blue-600 uppercase block mb-1">Paciente</span>
                <span className="text-slate-800 font-medium">{selectedPatientForAppointment.name}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hora</label>
                  <input
                    type="time"
                    required
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duración (min)</label>
                  <select
                    value={appointmentDuration}
                    onChange={(e) => setAppointmentDuration(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAppointmentModalOpen(false)}
                  className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  Confirmar
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
              <p className="text-slate-700">¿Estás seguro de que deseas eliminar este paciente y todo su historial?</p>
              <p className="text-sm text-slate-500 mt-2">Esta acción no se puede deshacer.</p>
            </div>

            <div className="px-6 py-4 bg-slate-50 flex gap-3">
              <button
                onClick={cancelDeletePatient}
                className="flex-1 px-4 py-2 text-slate-700 bg-white hover:bg-slate-100 rounded-lg font-medium border border-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeletePatient}
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

export default PatientList;
