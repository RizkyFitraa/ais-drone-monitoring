import socket, time
from random import random
from pyais.encode import encode_dict

M = lambda v, b: int(v) & ((1 << b) - 1)

def pack_drone_data(lon, lat, alt, sog, heading, battery, sats, mode, roll, pitch, yaw):
    lon_r   = M(lon * 600000, 28)
    lat_r   = M(lat * 600000, 27)
    alt_r   = int(alt)
    sog_r   = M(sog * 10, 10)
    hdg_r   = M(heading, 9)
    roll_r  = M(roll * 10 + 1800, 12)
    pitch_r = M(pitch * 10 + 1800, 12)
    yaw_r   = M(yaw, 9)

    bits = (
        f'{lon_r:028b}{lat_r:027b}{alt_r:012b}{sog_r:010b}{hdg_r:09b}'
        f'{int(battery):08b}{int(sats):06b}{int(mode):04b}{roll_r:012b}{pitch_r:012b}{yaw_r:09b}'
    )
    while len(bits) % 8:
        bits += '0'
    return bytes(int(bits[i:i+8], 2) for i in range(0, len(bits), 8))

def main():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    addr = ('127.0.0.1', 10110)
    print('[*] Simulasi drone via UDP :10110 — CTRL+C untuk berhenti')
    print('    MSG 8 (drone telemetry) tiap 2 detik')
    print('    MSG 9 (SAR position)    tiap 10 detik')
    print('    MSG 24 (static name)    tiap 6 menit')
    t0 = time.time()
    t_last8 = 0.0
    t_last9 = 0.0
    t_last24 = 0.0
    while True:
        now = time.time()
        t = now - t0

        lon = 112.8096 + (random() - .5) * .002
        lat = -7.28739 + (random() - .5) * .002
        alt = 100 + (int(t) % 20 < 10) * 50
        sog = 15 + (random() - .5) * 5
        hdg = int((t * 5) % 360)
        cog = (t * 7) % 360
        bat = max(0, 80 - t / 10)

        if now - t_last8 >= 2:
            data = pack_drone_data(
                lon=lon, lat=lat, alt=alt, sog=sog, heading=hdg,
                battery=bat, sats=12, mode=2,
                roll=(random() - .5) * 12,
                pitch=(random() - .5) * 8,
                yaw=int(random() * 360),
            )
            nmea8 = encode_dict({'type': 8, 'mmsi': '970123456', 'dac': 366, 'fid': 56, 'data': data})[0]
            sock.sendto((nmea8 + '\r\n').encode(), addr)
            print(f'[MSG8] {nmea8}')
            t_last8 = now

        if now - t_last24 >= 360:
            nmea24 = encode_dict({
                'type': 24, 'mmsi': '970123456',
                'part': 0, 'shipname': 'AIRCRAFT PROTOTIPE',
            })[0]
            sock.sendto((nmea24 + '\r\n').encode(), addr)
            print(f'[MSG24] {nmea24}')
            t_last24 = now

        if now - t_last9 >= 10:
            nmea9 = encode_dict({
                'type': 9, 'mmsi': '970123456',
                'alt': int(alt), 'speed': int(sog),
                'accuracy': 1, 'lon': lon, 'lat': lat,
                'course': cog, 'second': int(now) % 60,
                'dte': 0, 'assigned': 0, 'raim': 0,
            })[0]
            sock.sendto((nmea9 + '\r\n').encode(), addr)
            print(f'[MSG9] {nmea9}')
            t_last9 = now

        time.sleep(0.1)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n[*] Berhenti')
