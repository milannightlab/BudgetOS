export function vehiclesModulePath() {
  return "/modules/transport";
}

export function vehiclePath(vehicleId: string) {
  return `${vehiclesModulePath()}/${vehicleId}`;
}

export function vehicleServicePath(vehicleId: string, serviceId: string) {
  return `${vehiclePath(vehicleId)}/services/${serviceId}`;
}
