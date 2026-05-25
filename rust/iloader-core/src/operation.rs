use serde::Serialize;

use crate::error::AppError;

pub trait OperationUpdateEmitter {
    fn emit_operation_update(&self, id: &str, update: OperationUpdate) -> Result<(), AppError>;
}

pub struct Operation<'a> {
    id: String,
    emitter: &'a dyn OperationUpdateEmitter,
}

#[derive(Clone, Serialize)]
pub struct OperationUpdate<'a> {
    update_type: &'a str,
    step_id: &'a str,
    progress: Option<f32>,
    extra_details: Option<AppError>,
}

impl<'a> Operation<'a> {
    pub fn new(id: String, emitter: &'a dyn OperationUpdateEmitter) -> Operation<'a> {
        Operation { id, emitter }
    }

    pub fn move_on(&self, old_id: &str, new_id: &str) -> Result<(), AppError> {
        self.complete(old_id)?;
        self.start(new_id)
    }

    pub fn start(&self, id: &str) -> Result<(), AppError> {
        self.emitter
            .emit_operation_update(
                &self.id,
                OperationUpdate {
                    update_type: "started",
                    step_id: id,
                    progress: Some(0.0),
                    extra_details: None,
                },
            )
            .map_err(|e| AppError::OperationUpdate(e.to_string()))
    }

    pub fn complete(&self, id: &str) -> Result<(), AppError> {
        self.emitter
            .emit_operation_update(
                &self.id,
                OperationUpdate {
                    update_type: "finished",
                    step_id: id,
                    extra_details: None,
                    progress: None,
                },
            )
            .map_err(|e| AppError::OperationUpdate(e.to_string()))
    }

    pub fn fail<T>(&self, id: &str, error: AppError) -> Result<T, AppError> {
        self.emitter
            .emit_operation_update(
                &self.id,
                OperationUpdate {
                    update_type: "failed",
                    step_id: id,
                    extra_details: Some(error.clone()),
                    progress: None,
                },
            )
            .map_err(|e| AppError::OperationUpdate(e.to_string()))?;
        Err(error)
    }

    pub fn progress(&self, id: &str, progress: f32) -> Result<(), AppError> {
        self.emitter
            .emit_operation_update(
                &self.id,
                OperationUpdate {
                    update_type: "progress",
                    step_id: id,
                    progress: Some(progress),
                    extra_details: None,
                },
            )
            .map_err(|e| AppError::OperationUpdate(e.to_string()))
    }

    pub fn fail_if_err<T>(&self, id: &str, res: Result<T, AppError>) -> Result<T, AppError> {
        match res {
            Ok(t) => Ok(t),
            Err(e) => self.fail::<T>(id, e),
        }
    }
}
