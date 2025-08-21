# cargo-flamegraph Documentation

This document summarizes usage, installation, and configuration details for `flamegraph-rs/flamegraph`, a Rust-powered flamegraph generator. It is useful for profiling Rust projects and arbitrary binaries, without requiring Perl or pipes.

Built on top of `jonhoo/inferno` all-rust flamegraph generation library.

## Quick Start

-   **Rust projects**:
    ```bash
    cargo flamegraph
    ```
-   **Arbitrary binaries**:
    ```bash
    flamegraph -- /path/to/binary
    ```

For understanding how to interpret flamegraphs, refer to the "Systems Performance Work Guided By Flamegraphs" section below.

## Installation

`[cargo-]flamegraph` supports Linux, MacOS, and Windows.

To install:
```bash
cargo install flamegraph
```
This command makes `flamegraph` and `cargo-flamegraph` binaries available in your Cargo binary directory (e.g., `~/.cargo/bin`).

### Linux

Relies on `perf`.

**Note**: If you're using `lld` or `mold` on Linux, you must use the `--no-rosegment` flag.
Example for `lld` in `.cargo/config.toml`:
```toml
[target.x86_64-unknown-linux-gnu]
linker = "/usr/bin/clang"
rustflags = ["-Clink-arg=-fuse-ld=lld", "-Clink-arg=-Wl,--no-rosegment"]
```

#### Debian (x86 and aarch)
```bash
sudo apt install -y linux-perf
```
Requires an up-to-date Rust version (use `rustup` or Debian bookworm+).

#### Ubuntu (x86)
```bash
sudo apt install linux-tools-common linux-tools-generic linux-tools-`uname -r`
```

#### Ubuntu/Ubuntu MATE (Raspberry Pi)
```bash
sudo apt install linux-tools-raspi
```

#### Pop!_OS
```bash
sudo apt install linux-tools-common linux-tools-generic
```

### Windows

#### Blondie Backend (Default)
Windows is supported out-of-the-box thanks to the `blondie` library.

#### DTrace on Windows
Alternatively, you can [install DTrace on Windows](https://learn.microsoft.com/en-us/windows-hardware/drivers/devtest/dtrace). If found, `flamegraph` will prefer `dtrace` over the built-in Windows support.

## Shell Auto-completion

Only `flamegraph` supports auto-completion. Supported shells: `bash`, `fish`, `zsh`, `powershell`, `elvish`.
Example for `bash`:
```bash
flamegraph --completions bash > $XDG_CONFIG_HOME/bash_completion # or /etc/bash_completion.d/
```

## Examples

-   **Profile an arbitrary executable**:
    ```bash
    flamegraph [-o my_flamegraph.svg] -- /path/to/my/binary --my-arg 5
    ```
-   **Profile an already running process by PID**:
    ```bash
    flamegraph [-o my_flamegraph.svg] --pid 1337
    ```
-   **Disable inlining for perf script (performance issues)**:
    ```bash
    flamegraph --no-inline [-o my_flamegraph.svg] /path/to/my/binary --my-arg 5
    ```
-   **Cargo projects (defaults to `cargo run --release`)**:
    ```bash
    cargo flamegraph
    ```
-   **Specify build profile (e.g., `--dev`)**:
    ```bash
    cargo flamegraph --dev
    ```
-   **Profile a specific binary**:
    ```bash
    cargo flamegraph --bin=stress2
    ```
-   **Pass arguments to the profiled binary**:
    ```bash
    cargo flamegraph -- my-command --my-arg my-value -m -f
    ```
-   **Use custom `perf` or `dtrace` options**:
    ```bash
    cargo flamegraph -c "record -e branch-misses -c 100 --call-graph lbr -g"
    ```
-   **Run Criterion benchmark**:
    ```bash
    cargo flamegraph --bench some_benchmark --features some_features -- --bench
    ```
-   **Run example**:
    ```bash
    cargo flamegraph --example some_example --features some_features
    ```
-   **Profile unit tests**:
    ```bash
    cargo flamegraph --unit-test -- test::in::package::with::single::crate
    ```
-   **Profile integration tests**:
    ```bash
    cargo flamegraph --test test_name
    ```

## Usage

`flamegraph` is simple. `cargo-flamegraph` offers more options:

```
Usage: cargo flamegraph [OPTIONS] [-- <TRAILING_ARGUMENTS>...]

Arguments:
  [TRAILING_ARGUMENTS]...  Trailing arguments passed to the binary being profiled

Options:
      --dev                            Build with the dev profile
      --profile <PROFILE>              Build with the specified profile
  -p, --package <PACKAGE>              package with the binary to run
  -b, --bin <BIN>                      Binary to run
      --example <EXAMPLE>              Example to run
      --test <TEST>                    Test binary to run (currently profiles the test harness and all tests in the binary)
      --unit-test [<UNIT_TEST>]        Crate target to unit test, <unit-test> may be omitted if crate only has one target (currently profiles the test harness and all tests in the binary; test selection can be passed as trailing arguments after `--` as separator)
      --bench <BENCH>                  Benchmark to run
      --manifest-path <MANIFEST_PATH>  Path to Cargo.toml
  -f, --features <FEATURES>            Build features to enable
      --no-default-features            Disable default features
  -r, --release                        No-op. For compatibility with `cargo run --release`
  -v, --verbose                        Print extra output to help debug problems
  -o, --output <OUTPUT>                Output file [default: flamegraph.svg]
      --open                           Open the output .svg file with default program
      --root                           Run with root privileges (using `sudo`)
  -F, --freq <FREQUENCY>               Sampling frequency in Hz [default: 997]
  -c, --cmd <CUSTOM_CMD>               Custom command for invoking perf/dtrace
      --deterministic                  Colors are selected such that the color of a function does not change between runs
  -i, --inverted                       Plot the flame graph up-side-down
      --reverse                        Generate stack-reversed flame graph
      --notes <STRING>                 Set embedded notes in SVG
      --min-width <FLOAT>              Omit functions smaller than <FLOAT> pixels [default: 0.01]
      --image-width <IMAGE_WIDTH>      Image width in pixels
      --palette <PALETTE>              Color palette [possible values: hot, mem, io, red, green, blue, aqua, yellow, purple, orange, wakeup, java, perl, js, rust]
      --skip-after <FUNCTION>          Cut off stack frames below <FUNCTION>; may be repeated
      --flamechart                     Produce a flame chart (sort by time, do not merge stacks)
      --ignore-status                  Ignores perf's exit code
      --no-inline                      Disable inlining for perf script because of performance issues
      --post-process <POST_PROCESS>    Run a command to process the folded stacks, taking the input from stdin and outputting to stdout
  -h, --help                           Print help
  -V, --version                        Print version
```
After generation, open the resulting `flamegraph.svg` with a browser for interactivity.

## Enabling perf for use by unprivileged users

To enable `perf` without running as root, lower the `perf_event_paranoid` value:
```bash
echo -1 | sudo tee /proc/sys/kernel/perf_event_paranoid
```
The value `-1` is the most permissive.

## Improving output when running with `--release`

To improve information quality in flamegraphs for release builds, set `debug = true` in your `Cargo.toml` under `[profile.release]`:
```toml
[profile.release]
debug = true
```
Alternatively, set the environment variable `CARGO_PROFILE_RELEASE_DEBUG=true`.
Note that tests, unit tests, and benchmarks use the `bench` profile in release mode; configure `[profile.bench]` similarly.

## Usage with benchmarks

For profiling benchmarks, set `debug = true` in your `Cargo.toml` under `[profile.bench]`:
```toml
[profile.bench]
debug = true
```

## Use custom paths for perf and dtrace

Set `PERF` or `DTRACE` environment variables to specify custom tool paths.
Example:
```bash
env PERF=~/bin/perf flamegraph /path/to/my/binary
```

## Use custom `addr2line` binary for perf

To address `addr2line` performance issues, use `gimli-rs/addr2line`:
```bash
cargo install addr2line --features=bin
```

# Systems Performance Work Guided By Flamegraphs

Flamegraphs visualize where CPU time is spent. They are generated by sampling threads' instruction pointers and call stacks. Stacks with common functions are aggregated, and the width of a box indicates the proportion of total samples that contained that function.

-   **Y-axis**: Shows stack depth (main function at bottom, called functions stacked above).
-   **X-axis**: Spans all samples; order has no time-based meaning.
-   **Width**: Represents total time a function is on the CPU or part of the call stack. Wider means more CPU consumption or more frequent calls.
-   **Color**: Random and not significant.

Flamegraphs are excellent for identifying the most expensive parts of your program at runtime, as human intuition about performance is often incorrect. They serve as a starting point for optimization, guiding where to focus further, more detailed measurements (e.g., benchmarks, `cachegrind`). Remember that flamegraphs are sampling-based and might not capture all aspects (e.g., IO waiting time).
