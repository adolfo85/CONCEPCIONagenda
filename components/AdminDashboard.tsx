import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, DollarSign, TrendingUp, Calendar, Filter } from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { useDentists, usePatients } from '../services/queries';
import { Patient, Dentist, ClinicalRecord } from '../types';

// Color palette for charts
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

interface MonthlyData {
    month: string;
    earnings: number;
    patients: number;
}

interface ProfessionalEarnings {
    name: string;
    value: number;
}

interface ArchUsage {
    arch: string;
    count: number;
}

const AdminDashboard: React.FC = () => {
    const { data: dentists = [] } = useDentists();
    const { data: patients = [] } = usePatients();
    const [selectedDentistId, setSelectedDentistId] = useState<string>('all');
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    // Filter only orthodontist dentists
    const orthodontists = useMemo(() => {
        return dentists.filter(d => !d.specialty || d.specialty === 'orthodontics');
    }, [dentists]);

    // Get orthodontist IDs for filtering patients
    const orthodontistIds = useMemo(() => {
        return new Set(orthodontists.map(d => d.id));
    }, [orthodontists]);

    // Filter patients to only those belonging to orthodontists
    const orthodonticPatients = useMemo(() => {
        return patients.filter(p => orthodontistIds.has(p.dentistId));
    }, [patients, orthodontistIds]);

    // Filter patients by selected dentist (within orthodontists only)
    const filteredPatients = useMemo(() => {
        if (selectedDentistId === 'all') return orthodonticPatients;
        return orthodonticPatients.filter(p => p.dentistId === selectedDentistId);
    }, [orthodonticPatients, selectedDentistId]);

    // Calculate monthly earnings and patient counts
    const monthlyData = useMemo(() => {
        const monthMap = new Map<string, { control: number; installation: number; patients: Set<string> }>();

        filteredPatients.forEach(patient => {
            // Calculate installation net factor for proportional debit deduction
            const installationTotal = patient.installationTotal || 0;
            const installationDebit = patient.installationDebit || 0;
            // If total is 0, factor is 0 (avoid division by zero). If debit >= total, factor is 0.
            const installationNetFactor = installationTotal > 0
                ? Math.max(0, (installationTotal - installationDebit) / installationTotal)
                : 0;

            patient.records.forEach(record => {
                const date = new Date(record.date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (!monthMap.has(monthKey)) {
                    monthMap.set(monthKey, { control: 0, installation: 0, patients: new Set() });
                }

                const data = monthMap.get(monthKey)!;

                // Add control earnings
                data.control += (record.paymentAmount || 0);

                // Add installation earnings with proportional debit applied
                const rawInstallation = (record.installationPayment || 0);
                data.installation += rawInstallation * installationNetFactor;

                data.patients.add(patient.id);
            });
        });

        // Sort by month and format for display
        return Array.from(monthMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, data]) => ({
                month: formatMonthLabel(month),
                control: data.control,
                installation: data.installation,
                total: data.control + data.installation,
                patients: data.patients.size
            }));
    }, [filteredPatients]);

    // Summary statistics
    const stats = useMemo(() => {
        const currentMonth = new Date().toISOString().slice(0, 7);
        let controlEarnings = 0;
        let installationEarningsRaw = 0;
        let totalDebits = 0;
        let totalControls = 0;
        let controlsThisMonth = 0;

        // Monthly specific stats
        let monthlyControlEarnings = 0;
        let monthlyInstallationEarningsRaw = 0;

        // We need to calculate monthly earnings with the same net factor logic for consistency
        let monthlyInstallationEarningsNet = 0;

        filteredPatients.forEach(patient => {
            // Add up debits from patients (Total)
            totalDebits += patient.installationDebit || 0;

            const installationTotal = patient.installationTotal || 0;
            const installationDebit = patient.installationDebit || 0;
            const installationNetFactor = installationTotal > 0
                ? Math.max(0, (installationTotal - installationDebit) / installationTotal)
                : 0;

            patient.records.forEach(record => {
                const amount = (record.paymentAmount || 0);
                const instAmount = (record.installationPayment || 0);

                controlEarnings += amount;
                installationEarningsRaw += instAmount;
                totalControls++;

                if (record.date && record.date.startsWith(currentMonth)) {
                    controlsThisMonth++;
                    monthlyControlEarnings += amount;
                    monthlyInstallationEarningsRaw += instAmount;
                    monthlyInstallationEarningsNet += instAmount * installationNetFactor;
                }
            });
        });

        const installationEarnings = Math.max(installationEarningsRaw - totalDebits, 0);
        const totalEarnings = controlEarnings + installationEarnings;

        // Monthly earnings now reflect the net installation (proportional)
        const monthlyEarnings = monthlyControlEarnings + monthlyInstallationEarningsNet;

        return {
            totalPatients: filteredPatients.length,
            totalEarnings,
            controlEarnings,
            installationEarnings,
            totalDebits,
            controlsThisMonth,
            monthlyEarnings,
            monthlyControlEarnings,
            monthlyInstallationEarningsNet
        };
    }, [filteredPatients]);

    // Monthly controls by professional (for the new chart)
    const monthlyControlsByProfessional = useMemo(() => {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const controlsMap = new Map<string, number>();

        orthodonticPatients.forEach(patient => {
            const dentist = orthodontists.find(d => d.id === patient.dentistId);
            if (!dentist) return;

            const monthlyControls = patient.records.filter(r => r.date.startsWith(currentMonth)).length;
            controlsMap.set(dentist.name, (controlsMap.get(dentist.name) || 0) + monthlyControls);
        });

        return Array.from(controlsMap.entries())
            .map(([name, controls]) => ({ name: name, controls })) // Full name
            .filter(item => item.controls > 0);
    }, [orthodonticPatients, orthodontists]);

    const activeTotal = useMemo(() => {
        if (activeIndex === null || !monthlyData[activeIndex]) return null;
        return monthlyData[activeIndex].total;
    }, [activeIndex, monthlyData]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        to="/"
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Panel de Administración</h1>
                        <p className="text-slate-500">Análisis de datos y estadísticas</p>
                    </div>
                </div>

                {/* Professional Filter */}
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                    <Filter size={18} className="text-slate-400" />
                    <select
                        value={selectedDentistId}
                        onChange={(e) => setSelectedDentistId(e.target.value)}
                        className="bg-transparent border-none outline-none text-slate-700 font-medium cursor-pointer"
                    >
                        <option value="all">Todos los Ortodoncistas</option>
                        {orthodontists.map(dentist => (
                            <option key={dentist.id} value={dentist.id}>{dentist.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SummaryCard
                    icon={<Users className="text-blue-500" />}
                    label="Total Pacientes"
                    value={stats.totalPatients.toString()}
                    color="blue"
                />
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-emerald-50">
                            <DollarSign className="text-emerald-500" size={20} />
                        </div>
                        <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Ingresos Este Mes</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-800">${stats.monthlyEarnings.toLocaleString()}</div>
                    <div className="mt-2 flex flex-col gap-1 text-xs">
                        <div className="flex justify-between text-emerald-600">
                            <span>Instalaciones:</span>
                            <span className="font-semibold">${stats.monthlyInstallationEarningsNet.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-blue-600">
                            <span>Controles:</span>
                            <span className="font-semibold">${stats.monthlyControlEarnings.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                <SummaryCard
                    icon={<Calendar className="text-violet-500" />}
                    label="Controles Este Mes"
                    value={stats.controlsThisMonth.toString()}
                    color="violet"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-6">
                {/* Monthly Earnings Chart - Full Width */}
                <ChartCard title="Ganancias Mensuales (Desglose)">
                    {monthlyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={monthlyData}
                                onMouseMove={(state: any) => {
                                    if (state.isTooltipActive) {
                                        setActiveIndex(state.activeTooltipIndex);
                                    } else {
                                        setActiveIndex(null);
                                    }
                                }}
                                onMouseLeave={() => setActiveIndex(null)}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                <Legend />
                                {activeTotal !== null && (
                                    <ReferenceLine
                                        y={activeTotal}
                                        stroke="#64748b"
                                        strokeDasharray="3 3"
                                        label={{
                                            position: 'right',
                                            value: `$${activeTotal.toLocaleString()}`,
                                            fill: '#64748b',
                                            fontSize: 12,
                                            fontWeight: 'bold'
                                        }}
                                    />
                                )}
                                <Bar dataKey="installation" name="Instalación" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="control" name="Controles" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState />
                    )}
                </ChartCard>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Patients per Month */}
                    <ChartCard title="Pacientes Atendidos por Mes">
                        {monthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                        formatter={(value: number) => [value, 'Pacientes']}
                                    />
                                    <Bar dataKey="patients" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState />
                        )}
                    </ChartCard>

                    {/* Controls This Month by Professional */}
                    <ChartCard title="Controles Este Mes por Profesional">
                        {monthlyControlsByProfessional.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={monthlyControlsByProfessional}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                        formatter={(value: number) => [value, 'Controles']}
                                    />
                                    <Bar dataKey="controls" fill="#EC4899" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState message="No hay controles este mes" />
                        )}
                    </ChartCard>
                </div>
            </div>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
        return (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-lg">
                <p className="text-sm font-bold text-slate-800 mb-2">{label}</p>
                <div className="space-y-1">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-slate-500 capitalize">{entry.name}:</span>
                            <span className="font-semibold text-slate-700">${entry.value.toLocaleString()}</span>
                        </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                        <span className="text-sm font-bold text-slate-800">Total:</span>
                        <span className="text-sm font-bold text-slate-800">${total.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

// Helper Components
const SummaryCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
}> = ({ icon, label, value, color }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-${color}-50`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
            </div>
        </div>
    </div>
);

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">{title}</h3>
        {children}
    </div>
);

const EmptyState: React.FC<{ message?: string }> = ({ message = "No hay datos disponibles" }) => (
    <div className="h-[300px] flex items-center justify-center text-slate-400">
        <p>{message}</p>
    </div>
);

// Utility function to format month labels
function formatMonthLabel(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`;
}

export default AdminDashboard;
