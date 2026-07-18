"""
Parser HEX -> Data Motor 1,2,3,4

Format data (16 byte / 32 karakter hex):
  Byte 0-1  : Motor 1  (uint16, little-endian)
  Byte 2-3  : Motor 2  (uint16, little-endian)
  Byte 4-5  : Motor 3  (uint16, little-endian)
  Byte 6-7  : Motor 4  (uint16, little-endian)
  Byte 8-15 : reserved / padding (tidak dipakai, biasanya 0)

Contoh:
  HEX : 58043704470420040000000000000000
  -> Motor1=1112  Motor2=1079  Motor3=1095  Motor4=1056
"""

import struct


def parse_motor_hex(hex_str: str) -> dict:
    """
    Decode satu string HEX menjadi dict {motor1, motor2, motor3, motor4, reserved}.

    Parameters
    ----------
    hex_str : str
        String hex (boleh ada spasi/karakter non-hex, akan dibersihkan otomatis).
        Minimal harus berisi 8 byte (16 hex char) pertama untuk 4 motor.

    Returns
    -------
    dict dengan keys: motor1, motor2, motor3, motor4, reserved_hex
    """
    # Bersihkan whitespace, biar tahan kalau ada spasi/newline ikut ke-copy
    clean = "".join(hex_str.split())

    if len(clean) % 2 != 0:
        raise ValueError(f"Panjang hex ganjil, tidak valid: {len(clean)} karakter")

    raw = bytes.fromhex(clean)

    if len(raw) < 8:
        raise ValueError(f"Data terlalu pendek, butuh minimal 8 byte, dapat {len(raw)} byte")

    motor1, motor2, motor3, motor4 = struct.unpack("<4H", raw[:8])
    reserved = raw[8:]  # sisanya (biasanya padding nol)

    return {
        "motor1": motor1,
        "motor2": motor2,
        "motor3": motor3,
        "motor4": motor4,
        "reserved_hex": reserved.hex().upper(),
    }


def parse_motor_line(line: str) -> dict:
    """
    Decode satu baris data seperti format asli (kolom dipisah TAB),
    kolom terakhir adalah HEX. Cocok untuk parsing langsung dari file log.

    Contoh input:
      "1112\\t1079\\t1095\\t1056\\t0\\t0\\t0\\t0\\t58043704470420040000000000000000"
    """
    cols = line.strip().split("\t")
    hex_str = cols[-1]
    result = parse_motor_hex(hex_str)
    result["raw_columns"] = cols[:-1]
    return result


if __name__ == "__main__":
    # ---- Contoh pakai langsung dengan string HEX ----
    samples = [
"E803E803E803E8030000000000000000",
"41043204360420040000000000000000",
"40042F04360420040000000000000000",
"E803E803E803E8030000000000000000",
"E803E803E803E8030000000000000000",
"E803E803E803E8030000000000000000",
"E803E803E803E8030000000000000000",
"E803E803E803E8030000000000000000",
"E803E803E803E8030000000000000000",
"E803E803E803E8030000000000000000",
"E803E803E803E8030000000000000000",
"40043004330420040000000000000000",
"43043104310420040000000000000000",
"41042F04320420040000000000000000",
"58043704470420040000000000000000",
"C105ED04FA0420040000000000000000",
"21060105FA0420040000000000000000",
"2D06AE04A70422040000000000000000",
"3406A904F80431040000000000000000",
"6C06C804E90488040000000000000000",
"0F062505440514050000000000000000",
"06065F05960549050000000000000000",
"3C064D057405B1050000000000000000",
"5B066605A105E7050000000000000000",
"38069A05C80519060000000000000000",
"3006DD05EC054D060000000000000000",
"4706370616061F060000000000000000",
"24062D06260641060000000000000000",
"3A063D062F0634060000000000000000",
"2806E205A505EE050000000000000000",
"1906ED055E0626060000000000000000",
"530618064E0646060000000000000000",
"34061D06240637060000000000000000",
"2406E605E8054A060000000000000000",
"2506D805160637060000000000000000",
"0D06FF0500064C060000000000000000",
"0F06EE05080623060000000000000000",
"C0042004D00705060000000000000000",
"E803E803E803E8030000000000000000"
    ]

    print(f"{'HEX':<34} | {'M1':>5} {'M2':>5} {'M3':>5} {'M4':>5}")
    print("-" * 65)
    for h in samples:
        d = parse_motor_hex(h)
        print(f"{h:<34} | {d['motor1']:>5} {d['motor2']:>5} {d['motor3']:>5} {d['motor4']:>5}")