mod local_storage;
mod logging;
mod webusb;

use std::{
    io::{Cursor, Read},
    path::PathBuf,
    sync::{Mutex, OnceLock},
};

use idevice::{IdeviceService, lockdown::LockdownClient};
use iloader_core::{
    account::Account,
    device::{ConnectionType, DeviceInfo},
    error::{AppError, WasmError},
    read_lockdown_values,
};
use isideload::{
    anisette::remote_v3::RemoteV3AnisetteProvider,
    auth::builder::AppleAccountBuilder,
    dev::developer_session::DeveloperSession,
    sideload::{SideloaderBuilder, sideloader::Sideloader},
};
use netmuxd::usb::provider::UsbMuxProvider;
use tracing_subscriber::{Layer, Registry, layer::SubscriberExt, util::SubscriberInitExt};
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::console;

use crate::{local_storage::LocalStorage, webusb::get_webusb_provider};

static IDEVICE: OnceLock<Mutex<Option<UsbMuxProvider>>> = OnceLock::new();
static SIDELOADER: OnceLock<Mutex<Option<(Sideloader, Account)>>> = OnceLock::new();

#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
    let _ = isideload::init();
    isideload_vfs::set_vfs(Box::new(isideload_vfs::memory::MemoryVfs::new()));

    let wasm_layer =
        (logging::WasmLoggingLayer {}).with_filter(tracing_subscriber::filter::LevelFilter::DEBUG);

    Registry::default().with(wasm_layer).init();
}

#[wasm_bindgen]
pub async fn get_devices() -> Result<JsValue, WasmError> {
    let provider = get_webusb_provider("iloader-web").await?;

    let mut lockdown_client = LockdownClient::connect(&provider).await.map_err(|e| {
        console::error_1(&format!("Unable to connect to lockdown: {e:?}").into());
        AppError::DeviceComsWithMessage("Unable to connect to lockdown".into(), e.to_string())
    })?;

    let device_name_value = lockdown_client
        .get_value(Some("DeviceName"), None)
        .await
        .map_err(|e| {
            console::error_1(&format!("Failed to fetch DeviceName: {e:?}").into());
            AppError::DeviceComsWithMessage("Failed to fetch DeviceName".into(), e.to_string())
        })?;

    let device_name = device_name_value.as_string().ok_or_else(|| {
        console::error_1(&format!("DeviceName was not a string").into());
        AppError::DeviceComs("DeviceName was not a string".into())
    })?;

    let version_value = lockdown_client
        .get_value(Some("ProductVersion"), None)
        .await
        .map_err(|e| {
            console::error_1(&format!("Failed to fetch ProductVersion: {e:?}").into());
            AppError::DeviceComsWithMessage("Failed to fetch ProductVersion".into(), e.to_string())
        })?;

    let version = version_value.as_string().ok_or_else(|| {
        console::error_1(&format!("ProductVersion was not a string").into());
        AppError::DeviceComs("Product version was not a string".into())
    })?;

    let udid_value = lockdown_client
        .get_value(Some("UniqueDeviceID"), None)
        .await
        .map_err(|e| {
            console::error_1(&format!("Failed to fetch UniqueDeviceID: {e:?}").into());
            AppError::DeviceComsWithMessage("Failed to fetch UniqueDeviceID".into(), e.to_string())
        })?;

    let udid = udid_value.as_string().ok_or_else(|| {
        console::error_1(&format!("UniqueDeviceID was not a string").into());
        AppError::DeviceComs("UniqueDeviceID was not a string".into())
    })?;

    let devices: Vec<DeviceInfo> = vec![DeviceInfo {
        name: device_name.to_string(),
        udid: udid.to_string(),
        connection_type: ConnectionType::WebUSB,
        version: version.to_string(),
    }];

    let mutex = IDEVICE.get_or_init(|| Mutex::new(None));
    *mutex.lock().unwrap() = Some(provider);

    Ok(serde_wasm_bindgen::to_value(&devices)
        .map_err(|e| AppError::Misc(format!("serde to JsValue: {e:?}")))?)
}

#[wasm_bindgen]
pub async fn read_lockdown() -> Result<String, WasmError> {
    let mutex = IDEVICE.get_or_init(|| Mutex::new(None));
    let lock = mutex
        .lock()
        .map_err(|e| AppError::Misc(format!("Failed to lock IDEVICE mutex: {e:?}")))?;
    let provider = lock
        .as_ref()
        .ok_or_else(|| AppError::Misc("No device provider available".into()))?;

    let res = read_lockdown_values(provider).await?;
    Ok(res)
}

#[wasm_bindgen]
pub async fn login(
    email: String,
    password: String,
    two_factor_callback: js_sys::Function,
) -> Result<(), WasmError> {
    let storage = Box::new(LocalStorage::new()?);
    let anisette_provider = RemoteV3AnisetteProvider::default()?.set_storage(storage.clone());
    let mut account = AppleAccountBuilder::new(&email)
        .anisette_provider(anisette_provider)
        .login(&password, || async {
            let promise: js_sys::Promise = two_factor_callback
                .call0(&JsValue::NULL)
                .ok()?
                .dyn_into()
                .ok()?;

            let value = wasm_bindgen_futures::JsFuture::from(promise).await.ok()?;
            value.as_string()
        })
        .await?;
    let dev_session = DeveloperSession::from_account(&mut account).await?;

    let sideloader = SideloaderBuilder::new(dev_session, email.to_lowercase())
        .machine_name("iloader".into())
        .storage(storage)
        // .max_certs_behavior(MaxCertsBehavior::Prompt(Box::new(max_certs_callback)))
        .build();

    let sideloader_mutex = SIDELOADER.get_or_init(|| Mutex::new(None));
    *sideloader_mutex.lock().unwrap() = Some((sideloader, Account::from_account(&account)?));

    Ok(())
}

#[wasm_bindgen]
pub async fn logged_in_as() -> Result<Option<Account>, WasmError> {
    let sideloader_mutex = SIDELOADER.get_or_init(|| Mutex::new(None));
    let sideloader = sideloader_mutex.lock().unwrap();
    if let Some((_, account)) = sideloader.as_ref() {
        Ok(Some(account.clone()))
    } else {
        Ok(None)
    }
}

#[wasm_bindgen]
pub async fn install_app() -> Result<(), WasmError> {
    let sideloader_mutex = SIDELOADER.get_or_init(|| Mutex::new(None));
    let mut sideloader_lock = sideloader_mutex.lock().unwrap();
    let (sideloader, _) = sideloader_lock
        .as_mut()
        .ok_or_else(|| AppError::Misc("Not logged in".into()))?;

    let device_provider_mutex = IDEVICE.get_or_init(|| Mutex::new(None));
    let device_provider_lock = device_provider_mutex
        .lock()
        .map_err(|e| AppError::Misc(format!("Failed to lock IDEVICE mutex: {e:?}")))?;
    let device_provider = device_provider_lock
        .as_ref()
        .ok_or_else(|| AppError::Misc("No device provider available".into()))?;

    let file = web_sys::window()
        .ok_or_else(|| AppError::Misc("No window object".into()))?
        .document()
        .ok_or_else(|| AppError::Misc("No document object".into()))?
        .create_element("input")
        .map_err(|e| AppError::Misc(format!("Failed to create input element: {e:?}")))?
        .dyn_into::<web_sys::HtmlInputElement>()
        .map_err(|e| AppError::Misc(format!("Failed to cast to HtmlInputElement: {e:?}")))?;
    file.set_type("file");
    file.set_accept(".ipa,application/zip");

    let promise = js_sys::Promise::new(&mut |resolve, _reject| {
        let closure = Closure::once_into_js(move |_: web_sys::Event| {
            let _ = resolve.call0(&JsValue::NULL);
        });
        file.set_onchange(Some(closure.unchecked_ref()));
    });

    file.click();

    JsFuture::from(promise)
        .await
        .map_err(|e| AppError::Misc(format!("Failed to wait for file selection: {e:?}")))?;

    let file_list = file
        .files()
        .ok_or_else(|| AppError::Misc("No files selected".into()))?;
    let first_file = file_list
        .get(0)
        .ok_or_else(|| AppError::Misc("No file selected".into()))?;
    let file_name = first_file.name();
    let array_buffer = JsFuture::from(first_file.array_buffer())
        .await
        .map_err(|e| AppError::Misc(format!("Failed to read file as array buffer: {e:?}")))?;
    let uint8_array = js_sys::Uint8Array::new(&array_buffer);
    let mut buffer = vec![0; uint8_array.length() as usize];
    uint8_array.copy_to(&mut buffer);

    let path = extract_ipa_to_vfs(&buffer, "/")?;

    sideloader.install_app(device_provider, path, false).await?;

    Ok(())
}

fn extract_ipa_to_vfs(buffer: &[u8], dest_dir: &str) -> Result<PathBuf, AppError> {
    let cursor = Cursor::new(buffer);
    let mut archive = zip::ZipArchive::new(cursor)
        .map_err(|e| AppError::Misc(format!("Failed to open zip: {e:?}")))?;

    let dest_path = PathBuf::from(dest_dir);
    let mut app_path = None;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| AppError::Misc(format!("Failed to read zip file at index {i}: {e:?}")))?;

        let relative_path = file.enclosed_name().unwrap_or(PathBuf::from("unknown"));
        let outpath = dest_path.join(relative_path.clone());

        if let Some(ext) = relative_path.extension() {
            if ext == "app" && app_path.is_none() {
                app_path = Some(outpath.clone());
            }
        }

        if file.name().ends_with('/') {
            let _ = isideload_vfs::fs::create_dir_all(&outpath);
        } else {
            if let Some(p) = outpath.parent() {
                let _ = isideload_vfs::fs::create_dir_all(p);
            }

            let is_symlink = file
                .unix_mode()
                .is_some_and(|mode| mode & 0o170000 == 0o120000);

            if is_symlink {
                let mut target_path = String::new();
                file.read_to_string(&mut target_path)
                    .map_err(|e| AppError::Misc(format!("Failed to read symlink target: {e:?}")))?;

                isideload_vfs::fs::symlink(&target_path, &outpath)
                    .map_err(|e| AppError::Misc(format!("Failed to create symlink: {e:?}")))?;
            } else {
                let mut outfile_buf = Vec::new();
                file.read_to_end(&mut outfile_buf)
                    .map_err(|e| AppError::Misc(format!("Failed to read file from zip: {e:?}")))?;

                isideload_vfs::fs::write(&outpath, outfile_buf)
                    .map_err(|e| AppError::Misc(format!("Failed to write file to VFS: {e:?}")))?;

                if let Some(mode) = file.unix_mode() {
                    if let Ok(mut perms) =
                        isideload_vfs::fs::metadata(&outpath).map(|m| m.permissions())
                    {
                        use isideload_vfs::fs::PermissionsExt;
                        perms.set_mode(mode);
                        let _ = isideload_vfs::fs::set_permissions(&outpath, perms);
                    }
                }
            }
        }
    }

    app_path.ok_or_else(|| AppError::Misc("Could not find a .app directory inside the IPA".into()))
}
