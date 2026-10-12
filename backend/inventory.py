"""Shared development inventory used by the UI and correlation engine.

Topology membership lives in a JSON snapshot; PostgreSQL keeps device identity
and historical events. Removing a device never deletes its event history.
"""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_FILE = ROOT / "network" / "topology.json"
DEVICE_TYPES = {"Router", "Switch", "Firewall", "ISP Gateway", "Gateway", "Server", "Storage", "Computer", "Printer", "Access Point", "LAN Port"}


def validate_inventory(data):
    devices = data["devices"]
    ids = [device["id"] for device in devices]
    if len(ids) != len(set(ids)) or any(not id.strip() for id in ids):
        raise ValueError("Device IDs must be nonempty and unique")
    for device in devices:
        if not device["name"].strip() or device["type"] not in DEVICE_TYPES:
            raise ValueError("Invalid device name or type")
    edges = set()
    link_ids = set()
    children = {id: [] for id in ids}
    for link in data["links"]:
        source, target = link["source"], link["target"]
        if source not in children or target not in children:
            raise ValueError("Link endpoints must exist")
        if source == target or (source, target) in edges or link["id"] in link_ids:
            raise ValueError("Links must be unique and cannot be self-links")
        edges.add((source, target))
        link_ids.add(link["id"])
        children[source].append(target)
    visited, visiting = set(), set()

    def visit(id):
        if id in visiting:
            raise ValueError("Dependency cycles are not supported")
        if id in visited:
            return
        visiting.add(id)
        for child in children[id]:
            visit(child)
        visiting.remove(id)
        visited.add(id)

    for id in ids:
        visit(id)
    return data


def read_inventory():
    file = Path(os.getenv("NEXUS_INVENTORY_FILE", str(ROOT / ".nexus-data" / "inventory.json")))
    if file.exists():
        return validate_inventory(json.loads(file.read_text()))
    # Until the UI initializes its shared snapshot, use the bundled topology.
    # Preserve previous custom inventories rather than silently resetting them.
    legacy = Path(os.getenv("NEXUS_DATA_DIR", str(ROOT / "frontend" / ".nexus-data"))) / "inventory.json"
    if legacy.exists():
        data = json.loads(legacy.read_text())
        legacy_devices = {(f"dev-00{i}", f"router-0{i}", "Router") for i in range(1, 5)}
        legacy_edges = {("dev-001", "dev-002"), ("dev-001", "dev-003"), ("dev-002", "dev-004")}
        is_demo = len(data["devices"]) == 4 and {(d["id"], d["name"], d["type"]) for d in data["devices"]} == legacy_devices
        is_demo = is_demo and len(data["links"]) == 3 and {(l["source"], l["target"]) for l in data["links"]} == legacy_edges
        positions = [(50, 14), (30, 48), (70, 48), (30, 82)]
        is_demo = is_demo and all(
            d.get("ip") == f"10.0.0.{i + 1}" and d.get("status") == "Operational"
            and (d.get("x"), d.get("y")) == positions[i] and not d.get("zone") and not d.get("role")
            for i, d in enumerate(data["devices"])
        ) and all(link.get("label") == "uplink" for link in data["links"])
        if not is_demo:
            return validate_inventory(data)
    return validate_inventory(json.loads(DEFAULT_FILE.read_text()))


def sync_devices(connection, data):
    """Upsert identities, retaining removed devices for historical joins."""
    with connection.cursor() as cursor:
        cursor.executemany(
            "INSERT INTO devices (id, name) VALUES (%s, %s) "
            "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name",
            [(device["id"], device["name"]) for device in data["devices"]],
        )
    connection.commit()


def inventory_dependencies(data):
    names = {device["id"]: device["name"] for device in data["devices"]}
    return [
        {"upstream_device_id": link["source"], "upstream_device": names[link["source"]],
         "downstream_device_id": link["target"], "downstream_device": names[link["target"]]}
        for link in data["links"]
    ]
