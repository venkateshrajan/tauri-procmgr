import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";

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
    const [tableHeight, setTableHeight] = useState<number>(400);
    const [sortKey, setSortKey] = useState<keyof Process>('name' as keyof Process);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollPosition = useRef<number>(0);

    // Fetch process list form the tauri backend
    const fetchProcesses = async() => {
        setLoading(true);
        try {
            scrollPosition.current = scrollRef.current?.scrollTop || 0;
            const result = await invoke<Process[]>("get_processes");
            setProcesses(result);
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollPosition.current;
                }
            }, 0);
        } finally {
            setLoading(false);
        } 
    }

    const updateTableHeight = () => {
        const height = window.innerHeight - 200;
        setTableHeight(height > 200 ? height : 200);
    }

    const handleSort = (key: keyof Process) => {
        setSortOrder(sortKey == key && sortOrder === 'asc' ? 'desc' : 'asc');
        setSortKey(key);
    }

    const sortedProcesses = [...processes].sort((a,b) => {
        if(!sortKey) return 0;
        const aValue = a[sortKey];
        const bValue = b[sortKey];
        return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1: -1);
    })

    const filteredProcesses = sortedProcesses.filter((p) => p.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase()));

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
                <div ref={scrollRef} className="overflow-auto border border-grey-300 rounded" style={{ height: `${tableHeight}px`}}>
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-200 sticky top-0 z-10">
                            <tr>
                                {['pid', 'name', 'cpu', 'mem'].map((key) => (
                                    <th
                                        key={key}
                                        className="p-2 cursor-pointer hover:bg-gray-300"
                                        onClick={() => handleSort(key as keyof Process)}
                                    >
                                        {key.toUpperCase()} {sortKey === key ? (sortOrder === 'asc' ? '↑' : '↓'): ''}
                                    </th>
                                ))}
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