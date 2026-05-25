use iloader_core::{
    error::AppError,
    operation::{OperationUpdate, OperationUpdateEmitter},
};

pub struct WasmOperationUpdateEmitter;

impl OperationUpdateEmitter for WasmOperationUpdateEmitter {
    fn emit_operation_update(&self, id: &str, update: OperationUpdate) -> Result<(), AppError> {
        let event = web_sys::CustomEvent::new(&format!("operation_{}", id)).map_err(|e| {
            AppError::OperationUpdate(
                serde_wasm_bindgen::from_value(e).unwrap_or("Unknown error".to_string()),
            )
        })?;
        let js_value = serde_wasm_bindgen::to_value(&update)
            .map_err(|e| AppError::OperationUpdate(e.to_string()))?;
        event.init_custom_event_with_can_bubble_and_cancelable_and_detail(
            &format!("operation_{}", id),
            true,
            false,
            &js_value,
        );

        if let Some(window) = web_sys::window() {
            window.dispatch_event(&event).map_err(|e| {
                AppError::OperationUpdate(
                    serde_wasm_bindgen::from_value(e).unwrap_or("Unknown error".to_string()),
                )
            })?;
        }

        Ok(())
    }
}
