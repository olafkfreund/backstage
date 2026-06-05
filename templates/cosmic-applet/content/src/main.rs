//! ${{ values.name }} — ${{ values.description }}
//!
//! libcosmic applet entry point. The real work lives in [`window::Window`],
//! which implements [`cosmic::Application`] and owns the popup state.

mod window;

use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

/// Reverse-DNS identifier registered with the COSMIC panel.
///
/// Keep this in sync with `res/${{ values.appletId }}.desktop`. Changing it
/// after release orphans any persisted COSMIC panel state for the applet.
pub const APPLET_ID: &str = "${{ values.appletId }}";

fn main() -> cosmic::iced::Result {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,${{ values.name }}=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!(applet_id = APPLET_ID, "starting ${{ values.name }}");

    cosmic::applet::run::<window::Window>(())
}
