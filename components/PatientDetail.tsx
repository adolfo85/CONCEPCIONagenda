
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Save, FileText, DollarSign, Clock, Settings, Wallet } from 'lucide-react';
import { Patient, ClinicalRecord, ArchWireType, ServiceType, ToothSurface, ToothDetail } from '../types';
import { generateId } from '../services/storage';
import { usePatients, useDentists, useServiceTypes, useUpdatePatient, useAddServiceType } from '../services/queries';
import { ARCH_WIRES, DEFAULT_SERVICE_TYPES as SERVICE_TYPES, TOOTH_SURFACES, TOOTH_NUMBERS } from '../constants';

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // React Query hooks for data fetching
  const { data: allPatients = [], isLoading: loadingPatients } = usePatients();
  const { data: allDentists = [], isLoading: loadingDentists } = useDentists();
  const { data: serviceTypes = [], isLoading: loadingServiceTypes } = useServiceTypes();

  // Mutation hooks
  const updatePatientMutation = useUpdatePatient();
  const addServiceTypeMutation = useAddServiceType();

  // Derived data from cache
  const patient = useMemo(() => allPatients.find(p => p.id === id) || null, [allPatients, id]);
  const dentist = useMemo(() => {
    if (!patient) return null;
    return allDentists.find(d => d.id === patient.dentistId) || null;
  }, [allDentists, patient]);

  const loading = loadingPatients || loadingDentists || loadingServiceTypes;

  // Edit Patient Info State
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Installation Config State
  const [showInstallationInput, setShowInstallationInput] = useState(false);
  const [newInstallationTotal, setNewInstallationTotal] = useState('');

  // New Record State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [newRecordDate, setNewRecordDate] = useState(new Date().toISOString().split('T')[0]);

  // Arch States
  const [newUpperArch, setNewUpperArch] = useState<ArchWireType>(ARCH_WIRES[0]);
  const [newLowerArch, setNewLowerArch] = useState<ArchWireType>(ARCH_WIRES[0]);

  // Duration States (Independent)
  const [newUpperMonths, setNewUpperMonths] = useState(1);
  const [newLowerMonths, setNewLowerMonths] = useState(1);

  const [newRecordNotes, setNewRecordNotes] = useState('');

  // Payment States (Independent)
  const [newControlPayment, setNewControlPayment] = useState('');
  const [newInstallationPayment, setNewInstallationPayment] = useState('');

  // Editing existing record
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // General Dentistry States
  const [newServiceType, setNewServiceType] = useState<ServiceType>('Consulta');
  const [newServiceInput, setNewServiceInput] = useState<string>('');
  const [newToothNumbers, setNewToothNumbers] = useState<string[]>([]);
  const [newToothSurfaces, setNewToothSurfaces] = useState<ToothSurface[]>([]); // Legacy support
  const [newToothDetails, setNewToothDetails] = useState<ToothDetail[]>([]);

  // Confirmation Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  // Initialize edit form when patient data loads
  useEffect(() => {
    if (patient) {
      setEditName(patient.name);
      setEditPhone(patient.phone);
      setNewInstallationTotal(patient.installationTotal ? patient.installationTotal.toString() : '');
    }
  }, [patient]);

  const savePatientChanges = (updatedPatient: Patient) => {
    updatePatientMutation.mutate(updatedPatient);
  };

  const handleUpdateInfo = () => {
    if (!patient) return;
    const updated = { ...patient, name: editName, phone: editPhone };
    savePatientChanges(updated);
    setIsEditingInfo(false);
  };

  const handleSaveInstallationTotal = () => {
    if (!patient) return;
    const total = parseFloat(newInstallationTotal) || 0;
    const updated = { ...patient, installationTotal: total };
    savePatientChanges(updated);
    setShowInstallationInput(false);
  };

  const handleDeleteRecord = (e: React.MouseEvent, recordId: string) => {
    e.stopPropagation();
    setRecordToDelete(recordId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteRecord = () => {
    if (!patient || !recordToDelete) return;

    const updatedRecords = patient.records.filter(r => r.id !== recordToDelete);
    savePatientChanges({ ...patient, records: updatedRecords });

    // Close modal and reset state
    setShowDeleteConfirm(false);
    setRecordToDelete(null);
  };

  const cancelDeleteRecord = () => {
    setShowDeleteConfirm(false);
    setRecordToDelete(null);
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !dentist) return;

    const isOrthodontics = !dentist.specialty || dentist.specialty === 'orthodontics';
    const paymentAmount = parseFloat(newControlPayment) || 0;

    let recordData: Partial<ClinicalRecord>;

    if (isOrthodontics) {
      // Orthodontics record
      const installAmount = parseFloat(newInstallationPayment) || 0;
      recordData = {
        date: newRecordDate,
        upperArch: newUpperArch,
        lowerArch: newLowerArch,
        upperMonths: newUpperMonths,
        lowerMonths: newLowerMonths,
        monthsActive: Math.max(newUpperMonths, newLowerMonths),
        notes: newRecordNotes,
        paymentAmount: paymentAmount,
        installationPayment: installAmount,
        isInstallation: installAmount > 0
      };
    } else {
      // General dentistry record
      // Construct toothDetails based on selected numbers and their specific surfaces
      const details: ToothDetail[] = newToothNumbers.map(num => {
        const existing = newToothDetails.find(d => d.number === num);
        return {
          number: num,
          surfaces: existing ? existing.surfaces : []
        };
      });

      recordData = {
        date: newRecordDate,
        serviceType: newServiceType,
        toothNumbers: newToothNumbers.length > 0 ? newToothNumbers : undefined,
        toothDetails: details.length > 0 ? details : undefined,
        notes: newRecordNotes,
        paymentAmount: paymentAmount
      };
    }

    if (editingRecordId) {
      // Update existing
      const updatedRecords = patient.records.map(r => {
        if (r.id === editingRecordId) {
          return { ...r, ...recordData };
        }
        return r;
      });
      updatedRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      savePatientChanges({ ...patient, records: updatedRecords });
    } else {
      // Create new
      const newRecord: ClinicalRecord = {
        id: generateId(),
        notes: '', // Default, will be overridden
        paymentAmount: 0, // Default, will be overridden
        ...recordData
      } as ClinicalRecord;

      const updatedRecords = [newRecord, ...patient.records];
      updatedRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      savePatientChanges({ ...patient, records: updatedRecords });
    }

    closeRecordModal();
  };

  const openNewRecordModal = () => {
    setEditingId(null);
    setNewRecordDate(new Date().toISOString().split('T')[0]);

    // Orthodontics fields
    setNewUpperArch(ARCH_WIRES[0]);
    setNewLowerArch(ARCH_WIRES[0]);
    setNewUpperMonths(1);
    setNewLowerMonths(1);

    // General dentistry fields
    setNewServiceType('Consulta');
    setNewToothNumbers([]);
    setNewToothSurfaces([]);
    setNewToothDetails([]);

    // Common fields
    setNewRecordNotes('');
    setNewControlPayment('');
    setNewInstallationPayment('');
    setIsRecordModalOpen(true);
  };

  const openEditRecordModal = (record: ClinicalRecord) => {
    setEditingRecordId(record.id);
    setNewRecordDate(record.date);

    // Orthodontics fields
    setNewUpperArch((record.upperArch as ArchWireType) || (record as any).archWire || ARCH_WIRES[0]);
    setNewLowerArch((record.lowerArch as ArchWireType) || (record as any).archWire || ARCH_WIRES[0]);
    setNewUpperMonths(record.upperMonths !== undefined ? record.upperMonths : (record.monthsActive || 1));
    setNewLowerMonths(record.lowerMonths !== undefined ? record.lowerMonths : (record.monthsActive || 1));

    // General dentistry fields
    setNewServiceType(record.serviceType || 'Consulta');
    setNewToothNumbers(record.toothNumbers || []);
    setNewToothSurfaces(record.toothSurfaces || []);

    // Initialize toothDetails
    if (record.toothDetails) {
      setNewToothDetails(record.toothDetails);
    } else if (record.toothNumbers && record.toothNumbers.length > 0) {
      // Migration for legacy records: apply global surfaces to the single tooth (or all if multiple, though legacy was likely single)
      const legacySurfaces = record.toothSurfaces || [];
      setNewToothDetails(record.toothNumbers.map(num => ({
        number: num,
        surfaces: legacySurfaces
      })));
    } else {
      setNewToothDetails([]);
    }

    // Common fields
    setNewRecordNotes(record.notes);
    setNewControlPayment(record.paymentAmount > 0 ? record.paymentAmount.toString() : '');

    // Handle installation payment (orthodontics only)
    if (record.installationPayment !== undefined) {
      setNewInstallationPayment(record.installationPayment > 0 ? record.installationPayment.toString() : '');
    } else {
      if (record.isInstallation) {
        setNewInstallationPayment(record.paymentAmount > 0 ? record.paymentAmount.toString() : '');
        setNewControlPayment('');
      } else {
        setNewInstallationPayment('');
      }
    }

    setIsRecordModalOpen(true);
  };

  const setEditingId = (id: string | null) => {
    setEditingRecordId(id);
  }

  const closeRecordModal = () => {
    setIsRecordModalOpen(false);
    setEditingRecordId(null);
  };

  // Calculations
  const totalPaid = useMemo(() => {
    return patient?.records.reduce((sum, r) => {
      const control = r.paymentAmount || 0;
      // Use specific field or fallback to legacy logic logic for total sum
      // Note: In legacy, if isInstallation=true, paymentAmount was installation.
      // But we just want "Money Paid", so we sum paymentAmount + installationPayment (if exists)

      let install = 0;
      if (r.installationPayment !== undefined) {
        install = r.installationPayment;
      }
      // Legacy data doesn't double count because if isInstallation was true, we treat paymentAmount as the money paid. 
      // If we are in new mode, paymentAmount is control, installationPayment is installation.

      // However, for pure money flow:
      if (r.installationPayment !== undefined) {
        return sum + control + install;
      } else {
        return sum + control; // legacy logic handled by paymentAmount holding the value
      }
    }, 0) || 0;
  }, [patient]);

  const installationTotal = patient?.installationTotal || 0;

  const installationPaid = useMemo(() => {
    return patient?.records.reduce((sum, r) => {
      if (r.installationPayment !== undefined) {
        return sum + r.installationPayment;
      }
      // Legacy fallback
      if (r.isInstallation) {
        return sum + (r.paymentAmount || 0);
      }
      return sum;
    }, 0) || 0;
  }, [patient]);

  const installationBalance = installationTotal - installationPaid;

  const lastControl = useMemo(() => {
    if (!patient || patient.records.length === 0) return 'Sin controles';
    return new Date(patient.records[0].date + 'T00:00:00').toLocaleDateString();
  }, [patient]);

  if (loading) return <div className="p-10 text-center text-slate-500">Cargando ficha...</div>;
  if (!patient) return (
    <div className="p-10 text-center">
      <h2 className="text-xl text-slate-800">Paciente no encontrado</h2>
      <Link to="/" className="text-blue-600 hover:underline mt-2 inline-block">Volver al inicio</Link>
    </div>
  );

  // Determine specialty
  const isOrthodontics = !dentist?.specialty || dentist.specialty === 'orthodontics';
  const recordLabel = isOrthodontics ? 'Control de Ortodoncia' : 'Cita o Turno';
  const addButtonLabel = isOrthodontics ? 'Agregar Control' : 'Agregar Cita';

  return (
    <div className="space-y-8 pb-20">
      {/* Top Navigation */}
      <Link
        to={patient.dentistId ? `/dentist/${patient.dentistId}` : '/'}
        className="inline-flex items-center text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft size={18} className="mr-1" /> Volver al listado
      </Link>

      {/* Patient Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <FileText size={120} className="text-blue-600 transform rotate-12 translate-x-10 -translate-y-10" />
        </div>

        <div className="relative z-10">
          {isEditingInfo ? (
            <div className="flex flex-col gap-4 max-w-md">
              <input
                className="text-3xl font-bold text-slate-900 border-b-2 border-blue-500 focus:outline-none bg-white p-2 rounded"
                value={editName}
                onChange={e => setEditName(e.target.value)}
              />
              <input
                className="text-lg text-slate-900 border border-slate-300 focus:outline-none bg-white p-2 rounded"
                value={editPhone}
                onChange={e => setEditPhone(e.target.value)}
                placeholder="Teléfono"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={handleUpdateInfo} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">Guardar</button>
                <button onClick={() => setIsEditingInfo(false)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-300">Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">{patient.name}</h1>
                <div className="flex items-center gap-2 mt-2 text-lg text-slate-500 font-medium">
                  <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-600 text-sm">
                    {patient.phone || 'Sin teléfono'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsEditingInfo(true)}
                className="text-slate-400 hover:text-blue-600 transition-colors p-2"
                title="Editar datos personales"
              >
                <Edit2 size={20} />
              </button>
            </div>
          )}

          {/* Mini Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <DollarSign size={12} /> Total Histórico Pagado
              </div>
              <div className="text-2xl font-bold text-slate-800">${totalPaid.toLocaleString()}</div>
            </div>

            {/* Installation Tracking */}
            {isOrthodontics && (
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 relative group">
                <div className="text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1 justify-between">
                  <span className="flex items-center gap-1"><Wallet size={12} /> Instalación</span>
                  <button
                    onClick={() => setShowInstallationInput(!showInstallationInput)}
                    className="text-emerald-400 hover:text-emerald-600"
                    title="Configurar valor instalación"
                  >
                    <Settings size={12} />
                  </button>
                </div>

                {showInstallationInput ? (
                  <div className="flex gap-2 items-center mt-1">
                    <input
                      type="number"
                      placeholder="Valor total"
                      className="w-full text-sm p-1 border rounded bg-white text-slate-900"
                      value={newInstallationTotal}
                      onChange={e => setNewInstallationTotal(e.target.value)}
                    />
                    <button onClick={handleSaveInstallationTotal} className="bg-emerald-600 text-white p-1 rounded text-xs">OK</button>
                  </div>
                ) : (
                  <>
                    {installationTotal > 0 ? (
                      <div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm text-emerald-600/70">Saldo Pendiente:</span>
                          <span className={`text-2xl font-bold ${installationBalance > 0 ? 'text-red-500' : 'text-emerald-700'}`}>
                            ${installationBalance.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-emerald-200 h-1.5 rounded-full mt-2">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min((installationPaid / installationTotal) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-emerald-600 mt-1">
                          <span>Pagado: ${installationPaid.toLocaleString()}</span>
                          <span>Total: ${installationTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-emerald-600/50 mt-1">
                        Sin costo de instalación definido.
                        <button onClick={() => setShowInstallationInput(true)} className="underline hover:text-emerald-700 ml-1">Configurar</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock size={12} /> Último Control
              </div>
              <div className="text-xl font-semibold text-slate-700">{lastControl}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Table Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">Historial Clínico</h2>
          <button
            onClick={openNewRecordModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm transition-transform active:scale-95"
          >
            <Plus size={18} />
            {addButtonLabel}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 font-semibold text-sm text-slate-500 uppercase tracking-wider w-[120px]">Fecha</th>
                  {isOrthodontics ? (
                    <>
                      <th className="px-6 py-4 font-semibold text-sm text-slate-500 uppercase tracking-wider">Arco</th>
                      <th className="px-6 py-4 font-semibold text-sm text-slate-500 uppercase tracking-wider text-center">Meses</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 font-semibold text-sm text-slate-500 uppercase tracking-wider">Prestación</th>
                      <th className="px-6 py-4 font-semibold text-sm text-slate-500 uppercase tracking-wider">Pieza(s)</th>
                      <th className="px-6 py-4 font-semibold text-sm text-slate-500 uppercase tracking-wider">Cara</th>
                    </>
                  )}
                  <th className="px-6 py-4 font-semibold text-sm text-slate-500 uppercase tracking-wider w-1/4">Notas</th>
                  <th className="px-6 py-4 font-semibold text-sm text-slate-500 uppercase tracking-wider text-right">Pagos</th>
                  <th className="px-6 py-4 font-semibold text-sm text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patient.records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                      No hay registros clínicos aún.
                    </td>
                  </tr>
                ) : (
                  patient.records.map((record) => {
                    const control = record.paymentAmount || 0;
                    const install = record.installationPayment || (record.isInstallation ? control : 0);
                    const displayControl = record.isInstallation && record.installationPayment === undefined ? 0 : control;

                    return (
                      <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 text-slate-700 whitespace-nowrap font-medium align-top">
                          {new Date(record.date + 'T00:00:00').toLocaleDateString()}
                        </td>

                        {isOrthodontics ? (
                          <>
                            <td className="px-6 py-4 text-slate-700 align-top">
                              <div className="flex flex-col gap-2">
                                <div className="h-6 flex items-center gap-2">
                                  <span className="w-6 text-xs font-bold text-blue-600">SUP</span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                                    {record.upperArch || (record as any).archWire || '-'}
                                  </span>
                                </div>
                                <div className="h-6 flex items-center gap-2">
                                  <span className="w-6 text-xs font-bold text-teal-600">INF</span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800 whitespace-nowrap">
                                    {record.lowerArch || (record as any).archWire || '-'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-700 text-center align-top">
                              <div className="flex flex-col gap-2 items-center">
                                <div className="h-6 flex items-center">
                                  <span className="text-xs font-mono bg-slate-100 rounded px-1.5 py-0.5 border border-slate-200">
                                    {record.upperMonths ?? record.monthsActive}
                                  </span>
                                </div>
                                <div className="h-6 flex items-center">
                                  <span className="text-xs font-mono bg-slate-100 rounded px-1.5 py-0.5 border border-slate-200">
                                    {record.lowerMonths ?? record.monthsActive}
                                  </span>
                                </div>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 text-slate-700 align-top">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                {record.serviceType || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-700 align-top">
                              {record.toothNumbers && record.toothNumbers.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {record.toothNumbers.map(num => (
                                    <span key={num} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200">
                                      {num}
                                    </span>
                                  ))}
                                </div>
                              ) : ('-')}
                            </td>
                            <td className="px-6 py-4 text-slate-700 align-top">
                              {record.toothDetails && record.toothDetails.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {record.toothDetails.map((detail, idx) => (
                                    detail.surfaces.length > 0 && (
                                      <div key={idx} className="text-xs">
                                        <span className="font-bold text-slate-600">{detail.number}:</span>{' '}
                                        <span className="text-blue-600">{detail.surfaces.join(', ')}</span>
                                      </div>
                                    )
                                  ))}
                                  {/* Fallback if details exist but no surfaces (e.g. extraction) - maybe show nothing or '-'? 
                                      Actually, if it's not a restoration, surfaces might be empty. 
                                      If we want to show '-' when no surfaces are relevant, we can check service type or just leave empty.
                                  */}
                                </div>
                              ) : (
                                // Legacy fallback
                                record.toothSurfaces && record.toothSurfaces.length > 0 ? (
                                  <div className="flex gap-1">
                                    {record.toothSurfaces.map(surf => (
                                      <span key={surf} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                        {surf}
                                      </span>
                                    ))}
                                  </div>
                                ) : ('-')
                              )}
                            </td>
                          </>
                        )}

                        <td className="px-6 py-4 text-slate-600 text-sm leading-relaxed min-w-[200px] align-top">
                          {record.notes || '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-mono text-right align-top">
                          {isOrthodontics ? (
                            <div className="flex flex-col items-end gap-1">
                              {displayControl > 0 && (
                                <span className="text-slate-700">Control: ${displayControl.toLocaleString()}</span>
                              )}
                              {install > 0 && (
                                <span className="text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 font-bold">
                                  Inst: ${install.toLocaleString()}
                                </span>
                              )}
                              {displayControl === 0 && install === 0 && <span className="text-slate-300">-</span>}
                            </div>
                          ) : (
                            <span className="text-slate-700">${control.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap align-top">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => openEditRecordModal(record)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteRecord(e, record.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors z-20"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Record Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-800">
                {editingRecordId ? `Editar ${recordLabel}` : `Nuevo ${recordLabel}`}
              </h3>
              <button onClick={closeRecordModal} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSaveRecord} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-5 overflow-y-auto flex-1">

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={newRecordDate}
                    onChange={e => setNewRecordDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                  />
                </div>

                {isOrthodontics ? (
                  <>
                    {/* Orthodontics Fields */}
                    {/* Upper Arch Config */}
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-blue-600 uppercase">Maxilar Superior</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs text-slate-500 mb-1">Arco</label>
                          <select
                            value={newUpperArch}
                            onChange={e => setNewUpperArch(e.target.value as ArchWireType)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white text-sm"
                          >
                            {ARCH_WIRES.map(wire => (
                              <option key={`u-${wire}`} value={wire}>{wire}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="block text-xs text-slate-500 mb-1">Meses</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={newUpperMonths}
                            onChange={e => setNewUpperMonths(parseFloat(e.target.value))}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Lower Arch Config */}
                    <div className="p-3 bg-teal-50 rounded-lg border border-teal-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-teal-600 uppercase">Maxilar Inferior</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs text-slate-500 mb-1">Arco</label>
                          <select
                            value={newLowerArch}
                            onChange={e => setNewLowerArch(e.target.value as ArchWireType)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 outline-none bg-white text-sm"
                          >
                            {ARCH_WIRES.map(wire => (
                              <option key={`l-${wire}`} value={wire}>{wire}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="block text-xs text-slate-500 mb-1">Meses</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={newLowerMonths}
                            onChange={e => setNewLowerMonths(parseFloat(e.target.value))}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 outline-none bg-white text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* General Dentistry Fields */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Prestación</label>
                      <select
                        value={newServiceType}
                        onChange={e => setNewServiceType(e.target.value as ServiceType)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-900"
                      >
                        {serviceTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      {/* Add new prestation UI */}
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          placeholder="Nueva prestación"
                          className="flex-1 px-3 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-900"
                          value={newServiceInput}
                          onChange={e => setNewServiceInput(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = newServiceInput.trim();
                            if (trimmed && !serviceTypes.includes(trimmed as ServiceType)) {
                              addServiceTypeMutation.mutate(trimmed);
                              setNewServiceInput('');
                              setNewServiceType(trimmed as ServiceType);
                            }
                          }}
                          className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Tooth Numbers Multi-Select */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Pieza(s) dentaria(s)</label>
                      <select
                        multiple
                        value={newToothNumbers}
                        onChange={e => setNewToothNumbers(Array.from((e.target as HTMLSelectElement).selectedOptions, opt => opt.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-900 min-h-[120px]"
                      >
                        {TOOTH_NUMBERS.map(num => (
                          <option key={num} value={num}>Pieza {num}</option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 mt-1">Mantén presionado Ctrl (Cmd en Mac) para seleccionar múltiples piezas</p>
                    </div>

                    {/* Tooth Surfaces - Per Tooth */}
                    {(newServiceType === 'Restauración simple' || newServiceType === 'Restauración compuesta') && newToothNumbers.length > 0 && (
                      <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <label className="block text-sm font-medium text-slate-700">Caras por pieza</label>
                        {newToothNumbers.map(toothNum => {
                          const currentDetails = newToothDetails.find(d => d.number === toothNum);
                          const currentSurfaces = currentDetails ? currentDetails.surfaces : [];

                          return (
                            <div key={toothNum} className="flex flex-col sm:flex-row sm:items-center gap-2 pb-2 border-b border-slate-200 last:border-0 last:pb-0">
                              <span className="text-sm font-bold text-slate-800 w-16">Pieza {toothNum}:</span>
                              <div className="flex gap-3 flex-wrap">
                                {TOOTH_SURFACES.map(surface => (
                                  <label key={`${toothNum}-${surface}`} className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={currentSurfaces.includes(surface)}
                                      onChange={e => {
                                        const isChecked = e.target.checked;
                                        setNewToothDetails(prev => {
                                          // Find if we already have an entry for this tooth
                                          const existingIdx = prev.findIndex(p => p.number === toothNum);
                                          let newDetails = [...prev];

                                          if (existingIdx >= 0) {
                                            const existing = newDetails[existingIdx];
                                            let updatedSurfaces = existing.surfaces;
                                            if (isChecked) {
                                              updatedSurfaces = [...updatedSurfaces, surface];
                                            } else {
                                              updatedSurfaces = updatedSurfaces.filter(s => s !== surface);
                                            }
                                            newDetails[existingIdx] = { ...existing, surfaces: updatedSurfaces };
                                          } else {
                                            // Create new entry
                                            if (isChecked) {
                                              newDetails.push({ number: toothNum, surfaces: [surface] });
                                            }
                                          }
                                          return newDetails;
                                        });
                                      }}
                                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                                    />
                                    <span className="text-xs text-slate-700 font-medium">{surface}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notas Clínicas</label>
                  <textarea
                    rows={3}
                    value={newRecordNotes}
                    onChange={e => setNewRecordNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white text-slate-900"
                    placeholder="Observaciones..."
                  />
                </div>

                {isOrthodontics ? (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Pago Control ($)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newControlPayment}
                        onChange={e => setNewControlPayment(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-emerald-700 mb-1">Abono Instalación ($)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newInstallationPayment}
                        onChange={e => setNewInstallationPayment(e.target.value)}
                        className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-900"
                      />
                      {installationBalance > 0 && (
                        <div className="text-[10px] text-emerald-600 mt-1 text-right">
                          Deuda: ${(installationBalance - (parseFloat(newInstallationPayment) || 0)).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Pago ($)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={newControlPayment}
                      onChange={e => setNewControlPayment(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-900"
                    />
                  </div>
                )}

              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={closeRecordModal}
                  className="flex-1 px-4 py-2 text-slate-700 bg-white hover:bg-slate-100 rounded-lg font-medium border border-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm flex justify-center items-center gap-2"
                >
                  <Save size={18} />
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
              <p className="text-slate-700">¿Estás seguro de que deseas borrar este control del historial?</p>
              <p className="text-sm text-slate-500 mt-2">Esta acción no se puede deshacer.</p>
            </div>

            <div className="px-6 py-4 bg-slate-50 flex gap-3">
              <button
                onClick={cancelDeleteRecord}
                className="flex-1 px-4 py-2 text-slate-700 bg-white hover:bg-slate-100 rounded-lg font-medium border border-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteRecord}
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

export default PatientDetail;
