import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, DollarSign, TrendingUp, Calendar, Filter, AlertTriangle } from 'lucide-react';
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

    // Date Filters State
    const currentYear = new Date().getFullYear().toString();
    const [selectedYear, setSelectedYear] = useState<string>(currentYear);
    const [selectedStartMonth, setSelectedStartMonth] = useState<string>('01');
    const [selectedEndMonth, setSelectedEndMonth] = useState<string>('12');

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

    // Get available years from data
    const availableYears = useMemo(() => {
        const years = new Set<string>();
        years.add(currentYear); // Always include current year
        filteredPatients.forEach(p => {
            p.records.forEach(r => {
                const year = new Date(r.date).getFullYear().toString();
                years.add(year);
            });
        });
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [filteredPatients, currentYear]);

    // Calculate monthly earnings and patient counts
    const monthlyData = useMemo(() => {
        const monthMap = new Map<string, { control: number; installation: number; consultation: number; controlCount: number; consultationCount: number; patients: Set<string> }>();

        filteredPatients.forEach(patient => {
            // Calculate installation net factor for proportional debit deduction
            // REMOVED: User requested that earnings reflect actual payments, not adjusted by debit.
            // const installationTotal = patient.installationTotal || 0;
            // const installationDebit = patient.installationDebit || 0;
            // const installationNetFactor = installationTotal > 0
            //     ? Math.max(0, (installationTotal - installationDebit) / installationTotal)
            //     : 1;

            patient.records.forEach(record => {
                const date = new Date(record.date);
                const year = date.getFullYear().toString();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const monthKey = `${year}-${month}`;

                // Filter by selected year and month range
                if (year !== selectedYear) return;
                if (month < selectedStartMonth || month > selectedEndMonth) return;

                if (!monthMap.has(monthKey)) {
                    monthMap.set(monthKey, { control: 0, installation: 0, consultation: 0, controlCount: 0, consultationCount: 0, patients: new Set() });
                }

                const data = monthMap.get(monthKey)!;

                // Add control earnings
                // Add installation earnings (raw payment, no debit deduction)
                const rawInstallation = (record.installationPayment || 0);
                const debit = (record.debitAmount || 0);

                // Net earnings for this record = (Control + Installation) - Debit
                // Logic: Subtract debit from Installation FIRST, then from Control.

                let netControl = (record.paymentAmount || 0);
                let netInstallation = rawInstallation;
                let remainingDebit = debit;

                // 1. Subtract from Installation
                if (netInstallation >= remainingDebit) {
                    netInstallation -= remainingDebit;
                    remainingDebit = 0;
                } else {
                    remainingDebit -= netInstallation;
                    netInstallation = 0;
                }

                // 2. Subtract remaining from Control
                if (remainingDebit > 0) {
                    netControl = Math.max(0, netControl - remainingDebit);
                }

                // Check if this is a consultation record
                const isConsultation = record.recordType === 'consultation';

                if (isConsultation) {
                    data.consultation += netControl;
                    data.consultationCount++;
                } else {
                    data.control += netControl;
                    data.installation += netInstallation;
                    data.controlCount++;
                }

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
                consultation: data.consultation,
                controlCount: data.controlCount,
                consultationCount: data.consultationCount,
                total: data.control + data.installation + data.consultation,
                patients: data.patients.size
            }));
    }, [filteredPatients, selectedYear, selectedStartMonth, selectedEndMonth]);

    // Calculate Period Total
    const periodTotal = useMemo(() => {
        return monthlyData.reduce((sum, item) => sum + item.total, 0);
    }, [monthlyData]);

    // Calculate Period Counts
    const periodCounts = useMemo(() => {
        return monthlyData.reduce((acc, item) => ({
            controls: acc.controls + item.controlCount,
            consultations: acc.consultations + item.consultationCount
        }), { controls: 0, consultations: 0 });
    }, [monthlyData]);

    // ============== NEW: Year-over-Year Comparison Data ==============
    const yearComparisonData = useMemo(() => {
        const currentYearNum = parseInt(selectedYear);
        const previousYearNum = currentYearNum - 1;
        const previousYear = previousYearNum.toString();

        // Calculate data for previous year with same month range
        const prevYearMap = new Map<string, number>();
        const currYearMap = new Map<string, number>();

        filteredPatients.forEach(patient => {
            patient.records.forEach(record => {
                const date = new Date(record.date);
                const year = date.getFullYear().toString();
                const month = String(date.getMonth() + 1).padStart(2, '0');

                if (month < selectedStartMonth || month > selectedEndMonth) return;

                const earnings = (record.paymentAmount || 0) + (record.installationPayment || 0) - (record.debitAmount || 0);

                if (year === selectedYear) {
                    currYearMap.set(month, (currYearMap.get(month) || 0) + earnings);
                } else if (year === previousYear) {
                    prevYearMap.set(month, (prevYearMap.get(month) || 0) + earnings);
                }
            });
        });

        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const result = [];

        for (let m = parseInt(selectedStartMonth); m <= parseInt(selectedEndMonth); m++) {
            const monthKey = String(m).padStart(2, '0');
            const curr = currYearMap.get(monthKey) || 0;
            const prev = prevYearMap.get(monthKey) || 0;
            const growth = prev > 0 ? ((curr - prev) / prev * 100) : (curr > 0 ? 100 : 0);

            result.push({
                month: monthNames[m - 1],
                [`${selectedYear}`]: curr,
                [`${previousYear}`]: prev,
                growth: Math.round(growth * 10) / 10
            });
        }

        return { data: result, currentYear: selectedYear, previousYear };
    }, [filteredPatients, selectedYear, selectedStartMonth, selectedEndMonth]);

    // ============== NEW: Income Distribution Data ==============
    const incomeDistribution = useMemo(() => {
        let installations = 0;
        let controls = 0;
        let consultations = 0;

        filteredPatients.forEach(patient => {
            patient.records.forEach(record => {
                const date = new Date(record.date);
                const year = date.getFullYear().toString();
                const month = String(date.getMonth() + 1).padStart(2, '0');

                if (year !== selectedYear) return;
                if (month < selectedStartMonth || month > selectedEndMonth) return;

                const debit = record.debitAmount || 0;

                if (record.recordType === 'consultation') {
                    consultations += Math.max(0, (record.paymentAmount || 0) - debit);
                } else {
                    installations += Math.max(0, (record.installationPayment || 0));
                    controls += Math.max(0, (record.paymentAmount || 0));
                }
            });
        });

        const total = installations + controls + consultations;

        return [
            { name: 'Instalaciones', value: installations, color: '#10B981', percentage: total > 0 ? Math.round(installations / total * 100) : 0 },
            { name: 'Controles', value: controls, color: '#3B82F6', percentage: total > 0 ? Math.round(controls / total * 100) : 0 },
            { name: 'Consultas', value: consultations, color: '#F97316', percentage: total > 0 ? Math.round(consultations / total * 100) : 0 }
        ].filter(item => item.value > 0);
    }, [filteredPatients, selectedYear, selectedStartMonth, selectedEndMonth]);

    // ============== NEW: Active/Inactive Patients Data ==============
    const patientActivityData = useMemo(() => {
        const today = new Date();
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        let active = 0; // Visited in last 3 months
        let atRisk = 0; // 3-6 months without visit
        let inactive = 0; // 6+ months without visit
        const atRiskPatients: { name: string; lastVisit: string; monthsAgo: number }[] = [];

        filteredPatients.forEach(patient => {
            if (patient.records.length === 0) {
                inactive++;
                return;
            }

            // Find most recent record
            const sortedRecords = [...patient.records].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            const lastVisit = new Date(sortedRecords[0].date);
            const monthsAgo = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24 * 30));

            if (lastVisit >= threeMonthsAgo) {
                active++;
            } else if (lastVisit >= sixMonthsAgo) {
                atRisk++;
                if (atRiskPatients.length < 5) {
                    atRiskPatients.push({
                        name: patient.name,
                        lastVisit: sortedRecords[0].date,
                        monthsAgo
                    });
                }
            } else {
                inactive++;
            }
        });

        // New patients by month (last 12 months)
        const newPatientsByMonth: { month: string; count: number }[] = [];
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;

            const count = filteredPatients.filter(p =>
                p.startDate && p.startDate.startsWith(monthKey)
            ).length;

            newPatientsByMonth.push({ month: label, count });
        }

        return {
            distribution: [
                { name: 'Activos', value: active, color: '#10B981' },
                { name: 'En riesgo', value: atRisk, color: '#F59E0B' },
                { name: 'Inactivos', value: inactive, color: '#EF4444' }
            ].filter(item => item.value > 0),
            atRiskPatients,
            newPatientsByMonth,
            totals: { active, atRisk, inactive }
        };
    }, [filteredPatients]);

    // Summary statistics (Global stats, not affected by chart filters except for monthly earnings display consistency if desired, 
    // but usually summary cards show "Current Month" or "Total All Time". 
    // The user asked for "Total del Período" specifically for the chart.
    // I will keep the existing stats logic as is for the top cards (Current Month context) 
    // and use `periodTotal` for the chart section.)
    const stats = useMemo(() => {
        const currentMonth = new Date().toISOString().slice(0, 7);
        let controlEarnings = 0;
        let installationEarningsRaw = 0;
        let totalDebits = 0;
        let totalControls = 0;
        let controlsThisMonth = 0;
        let monthlyControlEarnings = 0;
        let monthlyInstallationEarningsRaw = 0;
        let monthlyInstallationEarningsNet = 0;

        filteredPatients.forEach(patient => {
            totalDebits += patient.installationDebit || 0;
            const installationTotal = patient.installationTotal || 0;
            // const installationDebit = patient.installationDebit || 0;
            // const installationNetFactor = installationTotal > 0
            //     ? Math.max(0, (installationTotal - installationDebit) / installationTotal)
            //     : 0;

            patient.records.forEach(record => {
                const amount = (record.paymentAmount || 0);
                const instAmount = (record.installationPayment || 0);
                const debit = (record.debitAmount || 0);

                controlEarnings += amount;
                installationEarningsRaw += instAmount;
                totalDebits += debit; // Track per-record debits
                totalControls++;

                if (record.date && record.date.startsWith(currentMonth)) {
                    controlsThisMonth++;
                    monthlyControlEarnings += amount;
                    monthlyInstallationEarningsRaw += instAmount;
                    monthlyInstallationEarningsNet += instAmount;
                    // Note: We'll subtract debits from the final monthly earnings sum
                    totalDebits += debit; // Adding to total debits for stats
                }
            });
        });

        const installationEarnings = installationEarningsRaw;
        // Total Earnings = (Control + Installation) - Debits
        // We need to be careful about which debits we are subtracting. 
        // The 'totalDebits' above is summing ALL debits for all time? 
        // Wait, the loop sums for all records. 
        // So 'totalDebits' is total all time.

        const totalEarnings = (controlEarnings + installationEarnings) - totalDebits;

        // For monthly stats, we need to calculate monthly debits specifically
        let monthlyDebits = 0;
        filteredPatients.forEach(p => {
            p.records.forEach(r => {
                if (r.date && r.date.startsWith(currentMonth)) {
                    monthlyDebits += (r.debitAmount || 0);
                }
            });
        });

        const monthlyEarnings = (monthlyControlEarnings + monthlyInstallationEarningsNet) - monthlyDebits;

        return {
            totalPatients: filteredPatients.length,
            totalEarnings,
            controlEarnings,
            installationEarnings,
            totalDebits, // Now reflects sum of record debits
            controlsThisMonth,
            monthlyEarnings,
            monthlyControlEarnings,
            monthlyInstallationEarningsNet
        };
    }, [filteredPatients]);

    const activeTotal = useMemo(() => {
        if (activeIndex === null || !monthlyData[activeIndex]) return null;
        return monthlyData[activeIndex].total;
    }, [activeIndex, monthlyData]);

    const months = [
        { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' },
        { value: '03', label: 'Marzo' }, { value: '04', label: 'Abril' },
        { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
        { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' },
        { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
        { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' }
    ];

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
                    {/* Date Filters & Total */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 bg-slate-50 p-4 rounded-xl">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Year Selector */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-600">Año:</span>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                                >
                                    {availableYears.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Month Range Selectors */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-600">Desde:</span>
                                <select
                                    value={selectedStartMonth}
                                    onChange={(e) => setSelectedStartMonth(e.target.value)}
                                    className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                                >
                                    {months.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-600">Hasta:</span>
                                <select
                                    value={selectedEndMonth}
                                    onChange={(e) => setSelectedEndMonth(e.target.value)}
                                    className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                                >
                                    {months.map(m => (
                                        <option key={m.value} value={m.value} disabled={m.value < selectedStartMonth}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Period Total Display */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-emerald-100 px-4 py-2 rounded-lg border border-emerald-200">
                                <span className="text-sm font-semibold text-emerald-800">Total Período:</span>
                                <span className="text-lg font-bold text-emerald-700">${periodTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    <span className="text-sm text-slate-600">{periodCounts.controls} <span className="text-xs">controles</span></span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                    <span className="text-sm text-slate-600">{periodCounts.consultations} <span className="text-xs">consultas</span></span>
                                </div>
                            </div>
                        </div>
                    </div>

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
                                <Bar dataKey="consultation" name="Consultas" stackId="a" fill="#F97316" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="control" name="Controles" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState message="No hay datos para el período seleccionado" />
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
                        <EmptyState message="No hay datos para el período seleccionado" />
                    )}
                </ChartCard>

                {/* NEW: Year-over-Year Comparison Chart */}
                <ChartCard title={`Tendencia Comparativa: ${yearComparisonData.currentYear} vs ${yearComparisonData.previousYear}`}>
                    {yearComparisonData.data.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={yearComparisonData.data}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                        formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name]}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey={yearComparisonData.currentYear}
                                        stroke="#3B82F6"
                                        strokeWidth={3}
                                        dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                                        name={`${yearComparisonData.currentYear}`}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey={yearComparisonData.previousYear}
                                        stroke="#94A3B8"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={{ fill: '#94A3B8', strokeWidth: 2 }}
                                        name={`${yearComparisonData.previousYear}`}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                            {/* Growth Indicators */}
                            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                                {yearComparisonData.data.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50">
                                        <span className="text-xs text-slate-500">{item.month}:</span>
                                        <span className={`text-xs font-bold ${item.growth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {item.growth >= 0 ? '+' : ''}{item.growth}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <EmptyState message="No hay datos para comparar" />
                    )}
                </ChartCard>

                {/* NEW: Income Distribution Donut Chart */}
                <ChartCard title="Distribución de Ingresos por Tipo">
                    {incomeDistribution.length > 0 ? (
                        <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={incomeDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {incomeDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Legend with values */}
                            <div className="flex flex-col gap-3 min-w-[200px]">
                                {incomeDistribution.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-slate-50">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="text-sm font-medium text-slate-700">{item.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-slate-800">${item.value.toLocaleString()}</div>
                                            <div className="text-xs text-slate-500">{item.percentage}%</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <EmptyState message="No hay datos de ingresos para el período" />
                    )}
                </ChartCard>

                {/* NEW: Patient Activity Chart */}
                <ChartCard title="Estado de Pacientes">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Activity Distribution Pie */}
                        <div>
                            <h4 className="text-sm font-medium text-slate-600 mb-3">Distribución por Actividad</h4>
                            {patientActivityData.distribution.length > 0 ? (
                                <div className="flex items-center gap-4">
                                    <ResponsiveContainer width="50%" height={180}>
                                        <PieChart>
                                            <Pie
                                                data={patientActivityData.distribution}
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={70}
                                                dataKey="value"
                                            >
                                                {patientActivityData.distribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                            <span className="text-sm text-slate-600">Activos: <span className="font-bold">{patientActivityData.totals.active}</span></span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-amber-500" />
                                            <span className="text-sm text-slate-600">En riesgo: <span className="font-bold">{patientActivityData.totals.atRisk}</span></span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-red-500" />
                                            <span className="text-sm text-slate-600">Inactivos: <span className="font-bold">{patientActivityData.totals.inactive}</span></span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <EmptyState message="No hay pacientes" />
                            )}

                            {/* At Risk Alert */}
                            {patientActivityData.atRiskPatients.length > 0 && (
                                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle size={16} className="text-amber-600" />
                                        <span className="text-sm font-medium text-amber-800">Pacientes en riesgo de deserción</span>
                                    </div>
                                    <div className="space-y-1">
                                        {patientActivityData.atRiskPatients.map((p, idx) => (
                                            <div key={idx} className="text-xs text-amber-700 flex justify-between">
                                                <span>{p.name}</span>
                                                <span className="text-amber-600">{p.monthsAgo} meses sin visita</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* New Patients Trend */}
                        <div>
                            <h4 className="text-sm font-medium text-slate-600 mb-3">Nuevos Pacientes (Últimos 12 meses)</h4>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={patientActivityData.newPatientsByMonth}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#64748b" />
                                    <YAxis tick={{ fontSize: 10 }} stroke="#64748b" allowDecimals={false} />
                                    <Tooltip
                                        formatter={(value: number) => [value, 'Nuevos pacientes']}
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                    />
                                    <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </ChartCard>
            </div>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
        // Get counts from the first payload's data
        const dataItem = payload[0]?.payload;
        const controlCount = dataItem?.controlCount || 0;
        const consultationCount = dataItem?.consultationCount || 0;

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
                {/* Counts section */}
                <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-blue-600">Controles realizados:</span>
                        <span className="font-bold text-blue-700">{controlCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-orange-600">Consultas realizadas:</span>
                        <span className="font-bold text-orange-700">{consultationCount}</span>
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
