/*
 * ============================================================
 * MSP → AIS + WiFi Monitor + MicroSD Logger + WS2812B LED
 * S500 + Matek F722-SE + ESP32
 * ============================================================
 * PIN SESUAI SCHEMATIC:
 *   FC (Betaflight) : RX=GPIO26 (RXDRONE), TX=GPIO27 (TXDRONE)
 *   AIT33 (AIS)     : RX=GPIO16 (RXAIS),   TX=GPIO17  (TXAIS)
 *   MicroSD (SPI)   : MOSI=23, MISO=19, SCK=18, CS=5
 *   LED GPIO        : GPIO32
 *   BUZZ            : GPIO25
 *   WS2812B         : GPIO15
 * ============================================================
 *
 * WS2812B LED ARM CONFIG:
 *   4 ARM x 25 LED = 100 LED total
 *   ARM1 : LED  0 - 24  (Motor 1 — kanan depan)
 *   ARM2 : LED 25 - 49  (Motor 2 — kiri depan)
 *   ARM3 : LED 50 - 74  (Motor 3 — kanan belakang)
 *   ARM4 : LED 75 - 99  (Motor 4 — kiri belakang)
 *
 * LOGIKA WARNA BERDASARKAN GERAKAN DRONE:
 * ┌─────────────────┬────────────────────────────────────────┐
 * │ Gerakan         │ Warna LED                              │
 * ├─────────────────┼────────────────────────────────────────┤
 * │ NAIK (throttle) │ Semua arm → BIRU penuh                 │
 * │ TURUN           │ Semua arm → KUNING berkedip            │
 * │ GESER KANAN     │ Motor 1&2 → HIJAU, Motor 3&4 → MERAH  │
 * │ GESER KIRI      │ Motor 1&2 → MERAH, Motor 3&4 → HIJAU  │
 * │ MAJU            │ Motor 2&4 → HIJAU, Motor 1&3 → MERAH  │
 * │ MUNDUR          │ Motor 2&4 → MERAH, Motor 1&3 → HIJAU  │
 * │ IDLE / HOVER    │ Motor 1&3 → MERAH, Motor 2&4 → BIRU   │
 * └─────────────────┴────────────────────────────────────────┘
 *
 * PRIORITAS DETEKSI (urutan cek dari atas ke bawah):
 *   1. TURUN  (throttle rendah + drone sedang terbang)
 *   2. NAIK   (throttle tinggi)
 *   3. GESER KANAN / KIRI  (roll dominan > pitch)
 *   4. MAJU / MUNDUR       (pitch dominan >= roll)
 *   5. IDLE / HOVER        (semua dalam deadband)
 *
 * RC CHANNEL MAPPING (Betaflight default Mode 2):
 *   CH1 = Roll    (1000=kiri penuh, 1500=center, 2000=kanan penuh)
 *   CH2 = Pitch   (1000=mundur penuh, 1500=center, 2000=maju penuh)
 *   CH3 = Throttle(1000=bawah, 2000=atas)
 *   CH4 = Yaw
 *
 * ============================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <SPI.h>
#include <SD.h>
#include <FastLED.h>
#include "dashboard.h"

// ============================================================
// PIN & UART — SESUAI SCHEMATIC
// ============================================================
#define FC_SERIAL       Serial2
#define FC_BAUD         115200
#define FC_RX_PIN       26
#define FC_TX_PIN       27

#define AIT33_SERIAL    Serial1
#define AIT33_BAUD      9600
#define AIT33_RX_PIN    16
#define AIT33_TX_PIN    17

#define DEBUG_SERIAL    Serial
#define DEBUG_BAUD      115200

#define SD_CS_PIN       5
#define SD_MOSI_PIN     23
#define SD_MISO_PIN     19
#define SD_SCK_PIN      18

#define LED_PIN         32
#define BUZZ_PIN        25

// ============================================================
// WS2812B CONFIG
// ============================================================
#define WS2812B_PIN     15
#define NUM_LEDS        100
#define LED_BRIGHTNESS  100
#define LED_TYPE        WS2812B
#define COLOR_ORDER     GRB

CRGB leds[NUM_LEDS];

// ARM layout (4 arm x 25 LED)
// Layout motor pada frame S500 dilihat dari atas:
//
//        DEPAN
//   M2 ──┐ ┌── M1
//         FC
//   M4 ──┘ └── M3
//        BELAKANG
//
#define ARM_LEN     25
#define ARM1_START  25  // Motor 1: kanan depan
#define ARM2_START  50  // Motor 2: kiri depan
#define ARM3_START   0  // Motor 3: kanan belakang
#define ARM4_START  75  // Motor 4: kiri belakang

// ---- Threshold RC untuk deteksi gerakan ----
// RC center = 1500. Gerakan dianggap aktif jika simpangan > DEADBAND
#define RC_CENTER       1500
#define RC_DEADBAND     80    // ±80 dari center = ±5.3% stick
#define THROTTLE_HIGH   1650  // throttle > ini = naik
#define THROTTLE_LOW    1350  // throttle < ini = turun (saat armed)
#define THROTTLE_ARMED  1100  // throttle > ini = drone dianggap armed/terbang

// ---- Interval update LED (ms) ----
#define INTERVAL_LED        50UL
#define INTERVAL_LED_BLINK  300UL   // periode kedip kuning saat turun

// ---- State LED ----
enum DroneState {
  STATE_IDLE   = 0,
  STATE_NAIK,
  STATE_TURUN,
  STATE_KANAN,
  STATE_KIRI,
  STATE_MAJU,
  STATE_MUNDUR
};

DroneState currentDroneState = STATE_IDLE;
DroneState lastDroneState    = STATE_IDLE;

unsigned long tLED      = 0;
unsigned long tBlink    = 0;
bool          blinkOn   = false;

// ============================================================
// WiFi CONFIG
// ============================================================
const char* WIFI_SSID = "DRONE-MONITOR";
const char* WIFI_PASS = "drone1234";
IPAddress LOCAL_IP(192, 168, 4, 1);
IPAddress GATEWAY(192, 168, 4, 1);
IPAddress SUBNET(255, 255, 255, 0);

WiFiServer       httpServer(80);
WebSocketsServer wsServer(81);

// ============================================================
// AIS CONFIG
// ============================================================
#define AIS_MMSI        970123456UL
#define AIS_DAC         1
#define AIS_FI          40
#define INTERVAL_MSG9   10000UL
#define INTERVAL_MSG8   3000UL

// ============================================================
// MSP CODES & INTERVALS
// ============================================================
#define MSP_ATTITUDE    108
#define MSP_RAW_IMU     102
#define MSP_ALTITUDE    109
#define MSP_RAW_GPS     106
#define MSP_ANALOG      110
#define MSP_RC          105
#define MSP_MOTOR       104
#define MSP_STATUS      101

#define INTERVAL_FAST    50UL
#define INTERVAL_MEDIUM  100UL
#define INTERVAL_SLOW    500UL
#define INTERVAL_WS      100UL
#define INTERVAL_SD_LOG  1000UL

// ============================================================
// DATA STRUCTS — PARSED
// ============================================================
struct MSP_ATTITUDE_t { int16_t roll, pitch, yaw; };
struct MSP_RAW_IMU_t  { int16_t accX,accY,accZ,gyrX,gyrY,gyrZ,magX,magY,magZ; };
struct MSP_ALTITUDE_t { int32_t altitude; int16_t vario; };
struct MSP_RAW_GPS_t  { uint8_t fix,numSat; int32_t lat,lon; uint16_t alt,speed,groundCourse; };
struct MSP_ANALOG_t   { uint8_t vbat; uint16_t mAhDrawn,rssi; int16_t amperage; };
struct MSP_RC_t       { uint16_t channel[16]; };
struct MSP_MOTOR_t    { uint16_t motor[8]; };
struct MSP_STATUS_t   { uint16_t cycleTime,i2cError,activeSensors; uint32_t flightModeFlags; uint8_t profile; };

// ============================================================
// RAW MSP BUFFER
// ============================================================
#define RAW_BUF_LEN 128

struct RawMSP_t {
  uint8_t  data[RAW_BUF_LEN];
  uint8_t  len;
  bool     updated;
};

RawMSP_t rawAttitude  = {{}, 0, false};
RawMSP_t rawIMU       = {{}, 0, false};
RawMSP_t rawAltitude  = {{}, 0, false};
RawMSP_t rawGPS       = {{}, 0, false};
RawMSP_t rawAnalog    = {{}, 0, false};
RawMSP_t rawRC        = {{}, 0, false};
RawMSP_t rawMotor     = {{}, 0, false};
RawMSP_t rawStatus    = {{}, 0, false};

void bytesToHex(const uint8_t *data, uint8_t len, char *outBuf) {
  static const char hex[] = "0123456789ABCDEF";
  for (uint8_t i = 0; i < len; i++) {
    outBuf[i*2]     = hex[(data[i] >> 4) & 0x0F];
    outBuf[i*2 + 1] = hex[data[i] & 0x0F];
  }
  outBuf[len*2] = '\0';
}

void storeRaw(RawMSP_t &slot, const uint8_t *buf, uint8_t len) {
  uint8_t copyLen = (len > RAW_BUF_LEN) ? RAW_BUF_LEN : len;
  memcpy(slot.data, buf, copyLen);
  slot.len     = copyLen;
  slot.updated = true;
}

// ============================================================
// GLOBALS — PARSED
// ============================================================
MSP_ATTITUDE_t attitude;
MSP_RAW_IMU_t  imu;
MSP_ALTITUDE_t altData;
MSP_RAW_GPS_t  gps;
MSP_ANALOG_t   analog_data;
MSP_RC_t       rc;
MSP_MOTOR_t    motor;
MSP_STATUS_t   fc_status;

unsigned long tAttitude=0, tIMU=0, tAlt=0, tGPS=0;
unsigned long tAnalog=0, tRC=0, tMotor=0, tStatus=0;
unsigned long tMsg9=0, tMsg8=0, tWS=0, tSDLog=0;

uint8_t seqMsg9=0, seqMsg8=0;

char lastMsg9Payload[220]     = "";
char lastMsg9RawPayload[180]  = "";

char lastMsg8Payload[220]     = "";
char lastMsg8RawPayload[180]  = "";

char lastMsg9FullNMEA[256] = "";
char lastMsg8FullNMEA[256] = "";

bool newMsg9 = false;
bool newMsg8 = false;

// ============================================================
// SD CARD
// ============================================================
bool     sdReady      = false;
String   sdLogFile    = "";
uint32_t sdLogCounter = 0;

String makeLogFilename() {
  for (uint16_t i = 1; i <= 9999; i++) {
    char name[28];
    snprintf(name, sizeof(name), "/DATALOG_AIRCRAFT_%04d.csv", i);
    if (!SD.exists(name)) return String(name);
  }
  return "/LOG_OVER.csv";
}

void sdInit() {
  SPI.begin(SD_SCK_PIN, SD_MISO_PIN, SD_MOSI_PIN, SD_CS_PIN);
  if (!SD.begin(SD_CS_PIN)) {
    DEBUG_SERIAL.println("[SD] MicroSD tidak terdeteksi atau gagal mount!");
    sdReady = false;
    for (int i = 0; i < 3; i++) {
      digitalWrite(BUZZ_PIN, HIGH); delay(100);
      digitalWrite(BUZZ_PIN, LOW);  delay(100);
    }
    return;
  }
  sdReady   = true;
  sdLogFile = makeLogFilename();

  File f = SD.open(sdLogFile, FILE_WRITE);
  if (f) {
    f.println(
      "millis,"
      "att_roll_deg,att_pitch_deg,att_yaw_deg,raw_attitude_hex,"
      "imu_accX,imu_accY,imu_accZ,imu_gyrX,imu_gyrY,imu_gyrZ,"
      "imu_magX,imu_magY,imu_magZ,raw_imu_hex,"
      "baro_alt_m,vario_cm_s,raw_altitude_hex,"
      "gps_fix,gps_sats,lat,lon,gps_alt_m,speed_m_s,cog_deg,raw_gps_hex,"
      "vbat_raw,vbat_v,current_a,mah,rssi,raw_analog_hex,"
      "ch1,ch2,ch3,ch4,ch5,ch6,ch7,ch8,"
      "ch9,ch10,ch11,ch12,ch13,ch14,ch15,ch16,raw_rc_hex,"
      "m1,m2,m3,m4,m5,m6,m7,m8,raw_motor_hex,"
      "cycle_time_us,i2c_err,active_sensors,flight_mode,profile,raw_status_hex,"
      "drone_state,"
      "ais_msg9_full_nmea,ais_msg8_full_nmea"
    );
    f.close();
    DEBUG_SERIAL.printf("[SD] Log: %s\n", sdLogFile.c_str());
    digitalWrite(BUZZ_PIN, HIGH); delay(300);
    digitalWrite(BUZZ_PIN, LOW);
  } else {
    DEBUG_SERIAL.println("[SD] Gagal buka file untuk write header!");
    sdReady = false;
  }
}

// ============================================================
// SD WRITE LOG
// ============================================================
// Nama state untuk kolom CSV
const char* droneStateName(DroneState s) {
  switch (s) {
    case STATE_NAIK:   return "NAIK";
    case STATE_TURUN:  return "TURUN";
    case STATE_KANAN:  return "KANAN";
    case STATE_KIRI:   return "KIRI";
    case STATE_MAJU:   return "MAJU";
    case STATE_MUNDUR: return "MUNDUR";
    default:           return "IDLE";
  }
}

void sdWriteLog(const char* aisMsg9Full, const char* aisMsg8Full) {
  if (!sdReady) return;

  File f = SD.open(sdLogFile, FILE_APPEND);
  if (!f) {
    DEBUG_SERIAL.println("[SD] Gagal append log!");
    return;
  }

  char hexAttitude[257], hexIMU[257], hexAltitude[257];
  char hexGPS[257], hexAnalog[257], hexRC[257];
  char hexMotor[257], hexStatus[257];

  bytesToHex(rawAttitude.data, rawAttitude.len, hexAttitude);
  bytesToHex(rawIMU.data,      rawIMU.len,      hexIMU);
  bytesToHex(rawAltitude.data, rawAltitude.len, hexAltitude);
  bytesToHex(rawGPS.data,      rawGPS.len,      hexGPS);
  bytesToHex(rawAnalog.data,   rawAnalog.len,   hexAnalog);
  bytesToHex(rawRC.data,       rawRC.len,       hexRC);
  bytesToHex(rawMotor.data,    rawMotor.len,    hexMotor);
  bytesToHex(rawStatus.data,   rawStatus.len,   hexStatus);

  f.printf("%lu,", millis());
  f.printf("%.1f,%.1f,%d,%s,",
    attitude.roll / 10.0f, attitude.pitch / 10.0f, attitude.yaw, hexAttitude);
  f.printf("%d,%d,%d,%d,%d,%d,%d,%d,%d,%s,",
    imu.accX, imu.accY, imu.accZ,
    imu.gyrX, imu.gyrY, imu.gyrZ,
    imu.magX, imu.magY, imu.magZ, hexIMU);
  f.printf("%.2f,%.2f,%s,",
    altData.altitude / 100.0f, altData.vario / 100.0f, hexAltitude);
  f.printf("%d,%d,%.7f,%.7f,%d,%.2f,%d,%s,",
    gps.fix, gps.numSat,
    gps.lat / 1e7, gps.lon / 1e7,
    gps.alt, gps.speed / 100.0f, gps.groundCourse, hexGPS);
  f.printf("%d,%.2f,%d,%d,%d,%s,",
    analog_data.vbat, analog_data.vbat * 0.1f,
    analog_data.amperage, analog_data.mAhDrawn, analog_data.rssi, hexAnalog);
  for (uint8_t i = 0; i < 16; i++) f.printf("%d,", rc.channel[i]);
  f.printf("%s,", hexRC);
  for (uint8_t i = 0; i < 8; i++) f.printf("%d,", motor.motor[i]);
  f.printf("%s,", hexMotor);
  f.printf("%d,%d,%d,%lu,%d,%s,",
    fc_status.cycleTime, fc_status.i2cError, fc_status.activeSensors,
    fc_status.flightModeFlags, fc_status.profile, hexStatus);

  // Kolom drone state (tambahan dari versi sebelumnya)
  f.printf("%s,", droneStateName(currentDroneState));

  f.printf("\"%s\",\"%s\"",
    aisMsg9Full[0] ? aisMsg9Full : "",
    aisMsg8Full[0] ? aisMsg8Full : "");

  f.println();
  f.close();

  sdLogCounter++;
  digitalWrite(LED_PIN, sdLogCounter % 2);

  rawAttitude.updated = false;
  rawIMU.updated      = false;
  rawAltitude.updated = false;
  rawGPS.updated      = false;
  rawAnalog.updated   = false;
  rawRC.updated       = false;
  rawMotor.updated    = false;
  rawStatus.updated   = false;
}

// ============================================================
// MSP PROTOCOL
// ============================================================
void mspRequest(uint8_t cmd) {
  uint8_t buf[6] = {'$','M','<', 0, cmd, (uint8_t)(0 ^ cmd)};
  FC_SERIAL.write(buf, 6);
}

bool mspRead(uint8_t *cmdOut, uint8_t *buf, uint8_t *lenOut, uint16_t timeout=80) {
  unsigned long start = millis();
  uint8_t state=0, dataLen=0, cmd=0, checksum=0, idx=0;
  static uint8_t payload[128];
  while (millis() - start < timeout) {
    if (!FC_SERIAL.available()) continue;
    uint8_t c = FC_SERIAL.read();
    switch (state) {
      case 0: if (c == '$') state = 1; break;
      case 1: if (c == 'M') state = 2; else state = 0; break;
      case 2: if (c == '>') state = 3; else state = 0; break;
      case 3: dataLen = c; checksum = c; state = 4; break;
      case 4: cmd = c; checksum ^= c; idx = 0; state = (dataLen > 0) ? 5 : 6; break;
      case 5: payload[idx++] = c; checksum ^= c; if (idx >= dataLen) state = 6; break;
      case 6:
        if (c == checksum) {
          *cmdOut = cmd; *lenOut = dataLen;
          memcpy(buf, payload, dataLen);
          return true;
        }
        state = 0; break;
    }
  }
  return false;
}

void parseAttitude(uint8_t *b) {
  attitude.roll  = (int16_t)(b[0] | b[1] << 8);
  attitude.pitch = (int16_t)(b[2] | b[3] << 8);
  attitude.yaw   = (int16_t)(b[4] | b[5] << 8);
}
void parseIMU(uint8_t *b) {
  imu.accX = (int16_t)(b[0]  | b[1]  << 8);
  imu.accY = (int16_t)(b[2]  | b[3]  << 8);
  imu.accZ = (int16_t)(b[4]  | b[5]  << 8);
  imu.gyrX = (int16_t)(b[6]  | b[7]  << 8);
  imu.gyrY = (int16_t)(b[8]  | b[9]  << 8);
  imu.gyrZ = (int16_t)(b[10] | b[11] << 8);
  imu.magX = (int16_t)(b[12] | b[13] << 8);
  imu.magY = (int16_t)(b[14] | b[15] << 8);
  imu.magZ = (int16_t)(b[16] | b[17] << 8);
}
void parseAltitude(uint8_t *b) {
  altData.altitude = (int32_t)(b[0] | b[1]<<8 | b[2]<<16 | b[3]<<24);
  altData.vario    = (int16_t)(b[4] | b[5] << 8);
}
void parseGPS(uint8_t *b) {
  gps.fix          = b[0];
  gps.numSat       = b[1];
  gps.lat          = (int32_t)(b[2]  | b[3]<<8  | b[4]<<16  | b[5]<<24);
  gps.lon          = (int32_t)(b[6]  | b[7]<<8  | b[8]<<16  | b[9]<<24);
  gps.alt          = (uint16_t)(b[10] | b[11] << 8);
  gps.speed        = (uint16_t)(b[12] | b[13] << 8);
  gps.groundCourse = (uint16_t)(b[14] | b[15] << 8);
}
void parseAnalog(uint8_t *b) {
  analog_data.vbat      = b[0];
  analog_data.mAhDrawn  = (uint16_t)(b[1] | b[2] << 8);
  analog_data.rssi      = (uint16_t)(b[3] | b[4] << 8);
  analog_data.amperage  = (int16_t)(b[5]  | b[6] << 8);
}
void parseRC(uint8_t *b, uint8_t len) {
  uint8_t ch = len / 2;
  for (uint8_t i = 0; i < ch && i < 16; i++)
    rc.channel[i] = (uint16_t)(b[i*2] | b[i*2+1] << 8);
}
void parseMotor(uint8_t *b) {
  for (uint8_t i = 0; i < 8; i++)
    motor.motor[i] = (uint16_t)(b[i*2] | b[i*2+1] << 8);
}
void parseStatus(uint8_t *b) {
  fc_status.cycleTime       = (uint16_t)(b[0] | b[1] << 8);
  fc_status.i2cError        = (uint16_t)(b[2] | b[3] << 8);
  fc_status.activeSensors   = (uint16_t)(b[4] | b[5] << 8);
  fc_status.flightModeFlags = (uint32_t)(b[6] | b[7]<<8 | b[8]<<16 | b[9]<<24);
  fc_status.profile         = b[10];
}

void processMSP() {
  uint8_t cmd, len, buf[128];
  while (FC_SERIAL.available()) {
    if (mspRead(&cmd, buf, &len)) {
      switch (cmd) {
        case MSP_ATTITUDE: parseAttitude(buf); storeRaw(rawAttitude, buf, len); break;
        case MSP_RAW_IMU:  parseIMU(buf);      storeRaw(rawIMU, buf, len);      break;
        case MSP_ALTITUDE: parseAltitude(buf); storeRaw(rawAltitude, buf, len); break;
        case MSP_RAW_GPS:  parseGPS(buf);      storeRaw(rawGPS, buf, len);      break;
        case MSP_ANALOG:   parseAnalog(buf);   storeRaw(rawAnalog, buf, len);   break;
        case MSP_RC:       parseRC(buf, len);  storeRaw(rawRC, buf, len);       break;
        case MSP_MOTOR:    parseMotor(buf);    storeRaw(rawMotor, buf, len);    break;
        case MSP_STATUS:   parseStatus(buf);   storeRaw(rawStatus, buf, len);   break;
      }
    }
  }
}

// ============================================================
// WS2812B LED FUNCTIONS
// ============================================================

// Isi semua LED satu arm dengan warna tertentu
void setArm(uint8_t armStart, CRGB color) {
  for (uint8_t i = armStart; i < armStart + ARM_LEN; i++) {
    leds[i] = color;
  }
}

// Warna default idle: motor 1&3 merah, motor 2&4 biru
void ledIdle() {
  setArm(ARM1_START, CRGB::Red);
  setArm(ARM2_START, CRGB::Blue);
  setArm(ARM3_START, CRGB::Red);
  setArm(ARM4_START, CRGB::Blue);
  FastLED.show();
}

// Naik: semua arm biru
void ledNaik() {
  setArm(ARM1_START, CRGB::Blue);
  setArm(ARM2_START, CRGB::Blue);
  setArm(ARM3_START, CRGB::Blue);
  setArm(ARM4_START, CRGB::Blue);
  FastLED.show();
}

// Geser kanan: motor 1&2 hijau, motor 3&4 merah
void ledKanan() {
  setArm(ARM1_START, CRGB::Green);
  setArm(ARM2_START, CRGB::Green);
  setArm(ARM3_START, CRGB::Red);
  setArm(ARM4_START, CRGB::Red);
  FastLED.show();
}

// Geser kiri: motor 1&2 merah, motor 3&4 hijau
void ledKiri() {
  setArm(ARM1_START, CRGB::Red);
  setArm(ARM2_START, CRGB::Red);
  setArm(ARM3_START, CRGB::Green);
  setArm(ARM4_START, CRGB::Green);
  FastLED.show();
}

// Maju: motor 2&4 hijau, motor 1&3 merah
void ledMaju() {
  setArm(ARM1_START, CRGB::Red);
  setArm(ARM2_START, CRGB::Green);
  setArm(ARM3_START, CRGB::Red);
  setArm(ARM4_START, CRGB::Green);
  FastLED.show();
}

// Mundur: motor 2&4 merah, motor 1&3 hijau
void ledMundur() {
  setArm(ARM1_START, CRGB::Green);
  setArm(ARM2_START, CRGB::Red);
  setArm(ARM3_START, CRGB::Green);
  setArm(ARM4_START, CRGB::Red);
  FastLED.show();
}

// Turun: kuning berkedip (dipanggil tiap loop, toggle via tBlink)
void ledTurun(unsigned long now) {
  if (now - tBlink >= INTERVAL_LED_BLINK) {
    blinkOn = !blinkOn;
    tBlink  = now;
  }
  CRGB col = blinkOn ? CRGB::Yellow : CRGB::Black;
  setArm(ARM1_START, col);
  setArm(ARM2_START, col);
  setArm(ARM3_START, col);
  setArm(ARM4_START, col);
  FastLED.show();
}

// ============================================================
// DETEKSI STATE DRONE DARI RC CHANNEL
// ============================================================
//
// CH1 = Roll    → geser kanan (+) / kiri (-)
// CH2 = Pitch   → maju (+) / mundur (-)
// CH3 = Throttle→ naik (tinggi) / turun (rendah)
//
// Simpangan = nilai channel - RC_CENTER
// State ditentukan dari simpangan terbesar (roll vs pitch)
// dengan prioritas: turun > naik > roll > pitch > idle
//
DroneState detectDroneState() {
  uint16_t thr   = rc.channel[2];  // CH3 (index 2)
  int16_t  roll  = (int16_t)rc.channel[0] - RC_CENTER;  // CH1
  int16_t  pitch = (int16_t)rc.channel[1] - RC_CENTER;  // CH2

  int16_t absRoll  = abs(roll);
  int16_t absPitch = abs(pitch);

  // 1. TURUN — throttle rendah saat drone dianggap armed/terbang
  //    (throttle armed = stick throttle masih di atas minimum arming)
  if (thr > THROTTLE_ARMED && thr < THROTTLE_LOW) {
    return STATE_TURUN;
  }

  // 2. NAIK — throttle tinggi
  if (thr >= THROTTLE_HIGH) {
    return STATE_NAIK;
  }

  // 3. GESER KANAN / KIRI — roll dominan dan melewati deadband
  if (absRoll > RC_DEADBAND && absRoll >= absPitch) {
    return (roll > 0) ? STATE_KANAN : STATE_KIRI;
  }

  // 4. MAJU / MUNDUR — pitch dominan dan melewati deadband
  if (absPitch > RC_DEADBAND && absPitch > absRoll) {
    return (pitch > 0) ? STATE_MAJU : STATE_MUNDUR;
  }

  // 5. IDLE / HOVER — semua dalam deadband atau throttle sangat rendah
  return STATE_IDLE;
}

// ============================================================
// UPDATE LED BERDASARKAN STATE
// ============================================================
void updateLED(unsigned long now) {
  if (now - tLED < INTERVAL_LED && currentDroneState != STATE_TURUN) return;

  currentDroneState = detectDroneState();

  // Jika state berubah (kecuali turun yang perlu terus update blink),
  // reset blink timer agar kuning langsung menyala saat masuk state turun
  if (currentDroneState != lastDroneState) {
    if (currentDroneState == STATE_TURUN) {
      blinkOn = true;
      tBlink  = now;
    }
    lastDroneState = currentDroneState;

    DEBUG_SERIAL.printf("[LED] State: %s\n", droneStateName(currentDroneState));
  }

  switch (currentDroneState) {
    case STATE_NAIK:   ledNaik();         break;
    case STATE_TURUN:  ledTurun(now);     break;
    case STATE_KANAN:  ledKanan();        break;
    case STATE_KIRI:   ledKiri();         break;
    case STATE_MAJU:   ledMaju();         break;
    case STATE_MUNDUR: ledMundur();       break;
    default:           ledIdle();         break;
  }

  tLED = now;
}

// ============================================================
// AIS BIT ENGINE (NEW CLEAN VERSION)
// ============================================================

String aisBitStream = "";

// ------------------------------------------------------------
// Tambah bit unsigned
// ------------------------------------------------------------
void addBits(uint32_t value, uint8_t bits) {
  for (int8_t i = bits - 1; i >= 0; i--) {
    aisBitStream += ((value >> i) & 1) ? '1' : '0';
  }
}

// ------------------------------------------------------------
// Tambah signed bits (2's complement)
// ------------------------------------------------------------
void addSignedBits(int32_t value, uint8_t bits) {
  if (value < 0) {
    value = (1UL << bits) + value;
  }
  addBits((uint32_t)value, bits);
}

// ------------------------------------------------------------
// Konversi bitstream → AIS 6bit ASCII
// ------------------------------------------------------------
String sixBitEncode(const String &bits) {
  String out = "";

  for (uint16_t i = 0; i < bits.length(); i += 6) {

    uint8_t val = 0;

    for (uint8_t b = 0; b < 6; b++) {
      val <<= 1;

      if ((i + b) < bits.length()) {
        if (bits[i + b] == '1') val |= 1;
      }
    }

    char c = val + 48;
    if (c > 87) c += 8;
    out += c;
  }

  return out;
}

// ------------------------------------------------------------
// NMEA Checksum
// ------------------------------------------------------------
uint8_t nmeaChecksum(const char *s) {
  uint8_t cs = 0;
  bool started = false;

  while (*s) {

    if (*s == '!') {
      started = true;
      s++;
      continue;
    }

    if (*s == '*') break;

    if (started) cs ^= (uint8_t)*s;

    s++;
  }

  return cs;
}

// ------------------------------------------------------------
// GPS decimal degree → AIS format
// AIS pakai 1/10000 menit
// = degree × 600000
// gps.lat/lon Anda = 1e7 decimal degree
// ------------------------------------------------------------
int32_t aisLon() {
  if (!gps.fix) return 108600000L;

  return (int32_t)((double)gps.lon * 600000.0 / 10000000.0);
}

int32_t aisLat() {
  if (!gps.fix) return 54600000L;

  return (int32_t)((double)gps.lat * 600000.0 / 10000000.0);
}

// ------------------------------------------------------------
// UTC second
// ------------------------------------------------------------
uint8_t aisSecond() {
  return (millis() / 1000UL) % 60;
}

// ============================================================
// BUILD AIS MESSAGE 9
// SAR AIRCRAFT POSITION REPORT
// ============================================================
void buildMsg9() {

  aisBitStream = "";

  // ----------------------------------------------------------
  // DATA PREPARATION
  // ----------------------------------------------------------
  uint16_t altitude =
    gps.fix ? (gps.alt > 4094 ? 4094 : gps.alt) : 4095;

  uint16_t sog =
    gps.fix
      ? (uint16_t)(gps.speed / 100.0f * 1.94384f)
      : 1023;

  if (sog > 1022) sog = 1022;

  uint16_t cog =
    gps.fix ? gps.groundCourse : 3600;

  // ----------------------------------------------------------
  // AIS MESSAGE 9 ENCODING (168 BIT)
  // ----------------------------------------------------------
  addBits(9, 6);                         // Message ID
  addBits(0, 2);                         // Repeat Indicator
  addBits(AIS_MMSI, 30);                 // MMSI

  addBits(altitude, 12);                 // Altitude
  addBits(sog, 10);                      // Speed Over Ground

  addBits(gps.numSat >= 6 ? 1 : 0, 1);   // Position Accuracy

  addSignedBits(aisLon(), 28);           // Longitude
  addSignedBits(aisLat(), 27);           // Latitude

  addBits(cog, 12);                      // Course Over Ground

  addBits(aisSecond(), 6);               // UTC Second

  addBits(0, 1);                         // Altitude Sensor
  addBits(0, 7);                         // Spare
  addBits(0, 1);                         // DTE
  addBits(0, 3);                         // Spare
  addBits(0, 1);                         // Assigned Mode
  addBits(0, 1);                         // RAIM

  addBits(0, 19);                        // SOTDMA Comm State

  // ==========================================================
// ENCODE TO AIS 6BIT PAYLOAD
// ==========================================================
String payload = sixBitEncode(aisBitStream);

// Payload raw untuk AIT33
strncpy(
  lastMsg9RawPayload,
  payload.c_str(),
  sizeof(lastMsg9RawPayload) - 1
);

lastMsg9RawPayload[
  sizeof(lastMsg9RawPayload) - 1
] = '\0';

// Optional: buat AIVDM hanya untuk log/web
char channel =
  (seqMsg9++ % 2 == 0) ? 'A' : 'B';

snprintf(
  lastMsg9Payload,
  sizeof(lastMsg9Payload),
  "AIVDM,1,1,,%c,%s,0",
  channel,
  payload.c_str()
);

// Full NMEA
char tmp[256];

snprintf(
  tmp,
  sizeof(tmp),
  "!%s",
  lastMsg9Payload
);

uint8_t cs = nmeaChecksum(tmp);

snprintf(
  lastMsg9FullNMEA,
  sizeof(lastMsg9FullNMEA),
  "!%s*%02X",
  lastMsg9Payload,
  cs
);

newMsg9 = true; }
// ============================================================
// BUILD AIS MESSAGE 8
// BINARY BROADCAST MESSAGE
// ============================================================

void buildMsg8() {

  aisBitStream = "";

  // ----------------------------------------------------------
  // DATA PREPARATION
  // ----------------------------------------------------------
  int32_t latBits = aisLat();
  int32_t lonBits = aisLon();

  // Altitude: clamp 0–4094, 12 bit
  int32_t altM = altData.altitude / 100;
  if (altM < 0)    altM = 0;
  if (altM > 4094) altM = 4094;
  uint16_t altitude = (uint16_t)altM;

  // SOG: knot ×10, 10 bit
  uint16_t speed = (uint16_t)((gps.speed / 100.0f) * 1.94384f * 10.0f);
  if (speed > 1022) speed = 1022;

  // Heading/Yaw: integer degree 0–359, 9 bit
  // PERBAIKAN: diturunkan dari 10b ×10° ke 9b integer deg
  // Karena 10b hanya muat 0–1023, heading >102.3° akan corrupt jika pakai ×10
  int16_t hdg = attitude.yaw;
  while (hdg <   0) hdg += 360;
  while (hdg >= 360) hdg -= 360;
  uint16_t heading9 = (uint16_t)hdg;   // integer deg, 0–359, cukup 9 bit
  if (heading9 > 359) heading9 = 359;

  uint16_t yaw9 = heading9;             // alias, sama dengan heading

  // Satellites: 6 bit
  uint8_t sats = gps.numSat;
  if (sats > 63) sats = 63;

  // Mode: 4 bit
  uint8_t mode = (uint8_t)(fc_status.flightModeFlags & 0x0F);

  // Roll: uint 12b, offset +1800, skala ×10 deg
  int32_t rollDeg10 = (int32_t)attitude.roll;
  int32_t rollEnc   = rollDeg10 + 1800;
  if (rollEnc <    0) rollEnc = 0;
  if (rollEnc > 3600) rollEnc = 3600;

  // Pitch: uint 12b, offset +1800, skala ×10 deg
  int32_t pitchDeg10 = (int32_t)attitude.pitch;
  int32_t pitchEnc   = pitchDeg10 + 1800;
  if (pitchEnc <    0) pitchEnc = 0;
  if (pitchEnc > 3600) pitchEnc = 3600;

  // ----------------------------------------------------------
  // ENCODING — layout sesuai decoder nmea_parser
  //
  //   0–  5  Message ID       (6b)
  //   6–  7  Repeat Indicator (2b)
  //   8– 37  MMSI             (30b)
  //  38– 39  Spare            (2b)
  //  40– 49  DAC              (10b)
  //  50– 55  FI               (6b)
  //  56– 83  Longitude        (28b signed)
  //  84–110  Latitude         (27b signed)
  // 111–122  Altitude         (12b)
  // 123–132  SOG              (10b ×10 kn)
  // 133–141  Heading          (9b integer deg)   ← FIX: 10b→9b
  // 142–149  Battery vbat     (8b)               ← geser 1 bit
  // 150–155  Satellites       (6b)               ← geser 1 bit
  // 156–159  Flight Mode      (4b)               ← geser 1 bit
  // 160–171  Roll             (12b uint +1800)   ← geser 1 bit
  // 172–183  Pitch            (12b uint +1800)   ← geser 1 bit
  // 184–192  Yaw              (9b integer deg)   ← FIX: 10b→9b, geser 1 bit
  //
  // Total: 193 bit → pad ke 198 bit (33 char armored)
  // ----------------------------------------------------------

  // Header
  addBits(8, 6);                          // bit   0: Message ID
  addBits(0, 2);                          // bit   6: Repeat Indicator
  addBits(AIS_MMSI, 30);                  // bit   8: MMSI

  // Spare
  addBits(0, 2);                          // bit  38: Spare

  // Application ID
  addBits(366, 10);                       // bit  40: DAC = 366
  addBits(56,   6);                       // bit  50: FI  = 56

  // Position
  addSignedBits(lonBits, 28);             // bit  56: Longitude (28b signed)
  addSignedBits(latBits, 27);             // bit  84: Latitude  (27b signed)

  // Kinematic
  addBits(altitude,  12);                 // bit 111: Altitude   (12b)
  addBits(speed,     10);                 // bit 123: SOG        (10b ×10 kn)
  addBits(heading9,   9);                 // bit 133: Heading    (9b integer deg, 0–359)

  // Drone telemetry — semua 1 bit lebih awal dari versi lama
  addBits(analog_data.vbat, 8);           // bit 142: Battery    (8b)
  addBits(sats,             6);           // bit 150: Satellites (6b)
  addBits(mode,             4);           // bit 156: Mode       (4b)

  // Attitude
  addBits((uint32_t)rollEnc,  12);        // bit 160: Roll  (12b uint, +1800, ×10°)
  addBits((uint32_t)pitchEnc, 12);        // bit 172: Pitch (12b uint, +1800, ×10°)
  addBits(yaw9,                9);        // bit 184: Yaw   (9b integer deg, 0–359)

  // ----------------------------------------------------------
  // ENCODE TO AIS 6BIT PAYLOAD
  // ----------------------------------------------------------
  String payload = sixBitEncode(aisBitStream);

  strncpy(lastMsg8RawPayload, payload.c_str(), sizeof(lastMsg8RawPayload) - 1);
  lastMsg8RawPayload[sizeof(lastMsg8RawPayload) - 1] = '\0';

  char channel = (seqMsg8++ % 2 == 0) ? 'A' : 'B';
  snprintf(lastMsg8Payload, sizeof(lastMsg8Payload),
    "AIVDM,1,1,,%c,%s,0", channel, payload.c_str());

  char tmp[256];
  snprintf(tmp, sizeof(tmp), "!%s", lastMsg8Payload);
  uint8_t cs = nmeaChecksum(tmp);
  snprintf(lastMsg8FullNMEA, sizeof(lastMsg8FullNMEA),
    "!%s*%02X", lastMsg8Payload, cs);

  newMsg8 = true;
}

// ============================================================
// HTTP SERVER
// ============================================================
void handleHTTP() {
  WiFiClient client = httpServer.available();
  if (!client) return;

  unsigned long t = millis();
  String req = "";
  while (client.connected() && millis() - t < 1000) {
    if (client.available()) {
      char c = client.read();
      req += c;
      if (req.endsWith("\r\n\r\n")) break;
    }
  }

  String path = "/";
  int s = req.indexOf(' ');
  int e = req.indexOf(' ', s + 1);
  if (s >= 0 && e > s) path = req.substring(s + 1, e);
  int q = path.indexOf('?');
  if (q >= 0) path = path.substring(0, q);

  bool isRoot = (path == "/" || path == "/index" || path == "/index.html");

  if (isRoot) {
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: text/html; charset=utf-8");
    client.println("Connection: close");
    client.println();
    const char *p = DASHBOARD_HTML;
    size_t len   = strlen_P(DASHBOARD_HTML);
    size_t sent  = 0;
    char   chunk[513];
    while (sent < len) {
      size_t toSend = min((size_t)512, len - sent);
      memcpy_P(chunk, p + sent, toSend);
      chunk[toSend] = '\0';
      client.print(chunk);
      sent += toSend;
    }
    DEBUG_SERIAL.printf("[HTTP] 200 %s\n", path.c_str());

  } else if (path == "/favicon.ico") {
    client.print("HTTP/1.1 204 No Content\r\nConnection: close\r\n\r\n");

  } else if (path == "/sdinfo") {
    char info[256];
    if (sdReady) {
      snprintf(info, sizeof(info),
        "{\"sd\":true,\"file\":\"%s\",\"rows\":%lu,\"free_mb\":%llu}",
        sdLogFile.c_str(), sdLogCounter,
        (uint64_t)(SD.totalBytes() - SD.usedBytes()) / (1024*1024));
    } else {
      snprintf(info, sizeof(info), "{\"sd\":false}");
    }
    client.print("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n");
    client.print(info);

  } else {
    client.print("HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\n404 Not Found");
    DEBUG_SERIAL.printf("[HTTP] 404 %s\n", path.c_str());
  }

  delay(2);
  client.stop();
}

// ============================================================
// WEBSOCKET
// ============================================================
void broadcastJSON() {
  char json[2048];
  int n = snprintf(json, sizeof(json),
    "{"
    "\"roll\":%.1f,\"pitch\":%.1f,\"yaw\":%d,"
    "\"baro_alt\":%.2f,\"vario\":%.2f,"
    "\"gps_fix\":%d,\"sats\":%d,"
    "\"lat\":%.7f,\"lon\":%.7f,"
    "\"gps_alt\":%d,\"speed\":%.2f,\"cog\":%d,"
    "\"vbat_raw\":%d,\"vbat_v\":%.2f,\"current\":%d,\"mah\":%d,\"rssi\":%d,"
    "\"flight_mode\":%lu,"
    "\"m1\":%d,\"m2\":%d,\"m3\":%d,\"m4\":%d,"
    "\"m5\":%d,\"m6\":%d,\"m7\":%d,\"m8\":%d,"
    "\"ch1\":%d,\"ch2\":%d,\"ch3\":%d,\"ch4\":%d,"
    "\"ch5\":%d,\"ch6\":%d,\"ch7\":%d,\"ch8\":%d,"
    "\"accX\":%d,\"accY\":%d,\"accZ\":%d,"
    "\"gyrX\":%d,\"gyrY\":%d,\"gyrZ\":%d,"
    "\"magX\":%d,\"magY\":%d,\"magZ\":%d,"
    "\"cycle_time\":%d,\"i2c_err\":%d,"
    "\"drone_state\":\"%s\","
    "\"sd\":%s,\"sd_rows\":%lu",
    attitude.roll  / 10.0f, attitude.pitch / 10.0f, attitude.yaw,
    altData.altitude / 100.0f, altData.vario / 100.0f,
    gps.fix, gps.numSat,
    gps.lat / 1e7, gps.lon / 1e7,
    gps.alt, gps.speed / 100.0f, gps.groundCourse,
    analog_data.vbat, analog_data.vbat * 0.1f,
    analog_data.amperage, analog_data.mAhDrawn, analog_data.rssi,
    fc_status.flightModeFlags,
    motor.motor[0], motor.motor[1], motor.motor[2], motor.motor[3],
    motor.motor[4], motor.motor[5], motor.motor[6], motor.motor[7],
    rc.channel[0], rc.channel[1], rc.channel[2], rc.channel[3],
    rc.channel[4], rc.channel[5], rc.channel[6], rc.channel[7],
    imu.accX, imu.accY, imu.accZ,
    imu.gyrX, imu.gyrY, imu.gyrZ,
    imu.magX, imu.magY, imu.magZ,
    fc_status.cycleTime, fc_status.i2cError,
    droneStateName(currentDroneState),
    sdReady ? "true" : "false", sdLogCounter
  );
  json[n++] = '}';
  json[n]   = '\0';
  wsServer.broadcastTXT(json);

  if (newMsg9) {
    char ais9[280];
    snprintf(ais9, sizeof(ais9), "{\"ais_msg9\":\"%s\"}", lastMsg9FullNMEA);
    wsServer.broadcastTXT(ais9);
    newMsg9 = false;
  }
  if (newMsg8) {
    char ais8[280];
    snprintf(ais8, sizeof(ais8), "{\"ais_msg8\":\"%s\"}", lastMsg8FullNMEA);
    wsServer.broadcastTXT(ais8);
    newMsg8 = false;
  }
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t *payload, size_t length) {
  if      (type == WStype_CONNECTED)    DEBUG_SERIAL.printf("[WS] Client #%d connected\n",    num);
  else if (type == WStype_DISCONNECTED) DEBUG_SERIAL.printf("[WS] Client #%d disconnected\n", num);
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  DEBUG_SERIAL.begin(DEBUG_BAUD);

  pinMode(LED_PIN,  OUTPUT);
  pinMode(BUZZ_PIN, OUTPUT);
  digitalWrite(LED_PIN,  LOW);
  digitalWrite(BUZZ_PIN, LOW);

  // WS2812B init — tampilkan warna default idle sebelum sistem lain siap
  FastLED.addLeds<LED_TYPE, WS2812B_PIN, COLOR_ORDER>(leds, NUM_LEDS);
  FastLED.setBrightness(LED_BRIGHTNESS);
  ledIdle();  // motor 1&3 merah, motor 2&4 biru

  FC_SERIAL.begin(FC_BAUD,       SERIAL_8N1, FC_RX_PIN,    FC_TX_PIN);
  AIT33_SERIAL.begin(AIT33_BAUD, SERIAL_8N1, AIT33_RX_PIN, AIT33_TX_PIN);

  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(LOCAL_IP, GATEWAY, SUBNET);
  WiFi.softAP(WIFI_SSID, WIFI_PASS);

  httpServer.begin();
  wsServer.begin();
  wsServer.onEvent(webSocketEvent);

  sdInit();

  delay(300);
  DEBUG_SERIAL.println("\n===========================================");
  DEBUG_SERIAL.println(" S500 DRONE MONITOR — WiFi + AIS + MSP    ");
  DEBUG_SERIAL.println("===========================================");
  DEBUG_SERIAL.printf(" WiFi SSID  : %s\n", WIFI_SSID);
  DEBUG_SERIAL.printf(" WiFi PASS  : %s\n", WIFI_PASS);
  DEBUG_SERIAL.printf(" Dashboard  : http://%s\n", LOCAL_IP.toString().c_str());
  DEBUG_SERIAL.printf(" WebSocket  : ws://%s:81\n", LOCAL_IP.toString().c_str());
  DEBUG_SERIAL.printf(" MMSI       : %lu\n", AIS_MMSI);
  DEBUG_SERIAL.printf(" FC UART    : RX=GPIO%d TX=GPIO%d @ %d\n", FC_RX_PIN, FC_TX_PIN, FC_BAUD);
  DEBUG_SERIAL.printf(" AIT33      : RX=GPIO%d  TX=GPIO%d  @ %d\n", AIT33_RX_PIN, AIT33_TX_PIN, AIT33_BAUD);
  DEBUG_SERIAL.printf(" MicroSD    : CS=GPIO%d MOSI=%d MISO=%d SCK=%d\n",
                      SD_CS_PIN, SD_MOSI_PIN, SD_MISO_PIN, SD_SCK_PIN);
  DEBUG_SERIAL.printf(" SD Log     : %s\n", sdReady ? sdLogFile.c_str() : "TIDAK ADA SD");
  DEBUG_SERIAL.printf(" WS2812B    : GPIO%d | %d LED | 4 ARM x %d\n",
                      WS2812B_PIN, NUM_LEDS, ARM_LEN);
  DEBUG_SERIAL.println(" AIT33 TX   : payload only (tanpa ! dan *CS)");
  DEBUG_SERIAL.println(" SD Log     : full NMEA (!....*XX)");
  DEBUG_SERIAL.println("===========================================");
  DEBUG_SERIAL.println(" LED STATE  : RC_DEADBAND=±80, THR_HIGH=1650, THR_LOW=1350");
  DEBUG_SERIAL.println("===========================================\n");
}

// ============================================================
// LOOP
// ============================================================
static char sdAis9Buf[256] = "";
static char sdAis8Buf[256] = "";

void loop() {
  unsigned long now = millis();

  // ---- MSP REQUESTS ----
  if (now - tAttitude >= INTERVAL_FAST)   { mspRequest(MSP_ATTITUDE); tAttitude = now; }
  if (now - tIMU      >= INTERVAL_FAST)   { mspRequest(MSP_RAW_IMU);  tIMU      = now; }
  if (now - tRC       >= INTERVAL_MEDIUM) { mspRequest(MSP_RC);       tRC       = now; }
  if (now - tMotor    >= INTERVAL_MEDIUM) { mspRequest(MSP_MOTOR);    tMotor    = now; }
  if (now - tAlt      >= INTERVAL_MEDIUM) { mspRequest(MSP_ALTITUDE); tAlt      = now; }
  if (now - tGPS      >= INTERVAL_SLOW)   { mspRequest(MSP_RAW_GPS);  tGPS      = now; }
  if (now - tAnalog   >= INTERVAL_SLOW)   { mspRequest(MSP_ANALOG);   tAnalog   = now; }
  if (now - tStatus   >= INTERVAL_SLOW)   { mspRequest(MSP_STATUS);   tStatus   = now; }

  // ---- MSP PARSE + RAW STORE ----
  processMSP();

  // ---- WS2812B LED UPDATE ----
  // Dipanggil setiap loop agar kedip kuning (STATE_TURUN) responsif
  updateLED(now);

  // ---- AIS MSG9 ----
  if (now - tMsg9 >= INTERVAL_MSG9) {
    buildMsg9();
    AIT33_SERIAL.print(lastMsg9RawPayload);
    AIT33_SERIAL.print("\r\n");
    DEBUG_SERIAL.print("[MSG9→AIT33 payload] "); DEBUG_SERIAL.println(lastMsg9RawPayload);
    DEBUG_SERIAL.print("[MSG9→LOG   full   ] "); DEBUG_SERIAL.println(lastMsg9FullNMEA);
    strncpy(sdAis9Buf, lastMsg9FullNMEA, sizeof(sdAis9Buf) - 1);
    tMsg9 = now;
  }

  // ---- AIS MSG8 ----
  if (now - tMsg8 >= INTERVAL_MSG8) {
    buildMsg8();
    AIT33_SERIAL.print(lastMsg8RawPayload);
    AIT33_SERIAL.print("\r\n");
    DEBUG_SERIAL.print("[MSG8→AIT33 payload] "); DEBUG_SERIAL.println(lastMsg8RawPayload);
    DEBUG_SERIAL.print("[MSG8→LOG   full   ] "); DEBUG_SERIAL.println(lastMsg8FullNMEA);
    strncpy(sdAis8Buf, lastMsg8FullNMEA, sizeof(sdAis8Buf) - 1);
    tMsg8 = now;
  }

  // ---- WEBSOCKET ----
  if (now - tWS >= INTERVAL_WS) {
    broadcastJSON();
    tWS = now;
  }

  // ---- SD LOG ----
  if (now - tSDLog >= INTERVAL_SD_LOG) {
    sdWriteLog(sdAis9Buf, sdAis8Buf);
    sdAis9Buf[0] = '\0';
    sdAis8Buf[0] = '\0';
    tSDLog = now;
  }

  wsServer.loop();
  handleHTTP();
}
