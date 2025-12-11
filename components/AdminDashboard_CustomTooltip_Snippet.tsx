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
