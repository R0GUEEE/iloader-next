use iloader_core::logging::ExtendedLogRecord;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tracing_subscriber::layer::Context;
use tracing_subscriber::{Layer, registry::LookupSpan};

pub struct TauriLoggingLayer {
    app_handle: Arc<AppHandle>,
}

impl TauriLoggingLayer {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle: Arc::new(app_handle),
        }
    }
}

impl<S> Layer<S> for TauriLoggingLayer
where
    S: tracing::Subscriber + for<'a> LookupSpan<'a>,
{
    fn on_event(&self, event: &tracing::Event<'_>, _ctx: Context<'_, S>) {
        let record = ExtendedLogRecord::from_event(event);
        let _ = self.app_handle.emit("log-record", &record);
    }
}
