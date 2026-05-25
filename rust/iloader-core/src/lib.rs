use idevice::{IdeviceService, lockdown::LockdownClient, provider::IdeviceProvider};

use crate::error::AppError;

pub mod account;
pub mod device;
pub mod error;
pub mod logging;

pub async fn read_lockdown_values(provider: &dyn IdeviceProvider) -> Result<String, AppError> {
    let mut lockdown = LockdownClient::connect(provider).await.map_err(|e| {
        AppError::DeviceComsWithMessage("Unable to connect to lockdown".into(), e.to_string())
    })?;

    println!("Calling lockdown.get_value(None, None)…");
    let value = lockdown.get_value(None, None).await.map_err(|e| {
        AppError::DeviceComsWithMessage("Failed to fetch lockdown values".into(), e.to_string())
    })?;

    let mut buf = Vec::new();
    plist::to_writer_xml(&mut buf, &value).map_err(|e| {
        AppError::DeviceComsWithMessage("Failed to serialize plist".into(), e.to_string())
    })?;
    let xml = String::from_utf8(buf).map_err(|e| {
        AppError::DeviceComsWithMessage("Failed to convert plist to UTF-8".into(), e.to_string())
    })?;

    println!("Got {} bytes of plist:", xml.len());

    Ok(xml)
}
