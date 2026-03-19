# @skillkit/cli

CLI for building, testing, linting, and benchmarking Agent Skills across 27+ AI coding tools.

## Install

```bash
npm install -g @skillkit/cli
```

## Usage

```bash
skillkit lint .                                    # Lint all SKILL.md files
skillkit lint . --preset research                  # Lint with research preset
skillkit test .                                    # Run tests (mock mode)
skillkit test . --real --provider claude-code       # Run tests (real AI execution)
skillkit bench config.yaml                         # Benchmark (mock mode)
skillkit bench config.yaml --real --provider claude-code  # Benchmark (real AI)
skillkit init my-skill                             # Scaffold a new skill
skillkit adapt component                           # Generate project-specific skill
```

## Documentation

See the full [skillkit documentation](https://github.com/sakhilchawla/skillkit).
