mod local_storage;
mod logging;
mod operation;
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
    operation::Operation,
};
use isideload::{
    anisette::remote_v3::RemoteV3AnisetteProvider,
    auth::builder::AppleAccountBuilder,
    dev::{developer_session::DeveloperSession, devices::DevicesApi},
    sideload::{SideloaderBuilder, sideloader::Sideloader},
    util::device::IdeviceInfo,
};
use netmuxd::usb::provider::UsbMuxProvider;
use tracing::info;
use tracing_subscriber::{Layer, Registry, layer::SubscriberExt, util::SubscriberInitExt};
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::console;

use crate::{
    local_storage::LocalStorage, operation::WasmOperationUpdateEmitter, webusb::get_webusb_provider,
};

static IDEVICE: OnceLock<Mutex<Option<UsbMuxProvider>>> = OnceLock::new();
static SIDELOADER: OnceLock<Mutex<Option<(Sideloader, Account)>>> = OnceLock::new();

#[wasm_bindgen(inline_js = r#"
export async function download_with_progress_js(url, on_progress) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const contentLen = response.headers.get("content-length");
    const total = contentLen ? parseInt(contentLen, 10) : 0;
    const reader = response.body.getReader();
    let chunks = [];
    let loaded = 0;
    while(true) {
        const {done, value} = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total > 0) {
            on_progress(loaded / total);
        }
    }
    const result = new Uint8Array(loaded);
    let offset = 0;
    for (let chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
}
"#)]
extern "C" {
    #[wasm_bindgen(catch)]
    async fn download_with_progress_js(
        url: &str,
        on_progress: &js_sys::Function,
    ) -> Result<JsValue, JsValue>;
}

#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
    let _ = isideload::init();
    isideload_vfs::set_vfs(Box::new(isideload_vfs::memory::MemoryVfs::new()));

    let wasm_layer =
        (logging::WasmLoggingLayer {}).with_filter(tracing_subscriber::filter::LevelFilter::INFO);

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
pub async fn install_app_operation() -> Result<(), WasmError> {
    let emitter = WasmOperationUpdateEmitter {};
    let op = Operation::new("sideload".to_string(), &emitter);
    op.start("sign")?;
    let window = op.fail_if_err(
        "sign",
        web_sys::window().ok_or_else(|| AppError::Misc("No window object".into())),
    )?;
    let document = op.fail_if_err(
        "sign",
        window
            .document()
            .ok_or_else(|| AppError::Misc("No document object".into())),
    )?;
    let input = op.fail_if_err(
        "sign",
        document
            .create_element("input")
            .map_err(|e| AppError::Misc(format!("Failed to create input element: {e:?}"))),
    )?;
    let file = op.fail_if_err(
        "sign",
        input
            .dyn_into::<web_sys::HtmlInputElement>()
            .map_err(|e| AppError::Misc(format!("Failed to cast to HtmlInputElement: {e:?}"))),
    )?;

    file.set_type("file");
    file.set_accept(".ipa,application/zip");

    let promise = js_sys::Promise::new(&mut |resolve, _reject| {
        let closure = Closure::once_into_js(move |_: web_sys::Event| {
            let _ = resolve.call0(&JsValue::NULL);
        });
        file.set_onchange(Some(closure.unchecked_ref()));
    });

    file.click();

    op.fail_if_err(
        "sign",
        JsFuture::from(promise)
            .await
            .map_err(|e| AppError::Misc(format!("Failed to wait for file selection: {e:?}"))),
    )?;

    let file_list = op.fail_if_err(
        "sign",
        file.files()
            .ok_or_else(|| AppError::Misc("No files selected".into())),
    )?;
    let first_file = op.fail_if_err(
        "sign",
        file_list
            .get(0)
            .ok_or_else(|| AppError::Misc("No file selected".into())),
    )?;

    let array_buffer = op.fail_if_err(
        "sign",
        JsFuture::from(first_file.array_buffer())
            .await
            .map_err(|e| AppError::Misc(format!("Failed to read file as array buffer: {e:?}"))),
    )?;
    let uint8_array = js_sys::Uint8Array::new(&array_buffer);
    let mut buffer = vec![0; uint8_array.length() as usize];
    uint8_array.copy_to(&mut buffer);
    install_app_internal(&op, buffer).await
}

#[wasm_bindgen]
pub async fn install_sidestore_operation(
    nightly: bool,
    live_container: bool,
) -> Result<(), WasmError> {
    let emitter = WasmOperationUpdateEmitter {};
    let op = Operation::new("install_sidestore".to_string(), &emitter);
    op.start("download")?;
    let url = if live_container {
        if nightly {
            "https://github.com/LiveContainer/LiveContainer/releases/download/nightly/LiveContainer+SideStore.ipa"
        } else {
            "https://github.com/LiveContainer/LiveContainer/releases/latest/download/LiveContainer+SideStore.ipa"
        }
    } else if nightly {
        "https://github.com/SideStore/SideStore/releases/download/nightly/SideStore.ipa"
    } else {
        "https://github.com/SideStore/SideStore/releases/latest/download/SideStore.ipa"
    };
    let proxied_url = format!(
        "https://worker.nabdev.workers.dev/?url={}",
        urlencoding::encode(url)
    );

    // JS callback for progress tracking
    let on_progress_closure = Closure::wrap(Box::new(move |progress: f64| {
        let emitter = WasmOperationUpdateEmitter {};
        let temp_op = Operation::new("install_sidestore".to_string(), &emitter);
        let _ = temp_op.progress("download", progress as f32);
    }) as Box<dyn FnMut(f64)>);

    // Call our embedded JS download function
    let result_val = op.fail_if_err(
        "download",
        download_with_progress_js(&proxied_url, on_progress_closure.as_ref().unchecked_ref())
            .await
            .map_err(|e| AppError::Misc(format!("Failed to download IPA using fetch: {:?}", e))),
    )?;

    // We can clean up the memory for the closure now that the async function is done
    on_progress_closure.forget();

    // Convert result to Vec<u8>
    let uint8_array: js_sys::Uint8Array = result_val
        .dyn_into()
        .map_err(|_| AppError::Misc("Failed to cast result to Uint8Array".into()))?;
    let mut bytes = vec![0; uint8_array.length() as usize];
    uint8_array.copy_to(&mut bytes);

    op.move_on("download", "sign")?;

    install_app_internal(&op, bytes.to_vec()).await?;

    op.move_on("install", "pairing")?;

    op.fail("pairing", AppError::Misc("Not implemented".into()))?;

    Ok(())
}

async fn install_app_internal<'a>(op: &Operation<'a>, buffer: Vec<u8>) -> Result<(), WasmError> {
    let sideloader_mutex = SIDELOADER.get_or_init(|| Mutex::new(None));
    let mut sideloader_lock = op.fail_if_err(
        "sign",
        sideloader_mutex
            .lock()
            .map_err(|e| AppError::Misc(format!("Failed to lock sideloader mutex: {e:?}"))),
    )?;

    let (sideloader, _) = op.fail_if_err(
        "sign",
        sideloader_lock
            .as_mut()
            .ok_or_else(|| AppError::Misc("Not logged in".into())),
    )?;

    let device_provider_mutex = IDEVICE.get_or_init(|| Mutex::new(None));
    let device_provider_lock = op.fail_if_err(
        "sign",
        device_provider_mutex
            .lock()
            .map_err(|e| AppError::Misc(format!("Failed to lock idevice mutex: {e:?}"))),
    )?;
    let device_provider = op.fail_if_err(
        "sign",
        device_provider_lock
            .as_ref()
            .ok_or_else(|| AppError::Misc("No device provider available".into())),
    )?;

    let _ = op.progress("sign", 0.05);

    let path = op.fail_if_err("sign", extract_ipa_to_vfs(&buffer, "/"))?;

    let _ = op.progress("sign", 0.15);

    let team = sideloader.get_team().await?;

    let _ = op.progress("sign", 0.2);

    let (signed_app_path, _) = op.fail_if_err(
        "sign",
        sideloader
            .sign_app(
                path,
                Some(team.clone()),
                false,
                Some(async |progress| {
                    let _ = op.progress("sign", 0.2 + (progress as f32 * 0.8));
                    // without this, the browser will just hang until signing is done, this lets progress updates be seen
                    yield_to_browser().await;
                }),
            )
            .await
            .map_err(|e| AppError::from(e)),
    )?;

    op.move_on("sign", "install")?;

    let device_info = op.fail_if_err(
        "install",
        IdeviceInfo::from_device(device_provider)
            .await
            .map_err(|e| AppError::from(e)),
    )?;

    op.fail_if_err(
        "install",
        sideloader
            .get_dev_session()
            .ensure_device_registered(&team, &device_info.name, &device_info.udid, None)
            .await
            .map_err(|e| AppError::from(e)),
    )?;

    let _ = op.progress("install", 0.15);

    info!("Transferring App...");

    op.fail_if_err(
        "install",
        isideload::sideload::install::install_app(device_provider, &signed_app_path, |progress| {
            info!("Installing: {}%", progress);
            let _ = op.progress("install", 0.2 + 0.8 * (progress as f32 / 100.0));
        })
        .await
        .map_err(|e| AppError::from(e)),
    )?;

    let _ = isideload_vfs::fs::remove_dir_all(signed_app_path);

    op.complete("install")?;

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

async fn yield_to_browser() {
    let promise = js_sys::Promise::new(&mut |resolve, _| {
        web_sys::window()
            .unwrap()
            .request_animation_frame(resolve.unchecked_ref())
            .unwrap();
    });

    let _ = JsFuture::from(promise).await;
}
