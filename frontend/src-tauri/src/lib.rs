use std::{sync::Mutex, time::Duration};

use idevice::provider::UsbmuxdProvider;
use iloader_core::{account::Account, error::AppError, read_lockdown_values};
use isideload::{
    auth::builder::AppleAccountBuilder,
    dev::developer_session::DeveloperSession,
    sideload::{SideloaderBuilder, sideloader::Sideloader},
};
use tauri::{Emitter, Listener, Manager, State};

pub mod device;
pub type ProviderMutex = Mutex<Option<UsbmuxdProvider>>;
pub type SideloaderMutex = Mutex<Option<(Sideloader, Account)>>;

use device::get_devices;

#[tauri::command]
async fn read_lockdown(device_state: State<'_, ProviderMutex>) -> Result<String, AppError> {
    let provider = {
        let device_lock = device_state.lock().unwrap();
        match &*device_lock {
            Some(d) => d.clone(),
            None => return Err(AppError::NoDeviceSelected),
        }
    };

    read_lockdown_values(&provider).await
}

#[tauri::command]
async fn login(
    window: tauri::Window,
    sideloader_state: State<'_, SideloaderMutex>,
    email: String,
    password: String,
) -> Result<(), AppError> {
    let tfa_closure = {
        let window = window.clone();
        move || {
            let window = window.clone();
            async move {
                window
                    .emit("2fa-required", ())
                    .expect("Failed to emit 2fa-required event");

                let (tx, rx) = std::sync::mpsc::channel::<String>();
                let handler_id = window.listen("2fa-recieved", move |event| {
                    let code = event.payload();
                    let _ = tx.send(code.to_string());
                });

                let result = rx.recv_timeout(Duration::from_secs(120));
                window.unlisten(handler_id);

                match result {
                    Ok(code) => Some(code.trim_matches('"').to_string()),
                    Err(_) => None,
                }
            }
        }
    };

    let mut account = AppleAccountBuilder::new(&email)
        .login(&password, tfa_closure)
        .await?;

    let dev_session = DeveloperSession::from_account(&mut account).await?;

    let sideloader = SideloaderBuilder::new(dev_session, email.to_lowercase())
        .machine_name("iloader".into())
        // .max_certs_behavior(MaxCertsBehavior::Prompt(Box::new(max_certs_callback)))
        .build();

    *sideloader_state.lock().unwrap() = Some((sideloader, Account::from_account(&account)?));

    Ok(())
}

#[tauri::command]
async fn logged_in_as(
    sideloader_state: State<'_, SideloaderMutex>,
) -> Result<Option<Account>, AppError> {
    let sideloader_lock = sideloader_state.lock().unwrap();
    Ok(sideloader_lock.as_ref().map(|(_, account)| account.clone()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            app.manage(ProviderMutex::new(None));
            app.manage(SideloaderMutex::new(None));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_devices,
            read_lockdown,
            login,
            logged_in_as
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
