import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

type Process = {
    pid: number;
    name: string;
    cpu: number;
    mem: number;
}

export default function ProcessList() {
    const [processes, setProcesses] = useState<Process[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [filter, setFilter] = useState<string>("");
    const [tableHeight, setTableHeight] = useState<number>(400)

    // Fetch process list form the tauri backend
    const fetchProcesses = async() => {
        setLoading(true);
        try {
            setProcesses(await invoke<Process[]>("get_processes"));
        } catch (error) {
            console.error("Error fetching processes:", error);
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchProcesses();
        const interval = setInterval(fetchProcesses, 3000);
        
        window.addEventListener("resize", updateTableHeight);
        updateTableHeight();

        return () => {
            clearInterval(interval);
            window.removeEventListener("resize", updateTableHeight);
        }
    }, []);

    const filteredProcesses = processes.filter((p) => p.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase()));

    const updateTableHeight = () => {
        const height = window.innerHeight - 200;
        setTableHeight(height > 200 ? height : 200);
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Process Manager</h1>

            <input
                type="text"
                placeholder="Filter by process name..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded mb-4"
            />

            {loading? (
                <p className="text-center">Loading...</p>
            ): (
                <div className="overflow-auto border border-grey-300 rounded" style={{ height: `${tableHeight}px`}}>
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="p-2">PID</th>
                                <th className="p-2">Name</th>
                                <th className="p-2">CPU (%)</th>
                                <th className="p-2">Memory (KB)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProcesses.length > 0 ?(
                                filteredProcesses.map((process) => (
                                    <tr key={process.pid} className="border-b hover:b-gray-100">
                                        <td className="p-2">{process.pid}</td>
                                        <td className="p-2">{process.name}</td>
                                        <td className="p-2">{process.cpu}</td>
                                        <td className="p-2">{process.mem}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="text-center p-4">
                                        No Processes found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}