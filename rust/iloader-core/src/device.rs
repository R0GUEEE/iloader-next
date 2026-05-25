use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::wasm_bindgen;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub udid: String,
    pub name: String,
    pub connection_type: ConnectionType,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen]
pub enum ConnectionType {
    USB,
    Network,
    WebUSB,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetDevicesResponse {
    pub devices: Vec<DeviceInfo>,
    pub selected: usize,
}
