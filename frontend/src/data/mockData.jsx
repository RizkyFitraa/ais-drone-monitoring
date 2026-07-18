import { headingLabel } from "../utils/helpers"

export const INITIAL_DRONE = {
  mmsi:'999000001',callsign:'DRONE-01',lat:-7.278600738489167,lon:112.79499732949397,
  alt:92.0,sog:5.4,cog:310,battery:82,rssi:-58,satellites:16,
  mode:'LOITER',roll:1.2,pitch:-0.8,yaw:310.0,heading:310,
  groundspeed:5.2,airspeed:5.5,vertspeed:0.0,throttle:38,
  flighttime:'00:09:14',distance:870,ts:'08:12:44',
  rawNMEA:'!AIVDM,1,1,,B,85MF`0P4T1h00000KH08Hq@0000,0*1C',
}

export const INITIAL_AIS_TARGETS = [
  
]
export const MAP_TILES = {
  light:     'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
}
