use iloader_core::{
    error::AppError,
    operation::{OperationUpdate, OperationUpdateEmitter},
};
use tauri::Emitter;

struct TauriOperationUpdateEmitter<'a> {
    window: &'a tauri::Window,
}

impl<'a> TauriOperationUpdateEmitter<'a> {
    pub fn new(window: &'a tauri::Window) -> Self {
        Self { window }
    }
}

impl<'a> OperationUpdateEmitter for TauriOperationUpdateEmitter<'a> {
    fn emit_operation_update(&self, id: &str, update: OperationUpdate) -> Result<(), AppError> {
        let event_name = format!("operation_{}", id);
        self.window
            .emit(&event_name, &update)
            .map_err(|e| AppError::OperationUpdate(e.to_string()))?;

        Ok(())
    }
}
