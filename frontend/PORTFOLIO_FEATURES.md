# NEXUS frontend additions

## Live monitoring demo
The Overview page now polls the FastAPI backend every 5 seconds. The **Live demo feed** toggle can automatically generate varied network events against the four existing backend demo devices. This makes the dashboard, alerts, event stream, and incident counters update without manually running a scenario.

The live generator is intentionally labeled **demo** because the current backend does not yet ingest SNMP, streaming telemetry, syslog, NetFlow/IPFIX, or vendor controllers. A production next step is to connect those collectors to the FastAPI event pipeline.

## Critical incident attention state
When an active Critical incident exists, the entire Active Incidents dashboard card turns red and uses a subtle card-level pulse until the incident is Resolved or Closed.

## Operator notes
When an incident is in `Investigating`, the incident detail view opens an Operator Notes section. Notes can be linked to the incident or to one of its supporting evidence events. Notes are stored locally by the Next.js server in `.nexus-data/notes.json`.

## Inventory and topology administration
The Admin workspace lets the local administrator add Routers, Switches, Firewalls, ISP Gateways, Servers, Computers, LAN Ports, and Access Points, and link them to upstream devices. The Topology page reads this inventory dynamically and highlights root-cause, observed-impact, and potential-impact nodes from the active backend incident.

Frontend inventory additions do not automatically create matching PostgreSQL `devices` or `device_dependencies` rows in the FastAPI backend. That backend CRUD API is the next step before newly added admin devices can produce correlated backend incidents.

## Authentication
NEXUS now includes local portfolio authentication with:
- scrypt password hashing with per-user salts
- signed session tokens
- HttpOnly, SameSite=Strict session cookies
- admin/operator roles
- sign up, login, logout, and reset-code flow
- route gating in the NEXUS shell

The first account created locally receives the `admin` role. Later accounts receive `operator`.

For production, replace the local JSON user store and development reset-code display with a persistent database, verified email delivery, rate limiting, CSRF strategy, audit logs, MFA/SSO, and backend authorization. Also protect FastAPI itself; frontend route protection alone does not secure port 8000.

## Varied events
Scenario data and the live demo feed now use `interface_down`, `device_unreachable`, `packet_loss`, and `high_latency` across Minor, Major, and Critical severities rather than making every demonstration an `interface_down` Critical event.
