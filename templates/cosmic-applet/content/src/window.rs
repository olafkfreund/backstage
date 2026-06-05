//! The applet's UI state and message loop.
//!
//! Architecture (Elm / Iced):
//!
//! - [`Window::view`]               — pure: state → panel button (the tray icon).
//! - [`Window::view_window`]        — pure: state → popup widget tree.
//! - [`Window::update`]             — state × [`Message`] → new state + optional [`Task`].
//! - [`Window::subscription`]       — state → stream of [`Message`]. Hosts the poll timer.
//!
//! Side effects (running shell commands, etc.) are *only* started from `update`
//! by returning a `Task` — never inline.

use std::time::Duration;

use cosmic::app::Core;
use cosmic::iced::{
    platform_specific::shell::commands::popup::{destroy_popup, get_popup},
    window::Id,
    Length, Limits, Subscription,
};
use cosmic::iced_runtime::core::window;
use cosmic::widget::{button, column, container, text};
use cosmic::{Element, Task};

/// How often we re-run the backend command.
const POLL_INTERVAL: Duration = Duration::from_secs(${{ values.pollIntervalSeconds }});

/// The shell command whose stdout we render in the popup.
const BACKEND_COMMAND: &str = "${{ values.backendCommand }}";

#[derive(Default)]
pub struct Window {
    core: Core,
    /// `Some` when the popup is open; the id is what we hand back to destroy it.
    popup: Option<Id>,
    /// Most recent stdout from `BACKEND_COMMAND`. `None` until the first tick fires.
    last_output: Option<String>,
    /// Most recent error from `BACKEND_COMMAND`, if any.
    last_error: Option<String>,
}

#[derive(Clone, Debug)]
pub enum Message {
    /// Clicked the tray icon. Open the popup if closed, close it if open.
    TogglePopup,
    /// The compositor told us a popup was closed (e.g. by clicking outside).
    PopupClosed(Id),
    /// Timer fired — kick off another run of [`BACKEND_COMMAND`].
    Tick,
    /// Async result of running [`BACKEND_COMMAND`].
    CommandResult(Result<String, String>),
}

impl cosmic::Application for Window {
    type Executor = cosmic::executor::Default;
    type Flags = ();
    type Message = Message;

    const APP_ID: &'static str = crate::APPLET_ID;

    fn core(&self) -> &Core {
        &self.core
    }

    fn core_mut(&mut self) -> &mut Core {
        &mut self.core
    }

    fn init(core: Core, _flags: ()) -> (Self, Task<cosmic::Action<Message>>) {
        let window = Window {
            core,
            ..Default::default()
        };
        // Kick off the first command run immediately so the popup isn't blank.
        let initial = Task::done(cosmic::Action::App(Message::Tick));
        (window, initial)
    }

    fn on_close_requested(&self, id: Id) -> Option<Message> {
        Some(Message::PopupClosed(id))
    }

    fn subscription(&self) -> Subscription<Message> {
        cosmic::iced::time::every(POLL_INTERVAL).map(|_| Message::Tick)
    }

    fn update(&mut self, message: Message) -> Task<cosmic::Action<Message>> {
        match message {
            Message::TogglePopup => {
                return if let Some(id) = self.popup.take() {
                    destroy_popup(id)
                } else {
                    let new_id = Id::unique();
                    self.popup = Some(new_id);

                    let mut popup_settings = self.core.applet.get_popup_settings(
                        self.core.main_window_id().unwrap_or(window::Id::RESERVED),
                        new_id,
                        None,
                        None,
                        None,
                    );
                    popup_settings.positioner.size_limits = Limits::NONE
                        .max_width(360.0)
                        .min_width(240.0)
                        .max_height(480.0)
                        .min_height(80.0);
                    get_popup(popup_settings)
                };
            }

            Message::PopupClosed(id) => {
                if self.popup == Some(id) {
                    self.popup = None;
                }
            }

            Message::Tick => {
                return Task::perform(
                    async {
                        use tokio::process::Command;
                        let parts = match shell_words::split(BACKEND_COMMAND) {
                            Ok(p) if !p.is_empty() => p,
                            Ok(_) => return Err("empty backend command".to_owned()),
                            Err(e) => return Err(format!("invalid backend command: {e}")),
                        };
                        let (program, args) = parts.split_first().unwrap();
                        match Command::new(program).args(args).output().await {
                            Ok(out) if out.status.success() => {
                                Ok(String::from_utf8_lossy(&out.stdout).trim_end().to_owned())
                            }
                            Ok(out) => Err(String::from_utf8_lossy(&out.stderr).trim_end().to_owned()),
                            Err(e) => Err(e.to_string()),
                        }
                    },
                    |res| cosmic::Action::App(Message::CommandResult(res)),
                );
            }

            Message::CommandResult(Ok(stdout)) => {
                tracing::debug!(bytes = stdout.len(), "backend command ok");
                self.last_output = Some(stdout);
                self.last_error = None;
            }

            Message::CommandResult(Err(stderr)) => {
                tracing::warn!(error = %stderr, "backend command failed");
                self.last_error = Some(stderr);
            }
        }
        Task::none()
    }

    fn view(&self) -> Element<'_, Message> {
        // The tray icon. Clicking it toggles the popup.
        self.core
            .applet
            .icon_button("utilities-terminal-symbolic")
            .on_press(Message::TogglePopup)
            .into()
    }

    fn view_window(&self, _id: Id) -> Element<'_, Message> {
        let body: Element<Message> = if let Some(err) = &self.last_error {
            text(format!("error: {err}")).into()
        } else if let Some(out) = &self.last_output {
            text(out.clone()).into()
        } else {
            text("loading…").into()
        };

        let refresh = button::standard("Refresh now").on_press(Message::Tick);

        let content = column()
            .push(text(format!("$ {BACKEND_COMMAND}")).size(12))
            .push(body)
            .push(refresh)
            .spacing(8)
            .padding(12)
            .width(Length::Fill);

        self.core
            .applet
            .popup_container(container(content))
            .into()
    }
}

// `shell-words` is a tiny crate; we declare it here so anyone running
// `cargo expand` sees where the split comes from.
mod shell_words {
    pub use ::shell_words::*;
}
