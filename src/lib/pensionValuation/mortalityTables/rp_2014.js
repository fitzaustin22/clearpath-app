/**
 * SOA RP-2014 Unisex Blend — survival probabilities p_x.
 *
 * Source: Society of Actuaries, "RP-2014 Mortality Tables Report," October 2014.
 * Excel file: "RP-2014 Mortality Rates" (research-2014-rp-mort-tab-rates-exposure.xlsx).
 * Sheet: Total Dataset. Juvenile rates from the Juvenile sheet (ages 0–17).
 * Construction: ages 0–17 juvenile q_x, ages 18–49 Employee q_x, ages 50+ Healthy
 * Annuitant q_x. Unisex blend: p_x = 1 − (q_x_male + q_x_female) / 2. p_119 forced
 * to 0 (terminal age per §7.4.6 [R5a-5]).
 *
 * Indexed by age 0–119. `RP_2014_UNISEX[age]` = probability of surviving from
 * age `age` to age+1.
 */
export const RP_2014_UNISEX = Object.freeze([
  0.99355, // age 0
  0.99961, // age 1
  0.99974, // age 2
  0.99980, // age 3
  0.99984, // age 4
  0.99986, // age 5
  0.99987, // age 6
  0.99989, // age 7
  0.99990, // age 8
  0.99991, // age 9
  0.99992, // age 10
  0.99992, // age 11
  0.99989, // age 12
  0.99987, // age 13
  0.99985, // age 14
  0.99982, // age 15
  0.99980, // age 16
  0.99978, // age 17
  0.99976, // age 18
  0.99973, // age 19
  0.99972, // age 20
  0.99969, // age 21
  0.99967, // age 22
  0.99966, // age 23
  0.99966, // age 24
  0.99967, // age 25
  0.99968, // age 26
  0.99968, // age 27
  0.99968, // age 28
  0.99967, // age 29
  0.99967, // age 30
  0.99965, // age 31
  0.99964, // age 32
  0.99962, // age 33
  0.99961, // age 34
  0.99960, // age 35
  0.99958, // age 36
  0.99957, // age 37
  0.99955, // age 38
  0.99952, // age 39
  0.99949, // age 40
  0.99945, // age 41
  0.99940, // age 42
  0.99934, // age 43
  0.99927, // age 44
  0.99918, // age 45
  0.99909, // age 46
  0.99898, // age 47
  0.99887, // age 48
  0.99874, // age 49
  0.99658, // age 50
  0.99636, // age 51
  0.99612, // age 52
  0.99587, // age 53
  0.99560, // age 54
  0.99532, // age 55
  0.99502, // age 56
  0.99470, // age 57
  0.99434, // age 58
  0.99395, // age 59
  0.99352, // age 60
  0.99304, // age 61
  0.99250, // age 62
  0.99189, // age 63
  0.99122, // age 64
  0.99047, // age 65
  0.98963, // age 66
  0.98870, // age 67
  0.98765, // age 68
  0.98648, // age 69
  0.98518, // age 70
  0.98373, // age 71
  0.98212, // age 72
  0.98033, // age 73
  0.97834, // age 74
  0.97612, // age 75
  0.97364, // age 76
  0.97086, // age 77
  0.96773, // age 78
  0.96420, // age 79
  0.96022, // age 80
  0.95571, // age 81
  0.95061, // age 82
  0.94485, // age 83
  0.93834, // age 84
  0.93100, // age 85
  0.92274, // age 86
  0.91348, // age 87
  0.90309, // age 88
  0.89147, // age 89
  0.87848, // age 90
  0.86447, // age 91
  0.84964, // age 92
  0.83413, // age 93
  0.81798, // age 94
  0.80120, // age 95
  0.78378, // age 96
  0.76569, // age 97
  0.74692, // age 98
  0.72751, // age 99
  0.70758, // age 100
  0.68730, // age 101
  0.66698, // age 102
  0.64679, // age 103
  0.62689, // age 104
  0.60745, // age 105
  0.58860, // age 106
  0.57046, // age 107
  0.55315, // age 108
  0.53673, // age 109
  0.52128, // age 110
  0.51070, // age 111
  0.50343, // age 112
  0.50000, // age 113
  0.50000, // age 114
  0.50000, // age 115
  0.50000, // age 116
  0.50000, // age 117
  0.50000, // age 118
  0.00000, // age 119
]);
