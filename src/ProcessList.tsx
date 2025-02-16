import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
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
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 50;

  // Fetch process list form the tauri backend
  const fetchProcesses = async () => {
    if (loading) return;
    try {
      setLoading(true);
      const result = await invoke<Process[]>("get_processes");
      setProcesses(result);
      setLastUpdated(Date.now());
    } catch (error) {
      console.error("Failed to fetch processes:", error);
    }
    setLoading(false);
  };

  const updateTableHeight = () => {
    const height = window.innerHeight - 250;
    setTableHeight(height > 200 ? height : 250);
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

  const paginatedpProcesses = filteredProcesses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
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
    const unlisten = listen<Process[]>("process_list_update", (event) => {
      setProcesses(event.payload);
    });

    invoke("start_process_listener");

    window.addEventListener("resize", updateTableHeight);
    updateTableHeight();

    return () => {
      window.removeEventListener("resize", updateTableHeight);
      unlisten.then((unsub) => unsub());
    };
  }, []);

  const getTitle = (title: string) => {
    switch (title) {
      case "sno":
        return "S.No";
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
      {loading && <div className="text-center mb-2">Loading...</div>}
      <div
        ref={scrollRef}
        className="overflow-auto border border-grey-300 rounded"
        style={{ height: `${tableHeight}px` }}
      >
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-200 sticky top-0 z-10">
            <tr>
              {["sno", "pid", "name", "cpu", "mem", "status", "actions"].map(
                (key) => (
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
                )
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedpProcesses.length > 0 ? (
              paginatedpProcesses.map((process, i) => (
                <tr key={i} className="border-b hover:b-gray-100 text-center">
                  <td className="p-2">{i}</td>
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
                <td colSpan={7} className="text-center p-4">
                  No Processes found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-4">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {(processes.length / itemsPerPage).toFixed(0)}
        </span>
        <button
          disabled={currentPage * itemsPerPage >= filteredProcesses.length}
          onClick={() => setCurrentPage(currentPage + 1)}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
