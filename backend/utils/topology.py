def find_affected_devices(device_id, dependencies):
    affected_devices = {}
    devices_to_check = [(device_id, 0)]

    while devices_to_check:
        current_device,depth = devices_to_check.pop()

        for dependency in dependencies:
            if dependency["upstream_device_id"] == current_device:
                downstream_id = dependency["downstream_device_id"]

                if downstream_id not in affected_devices:
                    next_depth = depth + 1
                    affected_devices[downstream_id] = next_depth
                    devices_to_check.append((downstream_id, next_depth))

    return affected_devices
