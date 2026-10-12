import copy
import json
from datetime import datetime, timedelta

import pytest
from inventory import DEFAULT_FILE, read_inventory, validate_inventory, inventory_dependencies, sync_devices
from database import connection
from utils.topology import find_affected_devices
from utils.correlation import analyze_root_cause, correlate_events_across_devices


def reference():
    return validate_inventory(json.loads(DEFAULT_FILE.read_text()))


def test_firewall_scope_spans_dmz_and_servers_but_not_management():
    scope = find_affected_devices("dev-002", inventory_dependencies(reference()))
    assert scope["dev-web"] == 2
    assert scope["dev-app"] == 3
    assert scope["dev-laptop"] == 4
    assert "dev-jump" not in scope
    assert "dev-001" not in scope


def test_access_point_does_not_affect_wired_clients():
    assert find_affected_devices("dev-ap", inventory_dependencies(reference())) == {"dev-laptop": 1}


def test_multiple_paths_use_shortest_depth_and_cycles_exclude_root():
    edges = [("a", "b"), ("a", "c"), ("c", "d"), ("d", "b"), ("b", "a")]
    deps = [{"upstream_device_id": a, "downstream_device_id": b} for a, b in edges]
    assert find_affected_devices("a", deps) == {"b": 1, "c": 1, "d": 2}


def test_realistic_firewall_evidence_has_upstream_root_cause():
    now = datetime(2026, 10, 12, 12)
    events = [dict(id=f"event-{i}", device_id=id, type=kind, severity=severity, timestamp=now + timedelta(seconds=i))
              for i, (id, kind, severity) in enumerate([("dev-002", "interface_down", "Critical"), ("dev-web", "packet_loss", "Major"), ("dev-app", "packet_loss", "Major")])]
    deps = inventory_dependencies(reference())
    groups = correlate_events_across_devices(events, deps)
    assert len(groups) == 1
    assert len(groups[0]["events"]) == 3
    result = analyze_root_cause(events, deps)
    assert result["root_cause"]["device_id"] == "dev-002"
    assert result["reason"] == "topology_supported"


def test_snapshot_updates_backend_dependencies(monkeypatch, tmp_path):
    file = tmp_path / "inventory.json"
    data = reference()
    file.write_text(json.dumps(data))
    monkeypatch.setenv("NEXUS_INVENTORY_FILE", str(file))
    assert len(read_inventory()["devices"]) == 20
    data["devices"].append(dict(id="custom", name="custom-server", type="Server"))
    data["links"].append(dict(id="custom-link", source="dev-tor-a", target="custom", label="VLAN 20"))
    file.write_text(json.dumps(data))
    assert find_affected_devices("dev-tor-a", inventory_dependencies(read_inventory()))["custom"] == 1


def test_inventory_rejects_invalid_graph():
    data = copy.deepcopy(reference())
    data["links"].append(dict(id="cycle", source="dev-laptop", target="dev-003", label="cycle"))
    with pytest.raises(ValueError, match="cycles"):
        validate_inventory(data)


def test_inventory_registration_preserves_removed_device_history(cleanup_test_data):
    data = {"devices": [dict(id="test-inventory-server", name="test-server", type="Server")], "links": []}
    sync_devices(connection, data)
    sync_devices(connection, {"devices": [], "links": []})
    with connection.cursor() as cursor:
        cursor.execute("SELECT name FROM devices WHERE id = 'test-inventory-server'")
        assert cursor.fetchone()[0] == "test-server"
