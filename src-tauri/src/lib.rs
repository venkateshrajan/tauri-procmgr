use log::{error, info};
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, Pid, ProcessRefreshKind, RefreshKind, System};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, serde::Serialize)]
pub struct Process {
    pid: u32,
    name: String,
    cpu: f32,
    mem: u64,
    status: String,
}

#[tauri::command]
fn get_processes() -> Vec<Process> {
    let mut system = System::new_with_specifics(
        RefreshKind::nothing()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory(MemoryRefreshKind::everything())
            .with_processes(ProcessRefreshKind::nothing().with_cpu().with_memory()),
    );
    std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
    system.refresh_specifics(
        RefreshKind::nothing()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory(MemoryRefreshKind::everything())
            .with_processes(ProcessRefreshKind::nothing().with_cpu().with_memory()),
    );

    // std::thread::sleep(std::time::Duration::from_millis(10000));

    let cpu_count = system
        .physical_core_count()
        .expect("Couldn't get the physical core count") as f32;
    system
        .processes()
        .iter()
        .map(|(&pid, process)| Process {
            pid: pid.as_u32(),
            name: process.name().to_string_lossy().to_string(),
            cpu: process.cpu_usage() / cpu_count,
            mem: process.memory(),
            status: process.status().to_string(),
        })
        .collect()
}

#[tauri::command]
fn start_process_listener(app: AppHandle) {
    std::thread::spawn(move || loop {
        let processes = get_processes();
        app.emit("process_list_update", processes).unwrap();
        std::thread::sleep(std::time::Duration::from_secs(3));
    });
}

#[tauri::command]
fn kill_process(pid: usize) {
    let mut system = System::new_with_specifics(
        RefreshKind::nothing().with_processes(ProcessRefreshKind::nothing()),
    );
    system.refresh_specifics(RefreshKind::nothing().with_processes(ProcessRefreshKind::nothing()));

    match system.process(Pid::from(pid)) {
        Some(p) => {
            if p.kill() {
                info!("Pid {} killed successfully", pid);
            } else {
                error!("Failed to kill {}", pid);
            }
        }
        None => {
            info!("Pid {} not found", pid);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_processes,
            kill_process,
            start_process_listener
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_processes() {
        let processes = get_processes();
        assert!(!processes.is_empty(), "Process list should not be empty");
        assert!(
            processes.iter().all(|p| !p.name.is_empty()),
            "All Processes should have a name"
        );

        println!(
            "{:<10} {:<30} {:<10} {:<10}",
            "PID", "Name", "CPU (%)", "Memory (KB)"
        );
        for process in processes {
            println!(
                "{:<10} {:<30} {:<10.2} {:<10}",
                process.pid, process.name, process.cpu, process.mem
            );
        }
    }
}
