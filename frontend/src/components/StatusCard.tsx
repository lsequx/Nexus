import { getStatusColor, getStatusDotColor } from "@/utils/status";

export default function StatusCard({name,status}:{name:string;status:string}) {
    return (
        <div className="flex-1 rounded-lg border p-4 space-y-3">
            <h2 className="text-lg font-semibold">{name} Status</h2>
            <p className={`mt-2 flex items-center gap-2 text-lg font-semibold ${getStatusColor(status)}`}>
                <span 
                    className={`inline-block h-2 w-2 rounded-full bg-green-400 ${getStatusDotColor(status)}` } 
                />
                {status}
            </p>
        </div>
    );
}