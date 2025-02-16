
use sysinfo::System;

#[derive(Debug, Clone, serde::Serialize)]
pub struct Process {
    pid : u32,
    name: String,
    cpu: f32,
    mem: u64,
}

#[tauri::command]
fn get_processes() -> Vec<Process> {
    let mut system = System::new_all();
    system.refresh_all();

    system.processes().iter().map(|(&pid, process)| {
        Process {
            pid : pid.as_u32(),
            name: process.name().to_string_lossy().to_string(),
            cpu: process.cpu_usage(),
            mem: process.memory(),
        }
    }).collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![get_processes])
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
        assert!(processes.iter().all(|p| !p.name.is_empty()), "All Processes should have a name");

        println!("{:<10} {:<30} {:<10} {:<10}", "PID", "Name", "CPU (%)", "Memory (KB)");
        for process in processes {
            println!("{:<10} {:<30} {:<10.2} {:<10}", process.pid, process.name, process.cpu, process.mem);
        }
    }
}