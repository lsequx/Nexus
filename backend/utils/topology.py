from collections import deque


def find_affected_devices(device_id, dependencies):
    """Potential downstream scope with shortest-hop depths, not proven outages.

    Breadth-first traversal handles multiple uplinks and malformed cyclic input
    without including the root itself or overstating a direct dependency depth.
    """
    affected_devices = {}
    devices_to_check = deque([(device_id, 0)])
    visited = {device_id}
    children = {}
    for dependency in dependencies:
        children.setdefault(dependency["upstream_device_id"], []).append(dependency["downstream_device_id"])

    while devices_to_check:
        current_device, depth = devices_to_check.popleft()
        for downstream_id in children.get(current_device, []):
            if downstream_id not in visited:
                visited.add(downstream_id)
                next_depth = depth + 1
                affected_devices[downstream_id] = next_depth
                devices_to_check.append((downstream_id, next_depth))

    return affected_devices
