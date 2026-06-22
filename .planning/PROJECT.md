# PitchLab TMA Redesign (Football Live Goals Clone)

## What This Is

A Telegram Mini App (TMA) for real-time football scores, fixtures, and predictions. The app provides a seamless user experience strictly matching the "Football Live Goals" reference design, with auto-login via Telegram so users never have to manually register. 

## Core Value

Frictionless access to live football data and predictions directly inside Telegram with an absolutely pixel-perfect, premium iOS-style UI.

## Requirements

### Validated

- ✓ Basic Telegram Mini App integration
- ✓ Next.js App Router foundation
- ✓ Database schema for Fixtures, Users, Channels
- ✓ Seamless automatic login via Telegram initData

### Active

- [ ] Pixel-perfect UI match of "Football Live Goals" dashboard (fixtures list)
- [ ] Bottom navigation bar matches reference design exactly
- [ ] "My Teams" view redesign to match the new aesthetic
- [ ] "Predictions" view redesign to match the new aesthetic
- [ ] Native-feeling transitions and micro-interactions

### Out of Scope

- User registration forms (handled automatically via Telegram)
- Web-only layout optimizations (mobile TMA first)

## Context

The user provided screenshots of "Football Live Goals" and expressed dissatisfaction with the previous "landing page" style UI. They want a pure TMA experience that feels like a native iOS app. The backend auth is already working seamlessly, so the focus is entirely on UI/UX and design system alignment.

## Constraints

- **Platform**: Telegram Mini App
- **Design System**: Strict adherence to the provided reference screenshots (clean, white background, specific padding, borders, typography).
- **Tech Stack**: Next.js, TailwindCSS, React

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Auto-login via TMA | Reduces friction, meets user requirement of "no registration" | ✓ Good |
| Ditch previous landing page | Focus completely on the TMA experience | — Pending |

---
*Last updated: 2026-06-20 after GSD initialization*
