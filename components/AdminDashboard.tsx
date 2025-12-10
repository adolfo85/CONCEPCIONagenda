import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, DollarSign, TrendingUp, Calendar, Filter } from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
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

    // Filter patients by selected dentist
    const filteredPatients = useMemo(() => {
        if (selectedDentistId === 'all') return patients;
        return patients.filter(p => p.dentistId === selectedDentistId);
    }, [patients, selectedDentistId]);

    // Calculate monthly earnings and patient counts
    const monthlyData = useMemo(() => {
        const monthMap = new Map<string, { earnings: number; patients: Set<string> }>();

        filteredPatients.forEach(patient => {
            patient.records.forEach(record => {
                const date = new Date(record.date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (!monthMap.has(monthKey)) {
                    monthMap.set(monthKey, { earnings: 0, patients: new Set() });
                }

                const data = monthMap.get(monthKey)!;
                data.earnings += (record.paymentAmount || 0) + (record.installationPayment || 0);
                data.patients.add(patient.id);
            });
        });

        // Sort by month and format for display
        return Array.from(monthMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, data]) => ({
                month: formatMonthLabel(month),
                earnings: data.earnings,
                patients: data.patients.size
            }));
    }, [filteredPatients]);

    // Calculate earnings by professional
    const professionalEarnings = useMemo(() => {
        const earningsMap = new Map<string, number>();

        patients.forEach(patient => {
            const dentist = dentists.find(d => d.id === patient.dentistId);
            if (!dentist) return;

            const totalEarnings = patient.records.reduce((sum, record) => {
                return sum + (record.paymentAmount || 0) + (record.installationPayment || 0);
            }, 0);

            earningsMap.set(dentist.name, (earningsMap.get(dentist.name) || 0) + totalEarnings);
        });

        return Array.from(earningsMap.entries()).map(([name, value]) => ({ name, value }));
    }, [patients, dentists]);

    // Calculate arch usage (counting only new placements)
    const archUsage = useMemo(() => {
        const archCount = new Map<string, number>();

        filteredPatients.forEach(patient => {
            // Sort records chronologically
            const sortedRecords = [...patient.records].sort(
                (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );

            let prevUpperArch: string | undefined;
            let prevLowerArch: string | undefined;

            sortedRecords.forEach(record => {
                // Count upper arch only if different from previous
                if (record.upperArch && record.upperArch !== prevUpperArch) {
                    archCount.set(record.upperArch, (archCount.get(record.upperArch) || 0) + 1);
                    prevUpperArch = record.upperArch;
                }

                // Count lower arch only if different from previous
                if (record.lowerArch && record.lowerArch !== prevLowerArch) {
                    archCount.set(record.lowerArch, (archCount.get(record.lowerArch) || 0) + 1);
                    prevLowerArch = record.lowerArch;
                }
            });
        });

        return Array.from(archCount.entries())
            .map(([arch, count]) => ({ arch, count }))
            .sort((a, b) => b.count - a.count);
    }, [filteredPatients]);

    // Summary statistics
    const stats = useMemo(() => {
        const currentMonth = new Date().toISOString().slice(0, 7);
        let totalEarnings = 0;
        let totalControls = 0;
        let controlsThisMonth = 0;

        filteredPatients.forEach(patient => {
            patient.records.forEach(record => {
                totalEarnings += (record.paymentAmount || 0) + (record.installationPayment || 0);
                totalControls++;

                if (record.date.startsWith(currentMonth)) {
                    controlsThisMonth++;
                }
            });
        });

        return {
            totalPatients: filteredPatients.length,
            totalEarnings,
            averagePerControl: totalControls > 0 ? totalEarnings / totalControls : 0,
            controlsThisMonth
        };
    }, [filteredPatients]);

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
                        <option value="all">Todos los Profesionales</option>
                        {dentists.map(dentist => (
                            <option key={dentist.id} value={dentist.id}>{dentist.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    icon={<Users className="text-blue-500" />}
                    label="Total Pacientes"
                    value={stats.totalPatients.toString()}
                    color="blue"
                />
                <SummaryCard
                    icon={<DollarSign className="text-emerald-500" />}
                    label="Ingresos Totales"
                    value={`$${stats.totalEarnings.toLocaleString()}`}
                    color="emerald"
                />
                <SummaryCard
                    icon={<TrendingUp className="text-amber-500" />}
                    label="Promedio por Control"
                    value={`$${stats.averagePerControl.toFixed(0)}`}
                    color="amber"
                />
                <SummaryCard
                    icon={<Calendar className="text-violet-500" />}
                    label="Controles Este Mes"
                    value={stats.controlsThisMonth.toString()}
                    color="violet"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Earnings Chart */}
                <ChartCard title="Ganancias Acumuladas por Mes">
                    {monthlyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ganancias']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="earnings"
                                    stroke="#3B82F6"
                                    strokeWidth={3}
                                    dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState />
                    )}
                </ChartCard>

                {/* Earnings by Professional */}
                <ChartCard title="Ganancias por Profesional">
                    {professionalEarnings.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={professionalEarnings}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`}
                                >
                                    {professionalEarnings.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState />
                    )}
                </ChartCard>

                {/* Arch Usage Chart */}
                <ChartCard title="Calibre de Arco Más Usado">
                    {archUsage.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={archUsage} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#64748b" />
                                <YAxis dataKey="arch" type="category" tick={{ fontSize: 11 }} stroke="#64748b" width={100} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                    formatter={(value: number) => [value, 'Colocaciones']}
                                />
                                <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState message="No hay datos de arcos" />
                    )}
                </ChartCard>

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
            </div>
        </div>
    );
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
