# AIS Message 8 — Binary Broadcast (DAC=366 FI=56)

## Bit Encoding Table

Total **198 bit** (198 bit payload + 5 bit padding → 33 karakter 6-bit).

| Parameter                  |   Panjang Bit |   Nilai Desimal |                          Nilai Biner |
|--------------------------|---------------|-----------------|--------------------------------------|
| Message ID                 |             6 |               8 |                               001000 |
| Repeat Indicator           |             2 |               0 |                                   00 |
| MMSI                       |            30 |       970123456 |       111001110100101110100011000000 |
| Spare                      |             2 |               0 |                                   00 |
| DAC                        |            10 |             366 |                           0101101110 |
| FI                         |             6 |              56 |                               111000 |
| Longitude                  |            28 |        67685783 |         0100000010001100110110010111 |
| Latitude                   |            27 |        -4372346 |          111101111010100100010000110 |
| Altitude                   |            12 |              15 |                         000000001111 |
| Speed Over Ground          |            10 |              42 |                           0000101010 |
| Heading                    |             9 |              30 |                            000011110 |
| Battery Voltage            |             8 |             162 |                             10100010 |
| Satellite Count            |             6 |              14 |                               001110 |
| Flight Mode                |             4 |               4 |                                 0100 |
| Roll (+1800 offset)        |            12 |            1812 |                         011100010100 |
| Pitch (+1800 offset)       |            12 |            1810 |                         011100010010 |
| Yaw                        |             9 |               1 |                            000000001 |
| Padding (Spare)            |             5 |               0 |                                00000 |

## Concatenated Bitstream (198 bit)

\\`
001000001110011101001011101000110000000001011011101110000100000010001100110110010111111101111010100100010000110000000001111000010101000001111010100010001110010001110001010001110001001000000000100000
\\`

## 6-bit ASCII Encoding
| Bit Range   | 6-bit Binary | Decimal | ASCII |
|-------------|-------------|---------|-------|
bit 000-005 | 001000 | 8 | 
bit 006-011 | 001110 | 14 | 
bit 012-017 | 011101 | 29 | 
bit 018-023 | 001011 | 11 | 
bit 024-029 | 101000 | 40 | 
bit 030-035 | 110000 | 48 | 
bit 036-041 | 000001 | 1 | 
bit 042-047 | 011011 | 27 | 
bit 048-053 | 101110 | 46 | 
bit 054-059 | 000100 | 4 | 
bit 060-065 | 000010 | 2 | 
bit 066-071 | 001100 | 12 | 
bit 072-077 | 110110 | 54 | 
bit 078-083 | 010111 | 23 | 
bit 084-089 | 111101 | 61 | 
bit 090-095 | 111010 | 58 | 
bit 096-101 | 100100 | 36 | 
bit 102-107 | 010000 | 16 | 
bit 108-113 | 110000 | 48 | 
bit 114-119 | 000001 | 1 | 
bit 120-125 | 111000 | 56 | 
bit 126-131 | 010101 | 21 | 
bit 132-137 | 000001 | 1 | 
bit 138-143 | 111010 | 58 | 
bit 144-149 | 100010 | 34 | 
bit 150-155 | 001110 | 14 | 
bit 156-161 | 010001 | 17 | 
bit 162-167 | 110001 | 49 | 
bit 168-173 | 010001 | 17 | 
bit 174-179 | 110001 | 49 | 
bit 180-185 | 001000 | 8 | 
bit 186-191 | 000000 | 0 | 
bit 192-197 | 100000 | 32 | 

**Encoded Payload (33 karakter):** $ais

## NMEA Sentence

| Bagian | Nilai |
|--------|-------|
| Raw Payload | 8>M;`h1Kf42<nGurT@h1pE1rR>AiAi80P |
| AIVDM | AIVDM,1,1,,B,8>M;`h1Kf42<nGurT@h1pE1rR>AiAi80P,0 |

\\\
!AIVDM,1,1,,B,8>M;`h1Kf42<nGurT@h1pE1rR>AiAi80P,0
\\\
**Full NMEA Sentence:**
\\\
!AIVDM,1,1,,B,8>M;`h1Kf42<nGurT@h1pE1rR>AiAi80P,0*5A
\\\

## Field Detail

| Field | Start Bit | End Bit | Bits | Value | Description |
|-------|-----------|---------|------|-------|-------------|
| Message ID | 0 | 5 | 6 | 8 | |
| Repeat Indicator | 6 | 7 | 2 | 0 | |
| MMSI | 8 | 37 | 30 | 970123456 | |
| Spare | 38 | 39 | 2 | 0 | |
| DAC | 40 | 49 | 10 | 366 | |
| FI | 50 | 55 | 6 | 56 | |
| Longitude | 56 | 83 | 28 | 67685783 | |
| Latitude | 84 | 110 | 27 | -4372346 | |
| Altitude | 111 | 122 | 12 | 15 | |
| Speed Over Ground | 123 | 132 | 10 | 42 | |
| Heading | 133 | 141 | 9 | 30 | |
| Battery Voltage | 142 | 149 | 8 | 162 | |
| Satellite Count | 150 | 155 | 6 | 14 | |
| Flight Mode | 156 | 159 | 4 | 4 | |
| Roll (+1800 offset) | 160 | 171 | 12 | 1812 | |
| Pitch (+1800 offset) | 172 | 183 | 12 | 1810 | |
| Yaw | 184 | 192 | 9 | 1 | |
| Padding (Spare) | 193 | 197 | 5 | 0 | |
