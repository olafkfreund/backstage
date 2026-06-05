---
name: add-command
description: Add a new background command (shell command or async action) to this COSMIC applet, wire it into the message enum, and surface it in the popup view.
---

# Add a background command / menu item to ${{ values.name }}

When the user asks to add a new action to the popup (e.g. "add a 'Reload' button" or "add a 'Disk usage' entry that runs `df -h /`"), follow these steps **in order**, verifying each before continuing.

The applet follows the Elm pattern (`view` / `update` / `subscription`). Every new action is two `Message` variants — a *request* and a *result* — plus a button in `view` and two arms in `update`.

## 1. Decide the action shape

Decide three things up front:

| Question                                  | Example answer                                |
|-------------------------------------------|-----------------------------------------------|
| What's the label?                         | `"Disk usage"`                                |
| What command runs?                        | `df -h /`                                     |
| Should the result replace the main output, or appear in a dedicated row? | dedicated row             |

For a dedicated row, add a new `Option<String>` field to the `Window` struct in `src/window.rs`. For a replacement, just reuse the existing `last_output` field.

## 2. Add the Message variants

In `src/window.rs`, extend the `Message` enum:

```rust
#[derive(Clone, Debug)]
pub enum Message {
    TogglePopup,
    PopupClosed(Id),
    Tick,
    CommandResult(String),
    CommandError(String),
    // ↓ add these two
    DiskUsageRequested,
    DiskUsageResult(Result<String, String>),
}
```

Pair the variants `*Requested` / `*Result(Result<String, String>)`. The result wraps `Result` so errors flow through the same channel as success.

## 3. Add the button in `view`

Find the popup's `column!` in the `view_window` method and add a button:

```rust
use cosmic::widget::{button, column, text};

column()
    .push(text(self.last_output.as_deref().unwrap_or("loading…")))
    .push(
        button::standard("Disk usage")
            .on_press(Message::DiskUsageRequested),
    )
    .push(
        text(
            self.disk_usage
                .as_deref()
                .unwrap_or(""),
        ),
    )
    .spacing(8)
```

Add `disk_usage: Option<String>` to the `Window` struct and initialise it to `None` in `init`.

## 4. Handle both variants in `update`

```rust
fn update(&mut self, message: Message) -> Task<cosmic::Action<Message>> {
    match message {
        // … existing arms …

        Message::DiskUsageRequested => {
            return cosmic::Task::perform(
                async {
                    use tokio::process::Command;
                    match Command::new("df").arg("-h").arg("/").output().await {
                        Ok(out) if out.status.success() => {
                            Ok(String::from_utf8_lossy(&out.stdout).into_owned())
                        }
                        Ok(out) => Err(String::from_utf8_lossy(&out.stderr).into_owned()),
                        Err(e) => Err(e.to_string()),
                    }
                },
                |res| cosmic::Action::App(Message::DiskUsageResult(res)),
            );
        }
        Message::DiskUsageResult(Ok(s)) => {
            self.disk_usage = Some(s);
        }
        Message::DiskUsageResult(Err(e)) => {
            tracing::warn!(error = %e, "disk usage command failed");
            self.disk_usage = Some(format!("error: {e}"));
        }
    }
    Task::none()
}
```

**Rules:**

- The async work runs inside `Task::perform`. **Do not** block in `update`.
- The closure passed to `Task::perform` must return a `cosmic::Action<Message>` — wrap your message with `cosmic::Action::App(…)`.
- Errors flow through the same `Result` variant; never `unwrap`.
- Log decisions with `tracing` (`info`, `warn`, `error`) — the flake's dev shell sets `RUST_LOG=info,${{ values.name }}=debug`.

## 5. Verify

```bash
cargo fmt --all
nix develop --command cargo clippy --all-targets -- -D warnings
nix develop --command cargo test
nix build
./result/bin/${{ values.name }}
```

Click the new button in the popup; the output should appear within a second. Check the log for any `disk usage command failed` warnings.

## 6. Update docs

Mention the new action in `docs/index.md` (the "What it is" section) so the Backstage TechDocs tab reflects it.

## 7. Commit

Keep the commit focused: one new action per commit makes the message enum diff readable.

```bash
git add -A
git commit -m "feat(applet): add disk-usage action to popup"
```
