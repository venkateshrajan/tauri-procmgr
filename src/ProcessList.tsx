import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";

type Process = {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
  status: string;
};

export default function ProcessList() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [tableHeight, setTableHeight] = useState<number>(400);
  const [sortKey, setSortKey] = useState<keyof Process>(
    "name" as keyof Process
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPosition = useRef<number>(0);

  // Fetch process list form the tauri backend
  const fetchProcesses = async () => {
    try {
      scrollPosition.current = scrollRef.current?.scrollTop || 0;
      const result = await invoke<Process[]>("get_processes");
      setProcesses((prevProcesses) =>
        JSON.stringify(prevProcesses) !== JSON.stringify(result)
          ? result
          : prevProcesses
      );
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollPosition.current;
        }
      });
    } catch (error) {
      console.error("Failed to fetch processes:", error);
    }
  };

  const updateTableHeight = () => {
    const height = window.innerHeight - 200;
    setTableHeight(height > 200 ? height : 200);
  };

  const handleSort = (key: keyof Process) => {
    setSortOrder(sortKey == key && sortOrder === "asc" ? "desc" : "asc");
    setSortKey(key);
  };

  const sortedProcesses = processes
    .filter((p) => p.name.toLowerCase().includes(filter.toLocaleLowerCase()))
    .sort((a, b) => {
      if (!sortKey) return 0;
      let aValue = a[sortKey];
      let bValue = b[sortKey];
      if (sortKey === "name") {
        aValue = aValue.toString().toLocaleLowerCase();
        bValue = bValue.toString().toLocaleLowerCase();
      }
      return sortOrder === "asc"
        ? aValue > bValue
          ? 1
          : -1
        : aValue < bValue
        ? 1
        : -1;
    });

  const filteredProcesses = sortedProcesses.filter((p) =>
    p.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase())
  );

  const killProcess = async (pid: number) => {
    try {
      await invoke("kill_process", { pid });
      fetchProcesses();
    } catch (error) {
      console.error(`Failed to kill process ${pid}:`, error);
    }
  };

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 3000);

    window.addEventListener("resize", updateTableHeight);
    updateTableHeight();

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", updateTableHeight);
    };
  }, []);

  const getTitle = (title: string) => {
    switch (title) {
      case "pid":
        return "Process ID";
      case "name":
        return "Name";
      case "cpu":
        const totalCPU = filteredProcesses.reduce((n, p) => n + p.cpu, 0);
        return `CPU Usage (${totalCPU.toFixed(1)}%)`;
      case "mem":
        let totalMem = filteredProcesses.reduce((n, p) => n + p.mem, 0);
        totalMem = totalMem / (1024 * 1024 * 1024);
        return `Memory (${totalMem.toFixed(2)} GB)`;
      case "status":
        return "Status";
      case "actions":
        return "Actions";
    }
  };

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

      <div
        ref={scrollRef}
        className="overflow-auto border border-grey-300 rounded"
        style={{ height: `${tableHeight}px` }}
      >
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-200 sticky top-0 z-10">
            <tr>
              {["pid", "name", "cpu", "mem", "status", "actions"].map((key) => (
                <th
                  key={key}
                  className="p-2 cursor-pointer hover:bg-gray-300 text-center"
                  onClick={() =>
                    key !== "actions" && handleSort(key as keyof Process)
                  }
                >
                  {getTitle(key)}{" "}
                  {sortKey === key ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredProcesses.length > 0 ? (
              filteredProcesses.map((process) => (
                <tr
                  key={process.pid}
                  className="border-b hover:b-gray-100 text-center"
                >
                  <td className="p-2">{process.pid}</td>
                  <td className="p-2">{process.name}</td>
                  <td className="p-2">{process.cpu.toFixed(1)}%</td>
                  <td className="p-2">
                    {(process.mem / (1024 * 1024)).toFixed(2)} MB
                  </td>
                  <td className="p-2">{process.status}</td>
                  <td className="p-2">
                    <button
                      onClick={() => killProcess(process.pid)}
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-500"
                    >
                      Kill
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center p-4">
                  No Processes found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
