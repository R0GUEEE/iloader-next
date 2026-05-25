use iloader_core::logging::ExtendedLogRecord;
use tracing_subscriber::layer::Context;
use tracing_subscriber::{Layer, registry::LookupSpan};
use wasm_bindgen::JsValue;
use web_sys::{CustomEvent, console};

pub struct WasmLoggingLayer {}

impl<S> Layer<S> for WasmLoggingLayer
where
    S: tracing::Subscriber + for<'a> LookupSpan<'a>,
{
    fn on_event(&self, event: &tracing::Event<'_>, _ctx: Context<'_, S>) {
        let record = ExtendedLogRecord::from_event(event);
        console::log_1(
            &format!(
                "[{}]: {} - {}",
                record.level, record.timestamp, record.message
            )
            .into(),
        );
        let event = CustomEvent::new("log-record");
        if let Ok(event) = event {
            let js_value = serde_wasm_bindgen::to_value(&record).unwrap_or(JsValue::NULL);
            event.init_custom_event_with_can_bubble_and_cancelable_and_detail(
                "log-record",
                true,
                false,
                &js_value,
            );

            if let Some(window) = web_sys::window() {
                let _ = window.dispatch_event(&event);
            }
        }
    }
}
